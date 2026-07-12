"use client";

import { Play } from "lucide-react";
import { useVideoSeek } from "@/components/video/video-player";

/**
 * A moment in the source video. If there's a player on this page it seeks it in
 * place; if there isn't, it falls back to opening YouTube at the same second.
 * Same component either way, so callers don't have to care.
 */
export function TimestampLink({
  href,
  label,
  context,
  seconds,
}: {
  href: string;
  label: string;
  context: string;
  seconds?: number;
}) {
  const seek = useVideoSeek();

  const className =
    "retro-box retro-lift inline-flex min-h-11 items-center gap-1.5 bg-card px-3 text-[13px] no-underline";

  if (seek && typeof seconds === "number") {
    return (
      <button type="button" onClick={() => seek(seconds)} className={className}>
        <Play className="size-3.5 shrink-0" aria-hidden />
        <span className="font-mono">{label}</span>
        <span className="sr-only">— play “{context}” in the player above</span>
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      <Play className="size-3.5 shrink-0" aria-hidden />
      <span className="font-mono">{label}</span>
      <span className="sr-only">— watch “{context}” on YouTube</span>
    </a>
  );
}
