import { Suspense } from "react";
import type { Metadata } from "next";
import { UseCaseBrowser } from "@/components/use-cases/use-case-browser";
import { meta, roles } from "@/lib/course";

export const metadata: Metadata = {
  title: "Find your role",
  description: `All ${meta.useCaseCount} station use cases from the course, filterable by the ${roles.length} public media roles — with the guardrail on every single one.`,
};

export default function UseCasesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="retro-box-lg bg-card p-5 sm:p-8">
        <p className="font-head text-xs uppercase tracking-wide text-muted-foreground">
          Find your role
        </p>
        <h1 className="mt-2 font-head text-2xl leading-tight sm:text-4xl">
          {meta.useCaseCount} things a station can actually do with this
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Every use case in the course, sorted by the job you actually do. Each
          one names the scenario, what Claude does about it, roughly what it
          saves you — and the guardrail, which is not optional reading.
        </p>
      </header>

      <div className="mt-8">
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground">Loading use cases…</p>
          }
        >
          <UseCaseBrowser />
        </Suspense>
      </div>
    </div>
  );
}
