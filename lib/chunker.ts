// Text chunking: ~500 token chunks with ~50 token overlap.
// 1 token ≈ 4 chars for English. Defaults: 2000 chars / 200 chars overlap.

export interface ChunkOptions {
  chunkSize?: number; // chars per chunk
  overlap?: number;   // overlap between consecutive chunks
}

export function chunkText(
  text: string,
  options: ChunkOptions = {},
): string[] {
  const chunkSize = options.chunkSize ?? 2000;
  const overlap = options.overlap ?? 200;

  if (!text) return [];
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;
    if (end < cleaned.length) {
      // Snap to nearest word boundary
      const lastSpace = cleaned.lastIndexOf(" ", end);
      if (lastSpace > start + chunkSize * 0.6) {
        end = lastSpace;
      }
    }
    const slice = cleaned.slice(start, end).trim();
    if (slice) chunks.push(slice);

    if (end >= cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
