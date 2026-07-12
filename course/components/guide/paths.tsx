import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { modules, formatRuntime } from "@/lib/course";

/** Day -> module numbers. Titles and runtimes are derived from the real data below. */
const WEEK: { day: string; note: string; moduleNumbers: number[] }[] = [
  { day: "Day 1", note: "Install it and point it at one real file", moduleNumbers: [1, 2] },
  { day: "Day 2", note: "Guardrails before anything else. Do the try-this.", moduleNumbers: [3] },
  { day: "Day 3", note: "Wire it to the tools the station already pays for", moduleNumbers: [4] },
  { day: "Day 4", note: "The long one. Split it if you have to.", moduleNumbers: [5, 6] },
  { day: "Day 5", note: "Ship something small and real", moduleNumbers: [7] },
  { day: "Day 6", note: "The station brain — the part that outlasts you", moduleNumbers: [8] },
  { day: "Day 7", note: "Automation, then the budget answer", moduleNumbers: [9, 10] },
];

const week = WEEK.map((d) => {
  const mods = d.moduleNumbers.map((n) => modules.find((m) => m.number === n)!);
  const minutes = mods.reduce((sum, m) => sum + m.runtimeMin, 0);
  return { ...d, mods, runtime: formatRuntime(minutes) };
});

const totalRuntime = formatRuntime(modules.reduce((s, m) => s + m.runtimeMin, 0));

export function Paths() {
  return (
    <section
      aria-labelledby="paths-heading"
      className="border-y-2 border-border bg-muted py-12"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="paths-heading" className="font-head text-xl uppercase tracking-tight sm:text-3xl">
          How to actually take this course
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
          Nobody is going to watch six hours of video. Pick one of these three instead. The
          middle one is the whole thing; the first one is a Tuesday afternoon.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Lane 1 */}
          <article className="retro-box flex flex-col gap-3 bg-card p-4">
            <p className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
              Lane 1 · 30 minutes
            </p>
            <h3 className="font-head text-lg leading-tight">The 30-minute taste</h3>
            <p className="text-sm text-muted-foreground">
              One real result today. That is the entire goal — not understanding, not a plan.
              A thing you did not have this morning.
            </p>
            <ol className="space-y-2 text-sm">
              <li className="border-l-4 border-border pl-3">
                <span className="font-head text-xs uppercase tracking-wide">10 min · </span>
                Read{" "}
                <Link href="/modules/module-1" className="font-medium">
                  Module 1
                </Link>{" "}
                — orientation. What this tool actually is, and the nine mindset shifts.
              </li>
              <li className="border-l-4 border-border pl-3">
                <span className="font-head text-xs uppercase tracking-wide">5 min · </span>
                Open{" "}
                <Link href="/use-cases" className="font-medium">
                  use cases
                </Link>
                , filter to your role, read one that describes a job you have this week.
              </li>
              <li className="border-l-4 border-border pl-3">
                <span className="font-head text-xs uppercase tracking-wide">15 min · </span>
                Run the{" "}
                <Link href="/modules/module-2" className="font-medium">
                  Module 2
                </Link>{" "}
                &ldquo;try this&rdquo; prompt against a file you already have. Anonymized. Numbers
                only.
              </li>
            </ol>
            <p className="mt-auto border-2 border-border bg-background p-3 text-sm">
              If it produces one thing you would have spent an hour on, you have your answer. If it
              does not, you have that answer too — and it cost you half an hour.
            </p>
          </article>

          {/* Lane 2 */}
          <article className="retro-box flex flex-col gap-3 bg-card p-4">
            <p className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
              Lane 2 · 7 sittings · {totalRuntime} total
            </p>
            <h3 className="font-head text-lg leading-tight">The one-week run</h3>
            <p className="text-sm text-muted-foreground">
              All {modules.length} modules, roughly 45 minutes a day. The days are uneven because
              the modules are — Day 4 and Day 7 run long. Split them rather than skip them.
            </p>

            <ol className="space-y-2">
              {week.map((d) => (
                <li key={d.day} className="border-2 border-border bg-background p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="font-head text-xs uppercase tracking-wide">{d.day}</span>
                    <span className="text-xs text-muted-foreground">{d.runtime}</span>
                  </div>
                  <ul className="mt-1">
                    {d.mods.map((m) => (
                      <li key={m.slug} className="min-w-0">
                        <Link
                          href={`/modules/${m.slug}`}
                          className="flex min-h-11 items-center font-medium text-sm leading-snug"
                        >
                          {m.number}. {m.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-muted-foreground">{d.note}</p>
                </li>
              ))}
            </ol>

            <p className="mt-auto text-sm">
              Do the <span className="font-head text-xs uppercase">try this</span> at the end of
              every module on the day you read it. A module you did not run is a module you did not
              learn.
            </p>
          </article>

          {/* Lane 3 */}
          <article className="retro-box flex flex-col gap-3 bg-card p-4">
            <p className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
              Lane 3 · One month · For managers
            </p>
            <h3 className="font-head text-lg leading-tight">The station rollout</h3>
            <p className="text-sm text-muted-foreground">
              You are not rolling out a tool. You are rolling out one workflow, with one owner, and
              a number at the end of it.
            </p>
            <ol className="space-y-2 text-sm">
              <li className="border-l-4 border-border pl-3">
                <span className="font-head text-xs uppercase tracking-wide">Week 0 · </span>
                Before anyone touches anything: you and whoever owns compliance read{" "}
                <Link href="/modules/module-3" className="font-medium">
                  Module 3
                </Link>{" "}
                (guardrails, keys, what never leaves the building) and the{" "}
                <Link href="/cost" className="font-medium">
                  cost page
                </Link>
                . Both. In that order. Nobody installs anything this week.
              </li>
              <li className="border-l-4 border-border pl-3">
                <span className="font-head text-xs uppercase tracking-wide">Week 1 · </span>
                Bring in three people, not thirty: one person who is already curious, one who is
                loudly skeptical, and the person who owns the data. The skeptic is the most
                valuable one in the room.
              </li>
              <li className="border-l-4 border-border pl-3">
                <span className="font-head text-xs uppercase tracking-wide">Week 2 · </span>
                Pick <em>one</em> workflow from the use cases — one that hurts every single week
                and touches no PII. Give it one owner. Not a committee.
              </li>
              <li className="border-l-4 border-border pl-3">
                <span className="font-head text-xs uppercase tracking-wide">Week 3 · </span>
                Run it for real. Write down the guardrail and who checks the output before it goes
                anywhere. Every automation ends at a human.
              </li>
              <li className="border-l-4 border-border pl-3">
                <span className="font-head text-xs uppercase tracking-wide">Week 4 · </span>
                Measure it: hours back, error rate, what it cost. Then write it up as a Skill (
                <Link href="/modules/module-4" className="font-medium">
                  Module 4
                </Link>
                ) so the station owns it, not the one person who figured it out.
              </li>
            </ol>
            <p className="mt-auto border-2 border-border bg-background p-3 text-sm">
              If you cannot name the workflow, the owner, and the number by the end of the month,
              stop. A pilot without a number is a hobby.
            </p>
          </article>
        </div>

        <Link
          href="/modules/module-1"
          className="retro-box retro-lift mt-8 inline-flex min-h-11 items-center gap-2 bg-primary px-4 font-head text-sm uppercase tracking-wide text-black no-underline"
        >
          Start the 30-minute taste
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
