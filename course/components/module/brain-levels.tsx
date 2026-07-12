import { Info, TrendingUp } from "lucide-react";
import type { BrainLevel } from "@/lib/course";

const EFFORT_STYLE: Record<string, string> = {
  Low: "bg-muted",
  Medium: "bg-accent",
  High: "bg-secondary text-secondary-foreground",
};

function Rung({ level }: { level: BrainLevel }) {
  return (
    <li
      // Each rung steps further out — a staircase you can see at 320px.
      style={{ "--rung": level.n - 1 } as React.CSSProperties}
      className="[margin-inline-start:calc(var(--rung)*6px)] sm:[margin-inline-start:calc(var(--rung)*28px)]"
    >
      <div className="retro-box rounded-none bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-border p-3">
          <span className="retro-box grid size-11 shrink-0 place-items-center rounded-none bg-primary font-head text-lg text-black">
            {level.n}
          </span>
          <h3 className="min-w-0 flex-1 font-head text-[15px] leading-snug sm:text-lg">
            {level.name}
          </h3>
          {level.n === 1 && (
            <span className="border-2 border-border bg-primary px-2 py-1 font-head text-[10px] uppercase tracking-widest text-black">
              Start here
            </span>
          )}
        </div>

        <div className="p-3">
          <p className="text-[15px] leading-relaxed">{level.plain}</p>

          <p className="mt-3 border-2 border-border bg-muted p-2.5 text-[14px] leading-relaxed">
            <span className="font-head text-[10px] uppercase tracking-widest text-muted-foreground">
              At a station:{" "}
            </span>
            {level.stationExample}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center border-2 border-border px-2.5 py-1 font-head text-[11px] uppercase tracking-wide ${
                EFFORT_STYLE[level.effort] ?? "bg-muted"
              }`}
            >
              Effort: {level.effort}
            </span>
          </div>

          <p className="mt-2 flex gap-2 text-[14px] leading-relaxed">
            <TrendingUp className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-head text-[10px] uppercase tracking-widest">Payoff: </span>
              {level.payoff}
            </span>
          </p>
        </div>
      </div>
    </li>
  );
}

export function BrainLevels({ levels }: { levels: BrainLevel[] }) {
  return (
    <div>
      {/* The source's own position — surfacing it is the point of the section. */}
      <p className="retro-box mb-6 flex gap-3 rounded-none bg-primary p-3 text-black sm:p-4">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span className="text-[15px] font-medium leading-relaxed">
          <span className="font-head text-[10px] uppercase tracking-widest">
            Higher is not better.{" "}
          </span>
          These are five options, not five grades. The source is blunt about it: he runs his
          own operation at level 2, says he does not use a knowledge graph day to day, and
          deliberately refuses level 5 — because too much context does more damage than good.
          Pick the lowest level that solves a pain you actually have, and stop there.
        </span>
      </p>

      <ol className="flex flex-col gap-3">
        {levels.map((l) => (
          <Rung key={l.n} level={l} />
        ))}
      </ol>
    </div>
  );
}
