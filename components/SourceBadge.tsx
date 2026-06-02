import type { ChatSource } from "@/lib/types";

export default function SourceBadge({ source }: { source: ChatSource }) {
  const pct = Math.round(source.similarity * 100);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-1 text-xs text-brand-200"
      title={`Similarity: ${pct}%`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
        <circle cx="5" cy="5" r="3" />
      </svg>
      {source.document_name}
      <span className="text-brand-400/60 ml-1">{pct}%</span>
    </span>
  );
}
