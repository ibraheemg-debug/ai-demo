"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, X, Send, Sparkles } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

// ── Typing indicator (three animated dots) ────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 ">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full"
          style={{
            background: "#6366F1",
            animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Individual chat bubble ─────────────────────────────────────
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div
          className="mr-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full self-end"
          style={{ background: "#EEF2FF", border: "1px solid rgb(111, 113, 245)" }}
        >
          <Bot className="h-3.5 w-3.5" style={{ color: "#6366F1" }} />
        </div>
      )}
      <div
        className="max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
        style={
          isUser
            ? {
                background:   "linear-gradient(135deg, #6366F1, #8B5CF6)",
                color:        "#fff",
                borderBottomRightRadius: 4,
              }
            : {
                background:   "#F3F4F8",
                color:        "#111827",
                borderBottomLeftRadius: 4,
              }
        }
      >
        {msg.content}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────
export function ChatWidget() {
  const tErr = useTranslations("errors");

  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [typing,  setTyping]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<ChatMessage[]>(history);
  historyRef.current = history;

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, typing]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || typing) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setTyping(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyRef.current.slice(-18),
        }),
      });

      const data = await res.json() as { reply?: string; error?: string };

      if (data.error || !data.reply) {
        const aiMsg: ChatMessage = {
          role:    "assistant",
          content: "Assistant unavailable right now.",
        };
        setHistory((h) => [...h, aiMsg]);
      } else {
        setHistory((h) => [...h, { role: "assistant", content: data.reply! }]);
      }
    } catch {
      setHistory((h) => [
        ...h,
        { role: "assistant", content: "Assistant unavailable right now." },
      ]);
      setError(tErr("apiFailure"));
    } finally {
      setTyping(false);
    }
  }, [input, typing, tErr]);
  // #hello world 

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* ── Typing-dot keyframe (injected once) ─────────── */}
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: .5; }
          30%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>

      {/* ── Floating trigger button ──────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI chat"
        className="fixed bottom-20 right-4 z-[100] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 md:bottom-6 md:right-6"
        style={{
          background:  open ? "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)" : "#FFFFFF",
          border:      open ? "none" : "1px solid #E5E7EB",
          boxShadow:   open ? "0 4px 12px rgba(99,102,241,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {open
          ? <X       className="h-5 w-5 text-white" />
          : <Sparkles className="h-5 w-5" style={{ color: "#6366F1" }} />
        }
      </button>

      {/* ── Chat panel ──────────────────────────────────── */}
      {/*
        Mobile  (<md): full-screen slide-up from bottom
        Desktop (≥md): 380×500px panel anchored to bottom-right
      */}
      <div
        className={`fixed z-[99] transition-all duration-300 ease-out
          ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 translate-y-6"}
          inset-x-0 bottom-0 md:bottom-24 md:right-6 md:left-auto md:w-[380px] md:rounded-2xl md:translate-y-0
        `}
        style={{
          background:  "#FFFFFF",
          border:      "1px solid #E5E7EB",
          boxShadow:   "0 -4px 40px rgba(0,0,0,0.1)",
        }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3.5"
          style={{
            borderBottom: "1px solid #E5E7EB",
            borderRadius: "16px 16px 0 0",
            background:   "#FFFFFF",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg,#6366F1,#8B5CF6)" }}
            >
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "#111827" }}>NovaMind Assistant</p>
              <p className="text-[10px]" style={{ color: "#6B7280" }}>Powered by Grok</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-[#F3F4F8]"
          >
            <X className="h-4 w-4" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* ── Message list ────────────────────────────────── */}
        <div
          className="flex flex-col gap-3 overflow-y-auto px-4 py-4"
          style={{ height: "clamp(300px, 40vh, 380px)" }}
        >
          {/* Welcome message */}
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "#EEF2FF", border: "1px solid #6366F1" }}
              >
                <Sparkles className="h-6 w-6" style={{ color: "#6366F1" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "#111827" }}>NovaMind Assistant</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                Ask me about your platform usage, billing, or analytics.
              </p>
            </div>
          )}

          {history.map((msg, i) => (
            <Bubble key={i} msg={msg} />
          ))}

          {typing && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl"
                style={{
                  background:           "#F3F4F8",
                  borderBottomLeftRadius: 4,
                }}
              >
                <TypingDots />
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <p className="text-center text-xs" style={{ color: "#EF4444" }}>{error}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input row ───────────────────────────────────── */}
        <div
          className="flex items-end gap-2 px-3 pb-3 pt-2"
          style={{ borderTop: "1px solid #E5E7EB" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask NovaMind…"
            rows={1}
            disabled={typing}
            className="flex-1 resize-none rounded-3xl px-4 py-2.5 text-sm outline-none transition-colors"
            style={{
              background:  "#FFFFFF",
              border:      "1px solid #E5E7EB",
              color:       "#111827",
              maxHeight:   "100px",
              lineHeight:  "1.5",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#6366F1";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#E5E7EB";
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || typing}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200 disabled:opacity-30 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
            }}
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}
