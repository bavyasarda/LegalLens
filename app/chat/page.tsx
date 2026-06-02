"use client";

import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import ChatMessage from "@/components/ChatMessage";
import { createBrowserSupabase } from "@/lib/supabaseBrowser";
import type { ChatMessage as ChatMessageType, ChatSource } from "@/lib/types";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      role: "assistant",
      content:
        "Hi! Ask me anything about your uploaded documents. I'll answer with citations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;

    const userMsg: ChatMessageType = { role: "user", content: q };
    const placeholder: ChatMessageType = { role: "assistant", content: "" };
    setMessages((m) => [...m, userMsg, placeholder]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let sources: ChatSource[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!event.startsWith("data:")) continue;
          const payload = event.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if ("sources" in parsed) {
              sources = parsed.sources as ChatSource[];
            } else if ("delta" in parsed) {
              acc += parsed.delta as string;
            } else if ("error" in parsed) {
              acc += `\n\n[Error: ${parsed.error}]`;
            }
          } catch {
            // ignore parse errors
          }
        }
        // Update the last (assistant) message in place
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: acc,
            sources,
          };
          return next;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: `Sorry, something went wrong: ${message}`,
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <Navbar user={userEmail ? { email: userEmail } : null} />
      <main className="mx-auto max-w-3xl px-4 py-6 flex flex-col h-[calc(100vh-3.5rem)]">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1"
        >
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
          {busy && messages[messages.length - 1]?.content === "" && (
            <div className="text-xs text-zinc-500 ml-2 animate-pulse">
              Searching your documents…
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask a question about your documents…"
              className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm focus:border-brand-500 outline-none max-h-40"
            />
            <button
              onClick={send}
              disabled={!input.trim() || busy}
              className="rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 mt-2">
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </main>
    </>
  );
}
