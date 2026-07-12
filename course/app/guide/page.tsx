import type { Metadata } from "next";
import { Orientation } from "@/components/guide/orientation";
import { BeforeYouTouch } from "@/components/guide/before-you-touch";
import { Paths } from "@/components/guide/paths";
import { UseCasePattern } from "@/components/guide/use-case-pattern";
import { meta } from "@/lib/course";

export const metadata: Metadata = {
  title: "How to use this — Claude Code for Public Media",
  description:
    "Where to start, three realistic study paths (30 minutes, one week, or a station rollout), and how to run a use case end to end — plus the four rules that never move.",
};

const SOURCE_HOURS = Math.round(meta.durationSeconds / 3600);

export default function GuidePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
        <p className="font-head text-xs uppercase tracking-widest text-muted-foreground">
          How to use this
        </p>
        <h1 className="mt-3 font-head text-[2rem] uppercase leading-[1.05] tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
          You do not have {SOURCE_HOURS} hours. Read this instead.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          This page answers three questions, in the order people actually ask them: how do I use
          this site, how do I take this course without clearing my calendar, and how do I run one
          use case end to end and get a real result. Start with the four rules below — they are
          the only part of this that is not optional.
        </p>
      </section>

      <BeforeYouTouch />
      <Orientation />
      <Paths />
      <UseCasePattern />

      {/* Bottom breathing room — the chat FAB lives bottom-right. */}
      <div className="h-20" aria-hidden />
    </>
  );
}
