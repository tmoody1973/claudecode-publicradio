import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Quote } from "lucide-react";
import { CacheBreakerTable } from "@/components/cost/cache-breaker-table";
import { SessionSimulator } from "@/components/cost/session-simulator";
import { ThreeHabits } from "@/components/cost/three-habits";
import { getModule } from "@/lib/course";

export const metadata: Metadata = {
  title: "What this actually costs",
  description:
    "Tokens, caching and session limits — the answer when your GM asks the budget question. Includes an interactive session simulator built from the course's own numbers.",
};

export default function CostPage() {
  const m = getModule("module-10");
  if (!m?.cacheBreakers || !m.costModel) notFound();

  const quote = m.keyQuotes[1] ?? m.keyQuotes[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10">
      <header className="retro-box-lg bg-card p-5 sm:p-8">
        <p className="font-head text-xs uppercase tracking-wide text-muted-foreground">
          Module {m.number} · {m.kicker}
        </p>
        <h1 className="mt-2 font-head text-2xl leading-tight sm:text-4xl">
          What this actually costs
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {m.plainSummary}
        </p>
      </header>

      <figure className="retro-box m-0 flex gap-3 bg-primary p-5 text-black">
        <Quote className="size-6 shrink-0" aria-hidden />
        <div>
          <blockquote className="font-head text-lg leading-snug sm:text-xl">
            {quote.quote}
          </blockquote>
          <figcaption className="mt-3 text-sm">
            <a
              href={quote.youtube}
              target="_blank"
              rel="noreferrer"
              className="retro-box retro-lift inline-flex min-h-11 items-center bg-card px-3 font-mono text-[13px] no-underline"
            >
              Hear it at {quote.tLabel}
            </a>
          </figcaption>
        </div>
      </figure>

      <section aria-labelledby="breakers" className="flex flex-col gap-4">
        <h2 id="breakers" className="font-head text-xl sm:text-2xl">
          What breaks the cache — and what doesn&apos;t
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The cache re-reads your unchanged history at{" "}
          {Math.round(m.costModel.cachedReadMultiplier * 100)}% of normal input
          cost. These are the everyday moves that throw it away — and three that
          people assume are expensive but are perfectly safe. The contrast is the
          lesson.
        </p>
        <CacheBreakerTable breakers={m.cacheBreakers} />
      </section>

      <section aria-labelledby="simulator" className="flex flex-col gap-4">
        <h2 id="simulator" className="font-head text-xl sm:text-2xl">
          Try it: what a session actually processes
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Set this to look like a session you&apos;d really have. Every figure
          underneath comes from the course&apos;s own transcript — nothing is
          estimated here. Answers are in tokens, not dollars: prices move, and the
          course&apos;s dollar figures are a snapshot that will go stale. The ratio
          won&apos;t.
        </p>
        <SessionSimulator costModel={m.costModel} />
      </section>

      <section aria-labelledby="habits" className="flex flex-col gap-4">
        <h2 id="habits" className="font-head text-xl sm:text-2xl">
          The three habits that cover most people
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Most stations don&apos;t need a bigger plan. Do these three and you get
          several times the work out of the same subscription.
        </p>
        <ThreeHabits module={m} />
      </section>

      <section aria-labelledby="honesty" className="flex flex-col gap-4">
        <h2 id="honesty" className="font-head text-xl sm:text-2xl">
          Where the numbers stop
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
          <li>
            Cache lifetime is {m.costModel.subscriptionTtlMinutes} minutes on a
            Claude subscription inside Claude Code,{" "}
            {m.costModel.apiTtlMinutes} minutes by default on the API, and{" "}
            {m.costModel.subagentTtlMinutes} minutes for sub-agents on any plan.
          </li>
          <li>
            <strong>claude.ai on the web is not publicly documented.</strong> The
            course&apos;s presenter assumes it behaves like the subscription but
            says plainly he could not confirm it. We don&apos;t model it, and
            neither should your budget memo.
          </li>
          <li>
            None of this is a privacy control. Being cheap with donor data in a
            prompt is not the same as being allowed to put donor data in a prompt.
            Decide what may be uploaded first, then optimise cost.
          </li>
        </ul>
      </section>

      <Link
        href={`/modules/${m.slug}`}
        className="retro-box retro-lift inline-flex min-h-11 w-fit items-center gap-2 bg-primary px-4 font-head text-sm text-black no-underline"
      >
        Read module {m.number} in full
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}
