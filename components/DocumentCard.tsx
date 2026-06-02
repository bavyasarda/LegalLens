"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Document } from "@/lib/types";

interface Props {
  document: Document;
}

const TYPE_BADGE: Record<string, string> = {
  "Rent Agreement": "bg-amber-500/10 text-amber-300 border-amber-500/20",
  "Employment Contract": "bg-sky-500/10 text-sky-300 border-sky-500/20",
  NDA: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  "Loan Agreement": "bg-rose-500/10 text-rose-300 border-rose-500/20",
  Other: "bg-zinc-700/30 text-zinc-300 border-zinc-600/30",
};

export default function DocumentCard({ document: doc }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    if (!confirm(`Delete "${doc.name}"? This removes its chunks too.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast.success("Document deleted");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const created = new Date(doc.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const badge =
    TYPE_BADGE[doc.type] ?? TYPE_BADGE.Other;

  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate" title={doc.name}>
            {doc.name}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <span className={`inline-block border rounded-full px-2 py-0.5 ${badge}`}>
              {doc.type}
            </span>
            <span>·</span>
            <span>{created}</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="text-xs text-zinc-500 hover:text-rose-400 disabled:opacity-50 px-2 py-1 rounded-md hover:bg-rose-500/10"
          aria-label="Delete document"
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
