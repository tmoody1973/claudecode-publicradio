"use client";

import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { useProgress } from "@/components/progress-tracker";
import { formatRuntime, type CourseModule } from "@/lib/course";

export function ModuleCard({ module }: { module: CourseModule }) {
  const { mounted, isComplete } = useProgress();
  const done = mounted && isComplete(module.slug);

  return (
    <Link
      href={`/modules/${module.slug}`}
      className="retro-box retro-lift group flex h-full flex-col gap-3 bg-card p-4 no-underline"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center border-2 border-border bg-primary font-head text-lg text-black"
          aria-hidden
        >
          {module.number}
        </span>

        <h3 className="min-w-0 flex-1 font-head text-base leading-tight">
          <span className="sr-only">Module {module.number}: </span>
          {module.title}
        </h3>

        {done && (
          <span className="grid size-7 shrink-0 place-items-center border-2 border-border bg-primary">
            <Check className="size-4 text-black" aria-hidden />
            <span className="sr-only">Complete</span>
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{module.kicker}</p>

      <ul className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-border pt-3 text-xs text-muted-foreground">
        <li className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          {formatRuntime(module.runtimeMin)}
        </li>
        <li>{module.concepts.length} concepts</li>
        <li>{module.useCases.length} use cases</li>
        <li>
          {module.sourceChapters.length} source{" "}
          {module.sourceChapters.length === 1 ? "chapter" : "chapters"}
        </li>
      </ul>
    </Link>
  );
}
