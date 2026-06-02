// Copies the pdfjs-dist worker file into /public so it can be served as a
// static asset at /pdf.worker.min.mjs. The browser fetches this URL when
// parsing PDFs on the client.

import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = join(root, "public", "pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.warn(`[copy-pdf-worker] Source not found, skipping: ${src}`);
  process.exit(0);
}

await mkdir(dirname(dest), { recursive: true });
await copyFile(src, dest);
console.log(`[copy-pdf-worker] Copied ${src} -> ${dest}`);
