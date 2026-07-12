import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { CopyPrompt } from "@/components/copy-prompt";
import { UseCaseCard } from "@/components/use-cases/use-case-card";
import { getModule, useCases } from "@/lib/course";

/** The worked example: a Membership use case, run end to end, with its real module prompt. */
const example = useCases.find((u) => u.id === "m2-uc1")!;
const exampleModule = getModule("module-2")!;

const STEPS = [
  {
    title: "Find one that matches a job you actually do this week",
    body: "Not a job you might do someday. Filter the use cases to your role and look for the thing already on your calendar — the drive readout, the board packet, the spot copy, the grant report. A hypothetical will never teach you anything, because you will never finish it.",
  },
  {
    title: "Read the guardrail first — before the scenario",
    body: "Every card has one, and it is the loudest block on the card for a reason. If you cannot honour it — if the only version of this task you can imagine involves donor names, or an unpublished draft — stop and pick a different use case. There are 49 others.",
  },
  {
    title: "Strip the data",
    body: "Aggregate columns are fine: gift amount, date, hour, premium, channel, new-vs-renewing. Names, emails, addresses, phone numbers and giving history are not — delete those columns in the CRM export before the file ever lands on your desktop. Make a fresh folder with the stripped file in it and nothing else.",
  },
  {
    title: "Run the module's “try this” prompt against the real file",
    body: "Every use case names the module it came from, and every module ends with a “try this” — the setup, and a prompt you can copy. Use the real prompt on the real file. Paraphrasing it is how people end up disappointed; the specific instructions in it are doing real work.",
  },
  {
    title: "Verify before it goes anywhere near air, a donor, or a funder",
    body: "Open the source file and re-check the numbers the output is proud of. Claude is very good at being confidently wrong in a format that looks right. AI finds it; a human confirms it. That never changes, and it is not a phase you graduate out of.",
  },
  {
    title: "If it worked, write it down as a Skill",
    body: "A one-off that lives in your head is not a station capability — it is a single point of failure wearing a tie. Module 4 shows you how to turn the thing you just did into a Skill the station owns, so the next person can run it without you in the room.",
  },
];

export function UseCasePattern() {
  return (
    <section aria-labelledby="pattern-heading" className="mx-auto max-w-6xl px-4 py-12">
      <h2 id="pattern-heading" className="font-head text-xl uppercase tracking-tight sm:text-3xl">
        How to run a use case
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
        Every card carries the same five things: the <strong>role</strong> it belongs to, the{" "}
        <strong>scenario</strong> (the Tuesday it fixes), <strong>how Claude helps</strong>, the{" "}
        <strong>time saved</strong>, and the <strong>guardrail</strong>. Learn the pattern once and
        all {useCases.length} of them work the same way.
      </p>

      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="retro-box flex gap-3 bg-card p-4">
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center border-2 border-border bg-primary font-head text-sm text-black"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <h3 className="font-head text-sm uppercase leading-tight tracking-wide">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Worked example — the same six steps, on a real card, with the real prompt. */}
      <div className="mt-12">
        <h3 className="font-head text-lg uppercase tracking-tight sm:text-2xl">
          Worked example: the pledge-drive readout
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
          One membership use case, run end to end. This is the whole loop — card, guardrail,
          stripped file, real prompt, verification.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
              The card, as it appears on the use-cases page
            </p>
            <div className="mt-2">
              <UseCaseCard useCase={example} />
            </div>
          </div>

          <ol className="min-w-0 space-y-3">
            <li className="retro-box bg-card p-4">
              <h4 className="font-head text-sm uppercase tracking-wide">
                1 &amp; 2 — Real job, guardrail first
              </h4>
              <p className="mt-2 text-sm text-muted-foreground">
                The drive ended Sunday, the board meets Thursday. Real. Now read the guardrail
                before anything else:
              </p>
              <div className="mt-3 flex gap-2 border-2 border-border bg-destructive p-3 text-destructive-foreground">
                <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p className="min-w-0 text-sm">
                  <span className="font-head text-xs uppercase tracking-wide">Guardrail: </span>
                  {example.guardrail}
                </p>
              </div>
              <p className="mt-3 text-sm">
                Can you honour that? Yes — a CRM export can be trimmed. So you continue. If your
                only export came with names welded into it and you could not remove them, you would
                stop here.
              </p>
            </li>

            <li className="retro-box bg-card p-4">
              <h4 className="font-head text-sm uppercase tracking-wide">3 — Strip the data</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                In the CRM, delete these columns before you export:
              </p>
              <div className="scroll-x mt-3 border-2 border-border bg-muted p-3">
                <p className="font-mono text-[13px] leading-relaxed whitespace-nowrap">
                  <span className="line-through">name</span>{" "}
                  <span className="line-through">email</span>{" "}
                  <span className="line-through">address</span>{" "}
                  <span className="line-through">phone</span>{" "}
                  <span className="line-through">lifetime_giving</span> → keep: amount · date ·
                  hour · premium · new_or_renewing · channel
                </p>
              </div>
              <p className="mt-3 text-sm">
                Strikethrough columns are deleted, not hidden — a hidden column still travels with
                the file. Save the stripped file into an empty folder called{" "}
                <code className="font-mono text-[13px]">station-work</code>, on your machine.
              </p>
            </li>

            <li className="retro-box bg-card p-4">
              <h4 className="font-head text-sm uppercase tracking-wide">
                4 — Run the module&apos;s prompt
              </h4>
              <p className="mt-2 text-sm text-muted-foreground">
                This card came from{" "}
                <Link href={`/modules/${exampleModule.slug}`} className="font-medium">
                  Module {exampleModule.number}
                </Link>
                . {exampleModule.tryThis.setup}
              </p>
              <div className="mt-3">
                <CopyPrompt
                  label={`Module ${exampleModule.number} — ${exampleModule.tryThis.title}`}
                  prompt={exampleModule.tryThis.prompt}
                />
              </div>
            </li>

            <li className="retro-box bg-card p-4">
              <h4 className="font-head text-sm uppercase tracking-wide">
                5 &amp; 6 — Verify, then make it the station&apos;s
              </h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Notice the last paragraph of that prompt: it makes Claude recompute every total
                from the source rows and show you the comparison. That is the machine checking
                itself — it is not a substitute for you. Open the export, spot-check the total
                raised and the biggest hour against the workbook. Then, and only then, does it go
                in the board packet.
              </p>
              <p className="mt-3 text-sm">
                It worked? Do not let it live in your head.{" "}
                <Link href="/modules/module-4" className="font-medium">
                  Module 4
                </Link>{" "}
                turns this into a Skill, so next quarter the readout takes ten minutes and does not
                require you to be in the building.
              </p>
            </li>
          </ol>
        </div>

        <Link
          href="/use-cases"
          className="retro-box retro-lift mt-8 inline-flex min-h-11 items-center gap-2 bg-primary px-4 font-head text-sm uppercase tracking-wide text-black no-underline"
        >
          Find your use case
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
