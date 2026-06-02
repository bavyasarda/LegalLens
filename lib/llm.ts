// Groq streaming chat wrapper.
// Uses groq-sdk (OpenAI-compatible). Model: llama-3.1-8b-instant (free dev tier).
// Returns a Web ReadableStream of SSE-formatted chunks.

import Groq from "groq-sdk";

const MODEL = "llama-3.1-8b-instant";

// Lazy-instantiate so missing env vars don't crash the build.
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

export interface StreamChatOptions {
  system: string;
  user: string;
}

export function streamChat({ system, user }: StreamChatOptions): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await getGroq().chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          stream: true,
          temperature: 0.2,
          max_tokens: 1024,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}
