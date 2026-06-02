import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServer";
import { embedQuery } from "@/lib/embeddings";
import { streamChat } from "@/lib/llm";
import type { ChatSource } from "@/lib/types";

interface Body {
  question: string;
}

const SYSTEM_PROMPT = `You are a legal document assistant. Answer the user's question
using ONLY the provided document excerpts. If the answer is not in the documents,
say so clearly. Always cite which document the information came from using the
format [Source: filename] right after the relevant sentence. Keep answers concise
and factual.`;

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
  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "Empty question" }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // 1) Embed the question (using RETRIEVAL_QUERY task type for better match)
  let queryVector: number[];
  try {
    queryVector = await embedQuery(question);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embed failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 2) Vector similarity search (top 5, threshold 0.4 to be permissive)
  const { data: matches, error: matchErr } = await admin.rpc("match_chunks", {
    query_embedding: queryVector,
    p_user_id: user.id,
    match_threshold: 0.4,
    match_count: 5,
  });

  if (matchErr) {
    return NextResponse.json({ error: matchErr.message }, { status: 500 });
  }

  const sources: ChatSource[] = (matches ?? []).map((m: {
    chunk_text: string;
    document_name: string;
    document_id: string;
    similarity: number;
  }) => ({
    document_id: m.document_id,
    document_name: m.document_name,
    similarity: m.similarity,
  }));

  // 3) Build the context prompt
  let context = "";
  if (sources.length === 0) {
    context =
      "No relevant document excerpts were found. Tell the user you don't have any indexed documents that match their question and suggest they upload one.";
  } else {
    context = sources
      .map(
        (s) => `[doc: ${s.document_name}]\n${(matches as { chunk_text: string }[]).find((m) => m.chunk_text)?.chunk_text ?? ""}`,
      )
      .join("\n\n---\n\n");
    // Simpler / safer build:
    context = (matches as { chunk_text: string; document_name: string }[])
      .map((m) => `[doc: ${m.document_name}]\n${m.chunk_text}`)
      .join("\n\n---\n\n");
  }

  const userPrompt = `Document excerpts:\n${context}\n\nQuestion: ${question}`;

  // 4) Stream the LLM response
  const llmStream = streamChat({ system: SYSTEM_PROMPT, user: userPrompt });

  // 5) Prepend the sources event so the UI can render citations
  const encoder = new TextEncoder();
  const sourcesEvent = encoder.encode(
    `data: ${JSON.stringify({ sources })}\n\n`,
  );

  const combined = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sourcesEvent);
      const reader = llmStream.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(combined, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
