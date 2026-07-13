import { Eye } from "lucide-react";
import { MAC_STEPS, SOURCES, WINDOWS_STEPS } from "@/lib/install-facts.mjs";

function StepList({ steps }: { steps: typeof MAC_STEPS }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step) => (
        <li key={step.n} className="retro-box flex min-w-0 gap-3 bg-card p-3 sm:p-4">
          <span className="grid size-8 shrink-0 place-items-center border-2 border-border bg-primary font-head text-sm text-black">
            {step.n}
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-relaxed sm:text-base">{step.do}</p>
            <p className="mt-2 flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
              <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="font-head text-xs uppercase tracking-wide">You&apos;ll see: </span>
                {step.youWillSee}
              </span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PlatformSteps() {
  return (
    <section aria-labelledby="platform-steps-heading" className="mx-auto max-w-6xl px-4 py-12">
      <h2
        id="platform-steps-heading"
        className="font-head text-xl uppercase tracking-tight sm:text-3xl"
      >
        Installing it
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
        Find your machine below. Every step tells you what to click and what you will actually see
        happen — so you always know it&apos;s working.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="font-head text-lg uppercase tracking-tight">On a Mac</h3>
          <div className="mt-3">
            <StepList steps={MAC_STEPS} />
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="font-head text-lg uppercase tracking-tight">On Windows</h3>
          <div className="mt-3">
            <StepList steps={WINDOWS_STEPS} />
          </div>
        </div>
      </div>

      <div className="retro-box mt-8 max-w-2xl bg-muted p-4">
        <p className="text-sm leading-relaxed sm:text-base">
          <span className="font-head text-xs uppercase tracking-wide">
            If you read the word &ldquo;WSL&rdquo; somewhere and panicked:{" "}
          </span>
          ignore it. WSL is only for the command-line version of Claude Code, which you are not
          using. The desktop app does not need it.
        </p>
      </div>

      <a
        href={SOURCES.setup}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-2"
      >
        See Anthropic&apos;s setup documentation
      </a>
    </section>
  );
}
