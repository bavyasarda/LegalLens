-- LegalLens schema reset - SAFE VERSION
-- Run each section as a SEPARATE query in the Supabase SQL editor.
-- This handles cases where the database is in a partial state.

-- ============================================================
-- QUERY 1: Drop everything (safe to run, ignores missing objects)
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  -- Drop all storage policies (table is fully qualified, no schema prefix on policy name)
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects CASCADE', r.policyname);
  END LOOP;

  -- Drop all function signatures for match_chunks
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'match_chunks'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
  END LOOP;

  -- Drop tables (CASCADE handles policies and FK constraints)
  EXECUTE 'DROP TABLE IF EXISTS public.document_chunks CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS public.documents CASCADE';
END $$;

-- This query will return successfully even if nothing existed to drop.

-- ============================================================
-- QUERY 2: Create the extension and tables
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Other',
  storage_path text NOT NULL,
  raw_text text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(768) NOT NULL,
  chunk_index int NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents" ON public.documents
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own chunks" ON public.document_chunks
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX document_chunks_embedding_idx
  ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX document_chunks_user_id_idx
  ON public.document_chunks (user_id);

CREATE INDEX documents_user_id_idx
  ON public.documents (user_id);

-- ============================================================
-- QUERY 3: Create the match_chunks function
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector(768),
  p_user_id uuid,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  chunk_text    text,
  document_name text,
  document_id   uuid,
  similarity    float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.chunk_text,
    d.name        AS document_name,
    d.id          AS document_id,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  JOIN public.documents d ON d.id = dc.document_id
  WHERE dc.user_id = p_user_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- QUERY 4: Storage bucket and RLS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-docs', 'legal-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users manage own files" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'legal-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'legal-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- QUERY 5: Verify (should return 768)
-- ============================================================
SELECT atttypmod AS embedding_dim
FROM pg_attribute
WHERE attrelid = 'public.document_chunks'::regclass
  AND attname = 'embedding';
