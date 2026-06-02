import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServer";
import { chunkText } from "@/lib/chunker";
import { embedChunks } from "@/lib/embeddings";

interface Body {
  name: string;
  type: string;
  storagePath: string;
  rawText: string;
}

const MAX_TEXT_LEN = 1_500_000; // ~1.5MB of text safety cap

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, type, storagePath, rawText } = body;
  if (!name || !storagePath || !rawText) {
    return NextResponse.json(
      { error: "Missing name, storagePath, or rawText" },
      { status: 400 },
    );
  }
  if (rawText.length > MAX_TEXT_LEN) {
    return NextResponse.json(
      { error: "Document text is too large for the free tier" },
      { status: 413 },
    );
  }

  const admin = createAdminSupabase();

  // 1) Create the document row
  const { data: doc, error: docErr } = await admin
    .from("documents")
    .insert({
      user_id: user.id,
      name,
      type: type || "Other",
      storage_path: storagePath,
      raw_text: rawText,
    })
    .select("id")
    .single();

  if (docErr || !doc) {
    return NextResponse.json(
      { error: docErr?.message ?? "Failed to create document" },
      { status: 500 },
    );
  }

  // 2) Chunk the text
  const chunks = chunkText(rawText);
  if (chunks.length === 0) {
    // Roll back the empty doc
    await admin.from("documents").delete().eq("id", doc.id);
    return NextResponse.json(
      { error: "No extractable text" },
      { status: 400 },
    );
  }

  // 3) Embed the chunks
  let vectors: number[][];
  try {
    vectors = await embedChunks(chunks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embed failed";
    // Roll back
    await admin.from("documents").delete().eq("id", doc.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 4) Insert chunks in batches of 100
  const BATCH = 100;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const rows = chunks.slice(i, i + BATCH).map((text, j) => ({
      document_id: doc.id,
      user_id: user.id,
      chunk_text: text,
      embedding: vectors[i + j],
      chunk_index: i + j,
    }));
    const { error: insErr } = await admin.from("document_chunks").insert(rows);
    if (insErr) {
      // Best-effort rollback
      await admin.from("documents").delete().eq("id", doc.id);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ documentId: doc.id, chunkCount: chunks.length });
}
