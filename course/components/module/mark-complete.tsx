"use client";

import { Check, Circle } from "lucide-react";
import { useProgress } from "@/components/progress-tracker";
import { cn } from "@/lib/utils";

/**
 * The page's only client island. `useProgress` starts from an empty list and
 * hydrates from storage in an effect, so the server and first client render
 * agree — no mismatch, no `mounted` guard needed here.
 */
export function MarkComplete({ slug }: { slug: string }) {
  const { toggle, isComplete } = useProgress();
  const done = isComplete(slug);

  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={done}
      className={cn(
        "retro-box retro-lift flex min-h-11 w-full items-center justify-center gap-2 rounded-none px-4 py-2 font-head text-[13px] uppercase tracking-wide sm:w-auto",
        done ? "bg-primary text-black" : "bg-card text-foreground",
      )}
    >
      {done ? (
        <Check className="size-4 shrink-0" aria-hidden />
      ) : (
        <Circle className="size-4 shrink-0" aria-hidden />
      )}
      {done ? "Completed" : "Mark complete"}
    </button>
  );
}
