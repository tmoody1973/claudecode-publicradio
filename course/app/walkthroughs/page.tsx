import type { Metadata } from "next";
import { WalkthroughCard } from "@/components/walkthrough/walkthrough-card";
import { walkthroughs } from "@/lib/walkthroughs";

export const metadata: Metadata = {
  title: "Walkthroughs",
  description:
    "Do it with us. Step-by-step walkthroughs with real recorded sessions and practice data you can download.",
};

export default function WalkthroughsPage() {
  const onboarding = walkthroughs.filter((w) => w.tier === "onboarding");
  const flagships = walkthroughs.filter((w) => w.tier === "flagship");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10">
      <h1 className="text-2xl uppercase tracking-tight sm:text-4xl">Do it with us</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed sm:text-base">
        Every walkthrough shows you a <strong>real recorded session</strong> — every tool
        call, every result, exactly as it ran — before you try it yourself. The three
        job-specific ones come with fake station data you can practise on, so nothing real
        is ever at risk.
      </p>

      <section aria-labelledby="start" className="mt-10">
        <h2 id="start" className="font-head text-lg uppercase tracking-tight">
          Never opened a terminal? Start here.
        </h2>
        <div className="mt-4 grid gap-4 [&>*]:min-w-0 md:grid-cols-2">
          {onboarding.map((w) => (
            <WalkthroughCard key={w.id} w={w} />
          ))}
        </div>
      </section>

      <section aria-labelledby="jobs" className="mt-12">
        <h2 id="jobs" className="font-head text-lg uppercase tracking-tight">
          Then do a real job
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Three different muscles: working with files, researching and synthesising, and
          delegating a compliance check.
        </p>
        <div className="mt-4 grid gap-4 [&>*]:min-w-0 md:grid-cols-2 lg:grid-cols-3">
          {flagships.map((w) => (
            <WalkthroughCard key={w.id} w={w} />
          ))}
        </div>
      </section>
    </div>
  );
}
