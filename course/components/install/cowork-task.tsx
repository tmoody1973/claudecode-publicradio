import { ShieldAlert } from "lucide-react";
import { CopyPrompt } from "@/components/copy-prompt";
import { SOURCES } from "@/lib/install-facts.mjs";

const EXAMPLE_TASK =
  "Take the four underwriting scripts in this folder and turn them into a one-page style sheet a new hire could follow — tone, sentence length, what we always say, what we never say.";

export function CoworkTask() {
  return (
    <section
      aria-labelledby="cowork-heading"
      className="border-y-2 border-border bg-muted py-12"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2
          id="cowork-heading"
          className="font-head text-xl uppercase tracking-tight sm:text-3xl"
        >
          If you&apos;d rather not watch it work: Cowork
        </h2>

        {/* Guardrail first — site convention, non-negotiable. */}
        <div className="retro-box mt-6 flex max-w-3xl gap-3 border-2 border-border bg-destructive p-4 text-destructive-foreground">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="min-w-0 text-sm leading-relaxed sm:text-base">
            <span className="font-head text-xs uppercase tracking-wide">
              Before you connect a folder to Cowork:{" "}
            </span>
            Cowork does its work on Anthropic&apos;s servers, and reaches your computer only
            through the folders you explicitly connect — and only while the app is open. So
            connect a folder that holds nothing you would not read aloud on air. No donor names,
            no emails, no addresses, no giving history. If you would not put it in a press
            release, it does not go in that folder.
          </p>
        </div>

        <p className="mt-3 max-w-2xl text-xs text-muted-foreground">
          Read more:{" "}
          <a
            href={SOURCES.coworkArchitecture}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            how Cowork is built
          </a>{" "}
          and{" "}
          <a
            href={SOURCES.coworkSafely}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            using it safely
          </a>
          .
        </p>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed sm:text-base">
          Cowork works differently from the Code tab the rest of this course teaches. You do not
          sit and watch it change files one at a time. You describe the finished thing, and you
          walk away — it hands you back a result when it&apos;s done. Here&apos;s one station task,
          start to finish.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
              What you type into a folder holding just the safe files
            </p>
            <div className="mt-2">
              <CopyPrompt label="A Cowork task" prompt={EXAMPLE_TASK} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
              What comes back
            </p>
            <div className="retro-box mt-2 bg-card p-4">
              <p className="text-sm leading-relaxed sm:text-base">
                A new file in that same folder — <code className="font-mono text-[13px]">
                  underwriting-style-sheet.md
                </code>{" "}
                — with the patterns Cowork found across the four scripts written out as rules a
                new hire could follow. You never typed a command and never watched it happen; you
                come back to the folder and the file is there.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
