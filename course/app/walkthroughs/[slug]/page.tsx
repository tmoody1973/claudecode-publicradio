import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BeforeYouStart } from "@/components/walkthrough/before-you-start";
import { RecordedSession } from "@/components/walkthrough/recorded-session";
import { SampleDataCard } from "@/components/walkthrough/sample-data-card";
import { Troubleshooting } from "@/components/walkthrough/troubleshooting";
import { VerifyChecks } from "@/components/walkthrough/verify-checks";
import { WalkthroughSteps } from "@/components/walkthrough/walkthrough-steps";
import { getWalkthrough, walkthroughs } from "@/lib/walkthroughs";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return walkthroughs.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const w = getWalkthrough(slug);
  if (!w) return { title: "Not found" };
  return { title: w.title, description: w.kicker };
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12">
      <h2 id={`${id}-h`} className="text-xl uppercase tracking-tight sm:text-2xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function WalkthroughPage({ params }: Props) {
  const { slug } = await params;
  const w = getWalkthrough(slug);
  if (!w) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <p className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
        Walkthrough · {w.estMinutes} minutes · {w.steps.length} steps
      </p>
      <h1 className="mt-2 text-2xl uppercase tracking-tight sm:text-4xl">{w.title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground sm:text-lg">
        {w.kicker}
      </p>

      <Section id="before" title="Before you start">
        <BeforeYouStart w={w} />
        {w.sampleData ? (
          <div className="mt-4">
            <SampleDataCard data={w.sampleData} />
          </div>
        ) : null}
      </Section>

      <Section
        id="watch"
        title="Watch it happen first"
        subtitle="A real session, recorded. Press Next to step through it — including the bits where it asks permission, and the bit where it gets something wrong."
      >
        <RecordedSession session={w.session} />
      </Section>

      <Section id="steps" title="Now do it" subtitle="Each step tells you what you'll see.">
        <WalkthroughSteps steps={w.steps} />
      </Section>

      <Section
        id="verify"
        title="Check it before you trust it"
        subtitle="It will sound confident either way. That's why you check."
      >
        <VerifyChecks checks={w.verify} />
      </Section>

      <Section id="trouble" title="When it goes wrong">
        <Troubleshooting items={w.troubleshooting} />
      </Section>

      <Link
        href={`/modules/module-${w.moduleNumber}`}
        className="retro-box retro-lift mt-12 flex min-h-11 items-center gap-2 bg-primary p-4 no-underline"
      >
        <span className="font-head text-[13px] uppercase tracking-wide text-black">
          Understand why this works — Module {w.moduleNumber}
        </span>
        <ArrowRight className="ml-auto size-5 shrink-0 text-black" aria-hidden />
      </Link>
    </div>
  );
}
