import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, LayoutGrid } from "lucide-react";
import { MarkComplete } from "@/components/module/mark-complete";
import { formatRuntime } from "@/lib/course";
import type { CourseModule } from "@/lib/course";

export function ModuleHeader({ mod }: { mod: CourseModule }) {
  return (
    <header className="retro-box-lg rounded-none bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="retro-box grid min-h-11 min-w-11 place-items-center bg-primary px-3 font-head text-lg text-black">
          {mod.number}
        </span>
        <span className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
          Module {mod.number} of 10
        </span>
        <span className="ml-auto inline-flex min-h-11 items-center gap-1.5 border-2 border-border bg-muted px-3 text-[13px]">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          <span className="font-mono">{formatRuntime(mod.runtimeMin)}</span>
        </span>
      </div>

      <h1 className="mt-4 text-2xl leading-tight sm:text-4xl">{mod.title}</h1>
      <p className="mt-2 text-base text-muted-foreground sm:text-lg">{mod.kicker}</p>

      <div className="mt-5">
        <MarkComplete slug={mod.slug} />
      </div>
    </header>
  );
}

function NavCard({
  mod,
  direction,
}: {
  mod: CourseModule;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";
  return (
    <Link
      href={`/modules/${mod.slug}`}
      className="retro-box retro-lift flex min-h-[72px] flex-1 items-center gap-3 bg-card p-3 no-underline"
    >
      {isPrev && <ArrowLeft className="size-5 shrink-0" aria-hidden />}
      <span className={isPrev ? "min-w-0" : "ml-auto min-w-0 text-right"}>
        <span className="block font-head text-[10px] uppercase tracking-widest text-muted-foreground">
          {isPrev ? "Previous" : "Next"} — Module {mod.number}
        </span>
        <span className="block font-head text-[13px] leading-snug">{mod.title}</span>
      </span>
      {!isPrev && <ArrowRight className="size-5 shrink-0" aria-hidden />}
    </Link>
  );
}

export function ModuleNav({
  prev,
  next,
}: {
  prev?: CourseModule;
  next?: CourseModule;
}) {
  return (
    <nav aria-label="Module navigation" className="flex flex-col gap-3 sm:flex-row">
      {prev ? (
        <NavCard mod={prev} direction="prev" />
      ) : (
        <Link
          href="/modules"
          className="retro-box retro-lift flex min-h-[72px] flex-1 items-center gap-3 bg-card p-3 no-underline"
        >
          <LayoutGrid className="size-5 shrink-0" aria-hidden />
          <span className="font-head text-[13px] leading-snug">All modules</span>
        </Link>
      )}
      {next && <NavCard mod={next} direction="next" />}
    </nav>
  );
}
