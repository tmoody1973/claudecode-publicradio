import type { Metadata } from "next";
import { ModuleCard } from "@/components/module-card";
import { ProgressTracker } from "@/components/progress-tracker";
import { formatRuntime, meta, modules } from "@/lib/course";

export const metadata: Metadata = {
  title: "Modules",
  description: `All ${meta.moduleCount} modules of the Claude Code course, translated for public radio and public television — in plain English, with a station use case in every one.`,
};

const totalRuntime = modules.reduce((sum, m) => sum + m.runtimeMin, 0);

export default function ModulesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10">
      <h1 className="font-head text-[1.75rem] uppercase leading-[1.1] tracking-tight sm:text-4xl">
        The {meta.moduleCount} modules
      </h1>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
        Start at Module 1 and go in order — each one assumes the last. About{" "}
        {formatRuntime(totalRuntime)} of reading in total, cut from {meta.chapterCount} chapters of
        source video. Mark a module complete as you finish it; we keep track in your browser.
      </p>

      <ProgressTracker className="mt-6" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <ModuleCard key={m.slug} module={m} />
        ))}
      </div>
    </div>
  );
}
