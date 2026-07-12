import { ArrowUp, Gauge } from "lucide-react";
import type { PyramidLevel } from "@/lib/course";

/** Level 4 is the narrow, dangerous cap. Level 1 is the wide, safe base. */
const TIER_STYLE: Record<number, string> = {
  1: "bg-card",
  2: "bg-muted",
  3: "bg-accent",
  4: "bg-primary text-black",
};

function Level({ level }: { level: PyramidLevel }) {
  return (
    <li
      // Each rung sits one tier in from the one below it, so the stack is
      // literally wider at the base — at 320px and at 1280px alike.
      style={{ "--tier": level.n - 1 } as React.CSSProperties}
      className="[margin-inline:calc(var(--tier)*10px)] sm:[margin-inline:calc(var(--tier)*32px)] md:[margin-inline:calc(var(--tier)*56px)]"
    >
      <div className={`retro-box rounded-none p-3 sm:p-4 ${TIER_STYLE[level.n]}`}>
        <div className="flex items-baseline gap-2">
          <span className="font-head text-[10px] uppercase tracking-widest opacity-70">
            Level {level.n}
          </span>
          <h3 className="min-w-0 font-head text-[15px] leading-snug sm:text-lg">{level.name}</h3>
        </div>

        <p className="mt-2 text-[15px] leading-relaxed">{level.plain}</p>

        <p className="mt-3 border-2 border-border bg-background p-2.5 text-[14px] leading-relaxed text-foreground">
          <span className="font-head text-[10px] uppercase tracking-widest text-muted-foreground">
            At a station:{" "}
          </span>
          {level.stationExample}
        </p>

        <p className="mt-2 flex gap-2 text-[14px] leading-relaxed">
          <Gauge className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-head text-[10px] uppercase tracking-widest">Trust: </span>
            {level.trustLevel}
          </span>
        </p>
      </div>
    </li>
  );
}

export function Pyramid({ levels, bigIdea }: { levels: PyramidLevel[]; bigIdea: string }) {
  const topDown = [...levels].sort((a, b) => b.n - a.n);

  return (
    <div>
      <p className="mb-3 flex items-center justify-center gap-2 text-center font-head text-[11px] uppercase tracking-widest text-muted-foreground">
        <ArrowUp className="size-4 shrink-0" aria-hidden />
        Autonomy, cost, unpredictability and risk all rise together
      </p>

      <ol className="mx-auto flex max-w-4xl flex-col gap-3">
        {topDown.map((l) => (
          <Level key={l.n} level={l} />
        ))}
      </ol>

      <p className="mt-3 text-center font-head text-[11px] uppercase tracking-widest text-muted-foreground">
        The wide, safe base is where most station work belongs
      </p>

      <blockquote className="retro-box-lg mt-8 rounded-none bg-primary p-4 text-black sm:p-6">
        <p className="font-head text-[10px] uppercase tracking-widest">The big idea</p>
        <p className="mt-2 text-[16px] font-medium leading-relaxed sm:text-lg">{bigIdea}</p>
      </blockquote>
    </div>
  );
}
