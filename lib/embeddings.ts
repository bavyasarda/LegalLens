// Google Gemini embeddings helper.
// Model: gemini-embedding-001 (default 768-dim, free tier 1500 req/day).
// API: https://ai.google.dev/gemini-api/docs/embeddings

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents";
const TASK_TYPE = "RETRIEVAL_DOCUMENT"; // overridden to RETRIEVAL_QUERY for the question
const OUTPUT_DIM = 768;
const BATCH_SIZE = 100; // Gemini batchEmbedContents accepts up to 100 inputs per call
const MAX_ATTEMPTS = 3;

interface GeminiEmbedRequest {
  requests: {
    model: string;
    content: { parts: { text: string }[] };
    taskType?: string;
    outputDimensionality?: number;
  }[];
}

interface GeminiEmbedResponse {
  embeddings: { values: number[] }[];
}

async function embedBatch(inputs: string[], taskType = TASK_TYPE): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const body: GeminiEmbedRequest = {
    requests: inputs.map((text) => ({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: OUTPUT_DIM,
    })),
  };

  let res: Response;
  try {
    res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && "cause" in err ? (err as { cause?: unknown }).cause : null;
    throw new Error(
      `Gemini network error: ${message}` + (cause ? ` (cause: ${String(cause)})` : ""),
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini embed error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as GeminiEmbedResponse;
  if (!Array.isArray(data.embeddings) || !data.embeddings[0]?.values) {
    throw new Error("Unexpected Gemini response shape");
  }
  return data.embeddings.map((e) => e.values);
}

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];
  return embedWithRetry(chunks, TASK_TYPE);
}

export async function embedQuery(question: string): Promise<number[]> {
  const [vec] = await embedWithRetry([question], "RETRIEVAL_QUERY");
  return vec;
}

async function embedWithRetry(inputs: string[], taskType: string): Promise<number[][]> {
  const all: number[][] = [];
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);

    let attempt = 0;
    let lastErr: unknown;
    while (attempt < MAX_ATTEMPTS) {
      try {
        const vectors = await embedBatch(batch, taskType);
        all.push(...vectors);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        attempt++;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }
    if (lastErr) throw lastErr;
  }
  return all;
}
