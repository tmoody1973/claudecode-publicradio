"use client";

/**
 * The launcher, and ONLY the launcher.
 *
 * app/layout.tsx is the ROOT layout, so whatever this file imports ships to every visitor
 * of every page — the homepage, every module, the glossary. It used to import the whole
 * chat: @openuidev/react-lang, @openuidev/react-headless, and content/library-index.ts,
 * the ~74KB lookup table of all 292 research sources. All of it downloaded before anyone
 * had clicked "Ask".
 *
 * So the chat itself now lives in ./chat-panel, and is fetched only when the panel opens.
 * This file must stay light: a button, a sheet, an Escape key. If you find yourself
 * importing the library, the renderer, or the index here, put it in chat-panel instead.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MessageCircle } from "lucide-react";

// ssr: false — the panel is client-only anyway (it holds a live stream and browser state),
// and there is nothing to prerender behind a closed sheet.
const ChatPanel = dynamic(() => import("./chat-panel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-background" role="status">
      <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
      <span className="sr-only">Loading the assistant</span>
    </div>
  ),
});

export function ChatDock() {
  const [open, setOpen] = useState(false);

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
            <ChatPanel onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
