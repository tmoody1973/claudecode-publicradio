import { FileSearch } from "lucide-react";
import { CHECKED_ON } from "@/lib/install-facts.mjs";

/**
 * Everything else on this site is a translation of the video. This page is not — the
 * video never covers installation. That has to be said before a single instruction,
 * not buried after it, so the reader knows exactly what she's trusting and why.
 */
export function Provenance() {
  return (
    <section aria-labelledby="provenance-heading" className="border-y-2 border-border bg-muted py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="retro-box-lg flex flex-col gap-3 bg-card p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-6">
          <span className="grid size-11 shrink-0 place-items-center border-2 border-border bg-primary">
            <FileSearch className="size-6 text-black" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2
              id="provenance-heading"
              className="font-head text-base uppercase leading-tight tracking-tight sm:text-lg"
            >
              This page is not from the video.
            </h2>
            <p className="mt-2 text-sm leading-relaxed sm:text-base">
              The video does not cover installation — it assumes you are already set up. We wrote
              this page from Anthropic&apos;s own documentation, checked on{" "}
              <strong className="font-medium">{CHECKED_ON}</strong>. Every fact below links to the
              page it came from, so if something has changed since, you can see for yourself.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
