import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/module-card";
import { RoleStrip } from "@/components/home/role-strip";
import { Limits } from "@/components/home/limits";
import { VideoProvider } from "@/components/video/video-player";
import { meta, modules } from "@/lib/course";

export const metadata: Metadata = {
  title: "Claude Code for Public Media",
  description:
    "A 6-hour Claude Code course for people who have never opened a terminal — rewritten for public radio and public television. 10 modules, 50 station use cases, every guardrail spelled out.",
};

const SOURCE_HOURS = Math.round(meta.durationSeconds / 3600);

const STATS = [
  { n: `${SOURCE_HOURS}h`, label: "of source video" },
  { n: meta.chapterCount, label: "chapters" },
  { n: meta.moduleCount, label: "modules" },
  { n: meta.useCaseCount, label: "station use cases" },
  { n: meta.glossaryCount, label: "glossary terms" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:pt-16">
        <p className="font-head text-xs uppercase tracking-widest text-muted-foreground">
          For public radio + public TV
        </p>

        <h1 className="mt-3 font-head text-[2rem] uppercase leading-[1.05] tracking-tight [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">
          Claude Code,
          <br />
          for people who have never opened a terminal
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          A {SOURCE_HOURS}-hour course, rebuilt for the people who actually run a station —
          reporters, membership directors, music directors, underwriting reps, GMs, traffic,
          grants. Plain English. Real station work. Every guardrail written down.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            className="min-h-11 border-2 border-border bg-primary px-5 font-head text-sm uppercase tracking-wide text-black shadow-[4px_4px_0_0_var(--border)]"
          >
            <Link href="/modules/module-1" className="no-underline">
              Start with Module 1
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="min-h-11 border-2 border-border bg-card px-5 font-head text-sm uppercase tracking-wide shadow-[4px_4px_0_0_var(--border)]"
          >
            <Link href="/use-cases" className="no-underline">
              <Compass className="size-4" aria-hidden />
              Find my role
            </Link>
          </Button>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STATS.map((stat) => (
            <div key={stat.label} className="retro-box bg-card p-3">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-head text-2xl leading-none">{stat.n}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* What is this, actually? */}
      <section aria-labelledby="what-heading" className="border-y-2 border-border bg-muted py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2
            id="what-heading"
            className="font-head text-xl uppercase tracking-tight sm:text-2xl"
          >
            What is this, actually?
          </h2>

          <div className="mt-4 max-w-2xl space-y-4 text-sm leading-relaxed sm:text-base">
            <p>
              Claude Code is a tool you talk to in plain English. It can read the files on your
              computer, work with the tools your station already runs on, and do the tedious parts
              of a job you already know how to do. It was built for programmers. It turns out most
              of what it is good at has nothing to do with code.
            </p>
            <p>
              This site is an unofficial translation of{" "}
              <a href={meta.videoUrl} target="_blank" rel="noopener noreferrer">
                {meta.sourceTitle}
              </a>{" "}
              — a free {SOURCE_HOURS}-hour course by {meta.sourceAuthor}. All credit for the
              original teaching is his. We watched all {meta.chapterCount} chapters, cut them into{" "}
              {meta.moduleCount} modules, and every concept here links straight back to the second
              of the video it came from, so you can check our work.
            </p>
            <p>
              What is ours: the station framing and the guardrails. Nate teaches the tool. We
              answer the question a public media newsroom actually asks — <em>where does this
              break, and what must never go into it?</em> If we could not name a real station job
              for a feature, we left it out.
            </p>
          </div>

          {/* The source, right here. Nothing loads from YouTube until you press play. */}
          <div className="mt-8 max-w-3xl">
            <VideoProvider startAt={0} label={`${meta.sourceTitle} — by ${meta.sourceAuthor}`}>
              <p className="mt-3 text-sm text-muted-foreground">
                The whole {SOURCE_HOURS}-hour original. Inside any module, the timestamps play the
                relevant minute right on the page.
              </p>
            </VideoProvider>
          </div>
        </div>
      </section>

      <RoleStrip />

      {/* The 10 modules */}
      <section aria-labelledby="modules-heading" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2
            id="modules-heading"
            className="font-head text-xl uppercase tracking-tight sm:text-2xl"
          >
            The {meta.moduleCount} modules
          </h2>
          <Link
            href="/modules"
            className="flex min-h-11 items-center font-head text-xs uppercase tracking-wide"
          >
            See all modules
            <ArrowRight className="ml-1 size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <ModuleCard key={m.slug} module={m} />
          ))}
        </div>
      </section>

      <Limits />

      {/* Bottom breathing room — the chat FAB lives bottom-right. */}
      <div className="h-20" aria-hidden />
    </>
  );
}
