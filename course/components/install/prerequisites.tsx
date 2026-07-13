import { AlertTriangle, CircleCheck } from "lucide-react";
import { PREREQS } from "@/lib/install-facts.mjs";

export function Prerequisites() {
  // The Windows/Git prereq is the single most valuable fact on this page — without it,
  // step 5 of the Windows install silently does nothing. It gets its own callout, not a
  // spot in the grid, so it can't be skimmed past like the other two.
  const critical = PREREQS.find((p) => p.label.includes("Git"));
  const rest = PREREQS.filter((p) => p !== critical);

  return (
    <section
      aria-labelledby="prereqs-heading"
      className="border-y-2 border-border bg-muted py-12"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2
          id="prereqs-heading"
          className="font-head text-xl uppercase tracking-tight sm:text-3xl"
        >
          Before you download anything
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
          Three walls people hit. Better to know about them now than to hit them cold.
        </p>

        {critical ? (
          <div className="retro-box-lg mt-6 flex flex-col gap-3 bg-primary p-4 text-black sm:flex-row sm:items-start sm:gap-4 sm:p-6">
            <span className="grid size-11 shrink-0 place-items-center border-2 border-border bg-card">
              <AlertTriangle className="size-6 text-black" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-head text-[11px] uppercase tracking-widest">
                Read this one even if you skip everything else
              </p>
              <h3 className="mt-1 font-head text-lg leading-tight uppercase sm:text-xl">
                {critical.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed sm:text-base">{critical.detail}</p>
              <a
                href={critical.source}
                target="_blank"
                rel="noopener noreferrer"
                // text-black is only safe on bg-primary. This link sits on bg-card,
                // which is near-black in dark mode — text-card-foreground flips with
                // the theme instead of pinning a color that only works in light mode.
                className="mt-3 inline-flex min-h-11 items-center border-2 border-border bg-card px-3 font-head text-xs uppercase tracking-wide text-card-foreground no-underline"
              >
                See Anthropic&apos;s setup docs
              </a>
            </div>
          </div>
        ) : null}

        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {rest.map((p) => (
            <li key={p.label} className="retro-box flex min-w-0 gap-3 bg-card p-4">
              <span className="grid size-8 shrink-0 place-items-center border-2 border-border bg-background">
                <CircleCheck className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-head text-sm uppercase leading-tight tracking-wide">
                  {p.label}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.detail}</p>
                <a
                  href={p.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-2"
                >
                  Source
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
