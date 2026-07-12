"use client";

import { useState } from "react";
import { ChevronRight, ShieldAlert, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecordedSession as Session, Turn } from "@/lib/walkthroughs";

/**
 * Replays a REAL recorded Claude Code session, one turn at a time.
 *
 * Why this exists: a non-technical person's core fear isn't "what do I type",
 * it's "what is going to HAPPEN when I press enter". Watching a real session
 * over someone's shoulder removes that fear in a way no prose can.
 *
 * The terminal uses dedicated `--terminal-*` tokens (globals.css) instead of
 * the normal light/dark theme tokens — a terminal stays dark in both themes,
 * so it's deliberately theme-invariant rather than hardcoded hex.
 *
 * ACCESSIBILITY, non-negotiable: every turn is in the DOM at all times. The
 * step-through is a VISUAL affordance only — future turns are dimmed and
 * inert, never removed. Screen-reader and keyboard users always get the whole
 * transcript, and `Show all` reveals it visually in one press.
 */
export function RecordedSession({ session }: { session: Session }) {
  const total = session.turns.length;
  const [shown, setShown] = useState(1);

  const atEnd = shown >= total;

  return (
    <figure className="retro-box-lg bg-terminal-bg">
      {/* title bar */}
      <div className="flex items-center gap-2 border-b-2 border-border bg-terminal-chrome px-3 py-2">
        <Terminal className="size-4 shrink-0 text-terminal-accent" aria-hidden />
        <span className="truncate font-mono text-[12px] text-terminal-fg">
          {session.cwd} — claude
        </span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-terminal-dim">
          {Math.min(shown, total)} / {total}
        </span>
      </div>

      {/* transcript — ALL turns rendered, always */}
      <ol className="scroll-x space-y-3 p-3 sm:p-4">
        {session.turns.map((t, i) => (
          <TurnRow key={t.n} turn={t} hidden={i + 1 > shown} />
        ))}
      </ol>

      {/* controls */}
      <div className="flex flex-wrap gap-2 border-t-2 border-border bg-terminal-controls p-2.5">
        <Button
          size="sm"
          className="min-h-11"
          onClick={() => setShown((s) => Math.min(s + 1, total))}
          disabled={atEnd}
        >
          <ChevronRight className="size-4" aria-hidden />
          {atEnd ? "End of session" : "Next turn"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 bg-background"
          onClick={() => setShown(atEnd ? 1 : total)}
        >
          {atEnd ? "Replay from the top" : "Show all turns"}
        </Button>
      </div>

      <figcaption className="border-t-2 border-border bg-card px-3 py-2">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-head text-[10px] uppercase tracking-wider text-foreground">
            Real recording ·{" "}
          </span>
          Captured {session.recordedOn}.{" "}
          {session.trimmed ? session.trimNote : "Shown in full."} Nothing was added.
        </p>
      </figcaption>
    </figure>
  );
}

function TurnRow({ turn, hidden }: { turn: Turn; hidden: boolean }) {
  // `hidden` dims and disables — it NEVER removes the turn from the DOM.
  const dim = hidden ? "opacity-25" : "opacity-100";

  if (turn.role === "user") {
    return (
      <li className={cn("transition-opacity", dim)}>
        <div className="flex gap-2">
          <span className="shrink-0 font-mono text-[13px] text-terminal-accent" aria-hidden>
            &gt;
          </span>
          <p className="min-w-0 [overflow-wrap:anywhere] font-mono text-[13px] leading-relaxed text-terminal-accent">
            <span className="sr-only">You typed: </span>
            {turn.text}
          </p>
        </div>
      </li>
    );
  }

  if (turn.role === "permission") {
    return (
      <li className={cn("transition-opacity", dim)}>
        <div className="retro-box border-destructive bg-destructive p-2.5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive-foreground" aria-hidden />
            <p className="min-w-0 [overflow-wrap:anywhere] text-[13px] leading-relaxed text-destructive-foreground">
              <span className="font-head text-[10px] uppercase tracking-wider">
                Claude is asking permission ·{" "}
              </span>
              {turn.text}
            </p>
          </div>
        </div>
      </li>
    );
  }

  if (turn.role === "tool") {
    return (
      <li className={cn("transition-opacity", dim)}>
        <div className="font-mono text-[12px] leading-relaxed text-terminal-dim">
          <div className="[overflow-wrap:anywhere]">
            <span aria-hidden>⏺ </span>
            <span className="sr-only">Claude used a tool: </span>
            {turn.tool ? `${turn.tool.name}(${turn.tool.arg})` : turn.text}
          </div>
          {turn.tool?.result ? (
            <div className="[overflow-wrap:anywhere] pl-4 text-terminal-dimmer">
              <span aria-hidden>└ </span>
              {turn.tool.result}
            </div>
          ) : null}
        </div>
      </li>
    );
  }

  // assistant
  return (
    <li className={cn("transition-opacity", dim)}>
      <p className="min-w-0 [overflow-wrap:anywhere] text-[13px] leading-relaxed text-terminal-fg">
        <span className="sr-only">Claude replied: </span>
        {turn.text}
      </p>
    </li>
  );
}
