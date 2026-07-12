import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyPrompt } from "@/components/copy-prompt";
import { BrainLevels } from "@/components/module/brain-levels";
import { ModuleHeader, ModuleNav } from "@/components/module/module-header";
import {
  AutomationBlueprint,
  CostTeaser,
  MindsetShifts,
  SkillAnatomy,
} from "@/components/module/module-extras";
import {
  Concepts,
  KeyQuotes,
  Pitfalls,
  Section,
  SourceChapters,
} from "@/components/module/module-sections";
import { Pyramid } from "@/components/module/pyramid";
import { UseCaseCards } from "@/components/module/use-case-cards";
import { getModule, modules } from "@/lib/course";
import type { CourseModule } from "@/lib/course";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return modules.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const mod = getModule(slug);
  if (!mod) return { title: "Module not found" };

  const title = `Module ${mod.number}: ${mod.title}`;
  return {
    title,
    description: mod.kicker,
    openGraph: { title, description: mod.kicker },
  };
}

/**
 * The module-specific deep dives. Each module gets at most one, and it sits
 * between the ideas and the use cases: framework first, then what you do with it.
 */
function Extras({ mod }: { mod: CourseModule }) {
  return (
    <>
      {mod.mindsetShifts && mod.mindsetShiftsNote && (
        <Section
          id="mindset-shifts"
          title="The 9 mindset shifts"
          subtitle="Nine — not twelve. Read the editor’s note below."
        >
          <MindsetShifts shifts={mod.mindsetShifts} note={mod.mindsetShiftsNote} />
        </Section>
      )}

      {mod.exampleClaudeMd && (
        <Section
          id="example-claude-md"
          title="A CLAUDE.md for your station"
          subtitle="A complete, working example. Copy it, then change the parts that aren’t you."
        >
          <CopyPrompt label="CLAUDE.md — example station file" prompt={mod.exampleClaudeMd} />
        </Section>
      )}

      {mod.skillAnatomy && (
        <Section
          id="skill-anatomy"
          title="Anatomy of a Skill"
          subtitle="A station SOP, saved as a text file the AI picks up on its own."
        >
          <SkillAnatomy anatomy={mod.skillAnatomy} />
        </Section>
      )}

      {mod.pyramid && (
        <Section
          id="pyramid"
          title="The AI systems pyramid"
          subtitle="How much freedom you are handing the machine — and where the brakes are."
        >
          <Pyramid levels={mod.pyramid.levels} bigIdea={mod.pyramid.bigIdea} />
        </Section>
      )}

      {mod.levels && (
        <Section
          id="brain-levels"
          title="The five levels of a second brain"
          subtitle="A ladder you can climb — but the top rung is not the goal."
        >
          <BrainLevels levels={mod.levels} />
        </Section>
      )}

      {mod.automationBlueprint && (
        <Section
          id="blueprint"
          title="The automation blueprint"
          subtitle="Trigger, steps, output — and the point where a human still has to look."
        >
          <AutomationBlueprint blueprint={mod.automationBlueprint} />
        </Section>
      )}

      {(mod.cacheBreakers || mod.costModel) && (
        <Section id="cost" title="What this costs">
          <CostTeaser />
        </Section>
      )}
    </>
  );
}

export default async function ModulePage({ params }: Props) {
  const { slug } = await params;
  const mod = getModule(slug);
  if (!mod) notFound();

  const i = modules.findIndex((m) => m.slug === mod.slug);
  const prev = modules[i - 1];
  const next = modules[i + 1];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <ModuleHeader mod={mod} />

      <div className="mt-6">
        <ModuleNav prev={prev} next={next} />
      </div>

      <Section id="plain-english" title="In plain English">
        <p className="text-[16px] leading-relaxed sm:text-lg">{mod.plainSummary}</p>

        <div className="retro-box-lg mt-5 rounded-none bg-primary p-4 text-black sm:p-6">
          <p className="font-head text-[11px] uppercase tracking-widest">
            Why it matters at your station
          </p>
          <p className="mt-2 text-[16px] font-medium leading-relaxed sm:text-lg">
            {mod.whyItMatters}
          </p>
        </div>
      </Section>

      <Section
        id="source"
        title="What’s in the source"
        subtitle="The chapters of the original video this module is built from. Every link opens at the exact second."
      >
        <SourceChapters chapters={mod.sourceChapters} />
      </Section>

      <Section
        id="ideas"
        title="The ideas"
        subtitle="What each one means — and what it means for a public media station."
      >
        <Concepts concepts={mod.concepts} />
      </Section>

      <Extras mod={mod} />

      <Section
        id="use-cases"
        title="Use it at your station"
        subtitle={`${mod.useCases.length} real jobs, by role. Every one comes with a guardrail.`}
      >
        <UseCaseCards useCases={mod.useCases} />
      </Section>

      <Section id="try-this" title="Try this today" subtitle={mod.tryThis.title}>
        <div className="retro-box rounded-none bg-card p-3 sm:p-4">
          <p className="font-head text-[10px] uppercase tracking-widest text-muted-foreground">
            Set it up
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed">{mod.tryThis.setup}</p>
        </div>
        <div className="mt-4">
          <CopyPrompt label={mod.tryThis.title} prompt={mod.tryThis.prompt} />
        </div>
      </Section>

      <Section
        id="pitfalls"
        title="Watch out for"
        subtitle="The ways this goes wrong in a station, specifically."
      >
        <Pitfalls pitfalls={mod.pitfalls} />
      </Section>

      <Section id="quotes" title="Worth quoting">
        <KeyQuotes quotes={mod.keyQuotes} />
      </Section>

      <div className="mt-12">
        <ModuleNav prev={prev} next={next} />
      </div>
    </div>
  );
}
