import type { Metadata } from "next";
import { GlossaryBrowser } from "@/components/glossary/glossary-browser";
import { meta } from "@/lib/course";

export const metadata: Metadata = {
  title: "Glossary",
  description: `All ${meta.glossaryCount} terms from the course, in plain English, each linked back to the module it comes from.`,
};

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="retro-box-lg bg-card p-5 sm:p-8">
        <p className="font-head text-xs uppercase tracking-wide text-muted-foreground">
          Glossary
        </p>
        <h1 className="mt-2 font-head text-2xl leading-tight sm:text-4xl">
          {meta.glossaryCount} words, in plain English
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Every bit of jargon the course uses, translated once and linked back to
          the module it came from. If a word on this site made you stop reading,
          it should be here.
        </p>
      </header>

      <div className="mt-8">
        <GlossaryBrowser />
      </div>
    </div>
  );
}
