"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChatProvider,
  useThread,
  fetchLLM,
  openAIAdapter,
  openAIMessageFormat,
  type Message,
} from "@openuidev/react-headless";
import { Renderer } from "@openuidev/react-lang";
import { Loader2, MessageCircle, Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { courseLibrary } from "@/lib/openui-library";
import { PRIMARY_MODEL } from "@/lib/models";

const STARTERS = [
  "What is Claude Code, in plain English?",
  "How could our membership team use this?",
  "What should we never put into it?",
  "What does this actually cost us?",
];

function textOf(message: Message): string {
  const c = (message as { content?: unknown }).content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof (part as { text?: unknown })?.text === "string"
            ? (part as { text: string }).text
            : "",
      )
      .join("");
  }
  return "";
}

/** A visible, honest wait. Free models are slow; silence reads as broken. */
function Pending() {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="retro-box bg-card p-3" role="status" aria-live="polite">
      <div className="flex items-center gap-2.5">
        <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
        <p className="font-head text-[13px] uppercase tracking-wide">
          Reading the course{secs > 0 ? ` · ${secs}s` : ""}
        </p>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
        {secs < 8
          ? "Looking through all ten modules for the parts that answer this."
          : secs < 25
            ? "Still going. The free model is thorough but slow — usually 20 to 30 seconds."
            : "Taking longer than usual. Free models get busy; if this stalls, ask again."}
      </p>
    </div>
  );
}

function Thread({ onClose }: { onClose: () => void }) {
  const { messages, isRunning, processMessage, cancelMessage } = useThread();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // True from the instant you hit send until the first token of the reply arrives.
  const last = messages[messages.length - 1];
  const awaitingReply =
    isRunning && (!last || last.role === "user" || textOf(last).length === 0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isRunning]);

  function send(text: string) {
    const t = text.trim();
    if (!t || isRunning) return;
    setDraft("");
    void processMessage({ role: "user", content: [{ type: "text", text: t }] });
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* header */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-border bg-primary px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="font-head text-sm uppercase tracking-wide text-black">Ask the course</h2>
          <p className="truncate text-[11px] text-black/70">
            Grounded in all 10 modules · free model
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          aria-label="Close the assistant"
          className="size-11 shrink-0 bg-background"
        >
          <X className="size-5" aria-hidden />
        </Button>
      </header>

      {/* transcript */}
      <div className="scroll-x flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {empty ? (
          <div className="space-y-3">
            <div className="retro-box bg-card p-3">
              <p className="text-[14px] leading-relaxed">
                Ask me anything about the course and I&apos;ll answer for{" "}
                <strong>your</strong> station — with the guardrails attached.
              </p>
            </div>
            <p className="font-head text-[11px] uppercase tracking-wider text-muted-foreground">
              Try one of these
            </p>
            <div className="grid gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="retro-box retro-lift min-h-11 bg-card px-3 py-2.5 text-left text-[13px] leading-snug"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === "user";
            const content = textOf(m);
            const streaming = isRunning && i === messages.length - 1 && !isUser;

            if (isUser) {
              return (
                <div key={m.id ?? i} className="flex justify-end">
                  <div className="retro-box max-w-[85%] bg-primary px-3 py-2">
                    <p className="text-[14px] leading-relaxed text-black">{content}</p>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.id ?? i}>
                <Renderer
                  library={courseLibrary}
                  response={content}
                  isStreaming={streaming}
                  onAction={(event) => {
                    if (event.type === "continue_conversation") {
                      send(event.humanFriendlyMessage);
                    }
                  }}
                />
              </div>
            );
          })
        )}

        {/* The free model takes 20-35s and the assistant message doesn't exist until the
            first token lands — so without this the panel sits blank and reads as broken.
            Show the wait, and say why. */}
        {awaitingReply ? <Pending /> : null}

        <div ref={endRef} />
      </div>

      {/* composer */}
      <form
        className="shrink-0 border-t-2 border-border bg-card p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Ask a question about the course
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Ask about your station…"
            className="retro-box max-h-32 min-h-11 flex-1 resize-none bg-input px-3 py-2.5 text-[16px] leading-snug outline-none"
            /* 16px is deliberate: anything smaller and iOS Safari zooms the page on focus */
          />
          {isRunning ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => cancelMessage()}
              aria-label="Stop generating"
              className="size-11 shrink-0"
            >
              <Square className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!draft.trim()}
              aria-label="Send question"
              className="size-11 shrink-0"
            >
              <Send className="size-4" aria-hidden />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
          Running on {PRIMARY_MODEL.id.split("/")[1]?.replace(":free", "")} — free, so it can be
          slow. Never paste donor or source data here.
        </p>
      </form>
    </div>
  );
}

export function ChatDock() {
  const [open, setOpen] = useState(false);

  // fetchLLM POSTs { threadId, runId, messages, ... } to the route; our handler
  // only reads `messages`. Memoised so the provider isn't handed a new llm each render.
  const llm = useMemo(
    () =>
      fetchLLM({
        url: "/api/chat",
        streamAdapter: openAIAdapter(),
        messageFormat: openAIMessageFormat,
      }),
    [],
  );

  // Escape closes; body scroll locks while the sheet owns the screen.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open the course assistant"
          className="retro-box-lg retro-lift fixed bottom-4 right-4 z-40 flex h-14 items-center gap-2 bg-primary px-4 text-black"
        >
          <MessageCircle className="size-5" aria-hidden />
          <span className="font-head text-[13px] uppercase tracking-wide">Ask</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex sm:items-end sm:justify-end sm:p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* full-bleed on a phone, docked panel on a desktop */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Course assistant"
            className="relative z-10 flex h-dvh w-full flex-col border-border bg-background sm:h-[min(44rem,85dvh)] sm:w-[26rem] sm:border-2 sm:shadow-[6px_6px_0_0_var(--border)]"
          >
            <ChatProvider llm={llm}>
              <Thread onClose={() => setOpen(false)} />
            </ChatProvider>
          </div>
        </div>
      )}
    </>
  );
}
