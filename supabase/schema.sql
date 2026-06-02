-- LegalLens Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL → New query)
-- Embedding dimension is 768 to match Google Gemini gemini-embedding-001
-- If you have an existing 384-dim schema, run supabase/reset.sql instead.

CREATE EXTENSION IF NOT EXISTS vector;

-- Documents: one row per uploaded file
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Other',
  storage_path text NOT NULL,
  raw_text text,
  created_at timestamptz DEFAULT now()
);

-- Chunks: vector-embedded text passages used for similarity search
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(768) NOT NULL,
  chunk_index int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own documents" ON documents;
CREATE POLICY "Users manage own documents" ON documents
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own chunks" ON document_chunks;
CREATE POLICY "Users manage own chunks" ON document_chunks
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS document_chunks_user_id_idx
  ON document_chunks (user_id);

CREATE INDEX IF NOT EXISTS documents_user_id_idx
  ON documents (user_id);

-- Similarity search function. Called from the chat API.
CREATE OR REPLACE FUNCTION match_chunks(
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
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.user_id = p_user_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-docs', 'legal-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: path convention is {user_id}/{filename}
DROP POLICY IF EXISTS "Users manage own files" ON storage.objects;
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
