// Client-side text extraction for images and PDFs.
// Images -> Tesseract.js
// PDFs   -> pdfjs-dist (text layer) per page

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type.startsWith("image/")) {
    return extractImage(file);
  }
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractPdf(file);
  }
  throw new Error(`Unsupported file type: ${file.type || file.name}`);
}

async function extractImage(file: File): Promise<string> {
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(file, "eng");
  return (data.text ?? "").trim();
}

async function extractPdf(file: File): Promise<string> {
  // Lazy-load pdfjs-dist on the client only
  const pdfjs: typeof import("pdfjs-dist") = await import("pdfjs-dist");

  // Tell pdfjs where to find its worker. We copy the worker file to /public
  // at build time so it's served as a static asset. See scripts/copy-pdf-worker.mjs
  // and next.config.mjs.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buf = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buf });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const strings = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .filter(Boolean);
    pageTexts.push(strings.join(" "));
  }

  return pageTexts.join("\n\n").trim();
}
