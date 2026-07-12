import { Eye } from "lucide-react";
import { CopyPrompt } from "@/components/copy-prompt";
import type { Step } from "@/lib/walkthroughs";

export function WalkthroughSteps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-6">
      {steps.map((s) => (
        <li key={s.n} className="retro-box bg-card p-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center border-2 border-border bg-primary font-head text-base text-black"
              aria-hidden
            >
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-head text-base leading-snug">
                <span className="sr-only">Step {s.n}: </span>
                {s.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed">{s.do}</p>

              {s.prompt ? (
                <div className="mt-3">
                  <CopyPrompt label="Type this" prompt={s.prompt} />
                </div>
              ) : null}

              {/* The fear-remover. Every step tells her what's about to appear. */}
              <div className="mt-3 flex items-start gap-2 border-t-2 border-border pt-3">
                <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p className="text-[14px] leading-relaxed">
                  <span className="font-head text-[10px] uppercase tracking-wider">
                    What you&apos;ll see ·{" "}
                  </span>
                  {s.youWillSee}
                </p>
              </div>

              {s.note ? (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {s.note}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
