"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createBrowserSupabase } from "@/lib/supabaseBrowser";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/types";
import { extractTextFromFile } from "@/lib/clientOcr";

type Step = "idle" | "extracting" | "uploading" | "indexing" | "done";

const STEP_LABEL: Record<Step, string> = {
  idle: "",
  extracting: "Extracting text…",
  uploading: "Uploading file…",
  indexing: "Indexing with embeddings…",
  done: "Done",
};

export default function UploadModal() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>("Other");
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState<string>("");

  const close = () => {
    if (step !== "idle" && step !== "done") return;
    setOpen(false);
    setFile(null);
    setStep("idle");
    setProgress("");
  };

  const onPick = (f: File | null) => {
    if (!f) return;
    const ok =
      f.type.startsWith("image/") ||
      f.type === "application/pdf" ||
      f.name.toLowerCase().endsWith(".pdf");
    if (!ok) {
      toast.error("Please choose a PDF or an image file");
      return;
    }
    setFile(f);
  };

  const onSubmit = async () => {
    if (!file) return;
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in again");
        return;
      }

      // 1) Extract text
      setStep("extracting");
      setProgress("Running OCR / parsing PDF in your browser…");
      const rawText = await extractTextFromFile(file);
      if (!rawText || rawText.length < 10) {
        throw new Error(
          "Could not extract enough text from this file. Try a clearer scan or a different PDF.",
        );
      }

      // 2) Upload to storage
      setStep("uploading");
      setProgress(`Uploading ${file.name} to secure storage…`);
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("legal-docs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      // 3) Index (server-side chunk + embed + insert)
      setStep("indexing");
      setProgress("Generating embeddings and indexing chunks…");
      const res = await fetch("/api/index-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          type: docType,
          storagePath: path,
          rawText,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // Try to roll back the storage upload so we don't have orphan files
        await supabase.storage.from("legal-docs").remove([path]);
        throw new Error(j.error ?? `Indexing failed (${res.status})`);
      }
      const result = await res.json();
      setStep("done");
      setProgress(`Indexed ${result.chunkCount} chunks`);
      toast.success("Document uploaded");
      router.refresh();
      setTimeout(close, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setStep("idle");
      setProgress("");
    }
  };

  const busy = step === "extracting" || step === "uploading" || step === "indexing";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-brand-500 to-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        + Upload Document
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload document</h2>
              <button
                onClick={close}
                disabled={busy}
                className="text-zinc-500 hover:text-zinc-200 disabled:opacity-30"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-zinc-300">File</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onPick(e.dataTransfer.files?.[0] ?? null);
                  }}
                  className="mt-1 cursor-pointer rounded-lg border-2 border-dashed border-zinc-800 hover:border-brand-500/50 p-6 text-center text-sm text-zinc-400 transition"
                >
                  {file ? (
                    <div>
                      <div className="text-zinc-200 font-medium">{file.name}</div>
                      <div className="text-xs mt-1">
                        {(file.size / 1024).toFixed(1)} KB · {file.type || "file"}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div>Drop a PDF or image here</div>
                      <div className="text-xs mt-1">or click to choose</div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300" htmlFor="doctype">
                  Document type
                </label>
                <select
                  id="doctype"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  disabled={busy}
                  className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:border-brand-500 outline-none"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {step !== "idle" && (
                <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    {step !== "done" && (
                      <span className="h-3 w-3 rounded-full bg-brand-500 animate-pulse" />
                    )}
                    {step === "done" && (
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    )}
                    <span className="text-zinc-200">{STEP_LABEL[step]}</span>
                  </div>
                  {progress && (
                    <div className="text-xs text-zinc-500 mt-1">{progress}</div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={close}
                  disabled={busy}
                  className="px-3 py-2 text-sm rounded-md text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  disabled={!file || busy}
                  className="px-4 py-2 text-sm rounded-md bg-gradient-to-br from-brand-500 to-accent-500 text-white font-medium disabled:opacity-40"
                >
                  {busy ? "Working…" : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
