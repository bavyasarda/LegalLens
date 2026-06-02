import type { ChatMessage as ChatMessageType } from "@/lib/types";
import SourceBadge from "./SourceBadge";

export default function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-brand-500 to-accent-500 text-white"
            : "bg-zinc-900/70 border border-zinc-800 text-zinc-100"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.sources.map((s) => (
              <SourceBadge key={s.document_id} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
