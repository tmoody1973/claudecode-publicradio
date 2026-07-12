"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { modules } from "@/lib/course";

const KEY = "ccpm:progress";
const TOTAL = modules.length;
/** Fired on every write so a card and the tracker on the same page stay in sync. */
const SYNC_EVENT = "ccpm:progress-changed";

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    // Private mode, quota, or hand-edited garbage. Progress is not worth an error boundary.
    return [];
  }
}

function write(next: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore — see read() */
  }
  window.dispatchEvent(new Event(SYNC_EVENT));
}

/**
 * Completed-module state, backed by localStorage.
 * `mounted` is false during SSR and the first client render, so callers can
 * render a stable placeholder instead of a hydration mismatch.
 */
export function useProgress() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompleted(read());
    setMounted(true);

    const sync = () => setCompleted(read());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((slug: string) => {
    const current = read();
    write(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
  }, []);

  const reset = useCallback(() => write([]), []);

  const isComplete = useCallback((slug: string) => completed.includes(slug), [completed]);

  return { completed, mounted, toggle, isComplete, reset };
}

export function ProgressTracker({ className }: { className?: string }) {
  const { completed, mounted, reset } = useProgress();
  const done = mounted ? completed.length : 0;
  const pct = Math.round((done / TOTAL) * 100);

  return (
    <div className={className}>
      <div className="retro-box bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-head text-sm uppercase tracking-wide" aria-live="polite">
            {mounted ? `${done} of ${TOTAL} modules complete` : `— of ${TOTAL} modules complete`}
          </p>
          <Button
            variant="outline"
            className="min-h-11 border-2 border-border font-head text-xs uppercase tracking-wide"
            onClick={reset}
            disabled={!mounted || done === 0}
          >
            <RotateCcw className="size-4" aria-hidden />
            Reset
          </Button>
        </div>
        <Progress
          value={mounted ? pct : 0}
          className="mt-3 border-border"
          aria-label={`Course progress: ${done} of ${TOTAL} modules complete`}
        />
      </div>
    </div>
  );
}
