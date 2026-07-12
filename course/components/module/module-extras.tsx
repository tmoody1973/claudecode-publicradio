import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  FileText,
  FolderTree,
  PencilRuler,
  Receipt,
  UserCheck,
  Zap,
} from "lucide-react";
import { CopyPrompt } from "@/components/copy-prompt";
import type { AutomationBlueprint as Blueprint, MindsetShift, SkillAnatomy as Anatomy } from "@/lib/course";

/**
 * The source chapter is called "The 12 Mindset Shifts" but the video only ever
 * names nine. We say nine, and we print the note explaining the gap. Being
 * straight with the reader is the point.
 */
export function MindsetShifts({ shifts, note }: { shifts: MindsetShift[]; note: string }) {
  return (
    <div>
      <aside className="retro-box-lg mb-6 rounded-none bg-card p-3 sm:p-4">
        <p className="flex items-center gap-2 font-head text-[11px] uppercase tracking-widest">
          <PencilRuler className="size-4 shrink-0" aria-hidden />
          Editor’s note — why nine and not twelve
        </p>
        <p className="mt-2 text-[15px] leading-relaxed">{note}</p>
      </aside>

      <ol className="flex flex-col gap-4">
        {shifts.map((s) => (
          <li key={s.n} className="retro-box rounded-none bg-card">
            <div className="flex items-center gap-3 border-b-2 border-border p-3">
              <span className="retro-box grid size-11 shrink-0 place-items-center rounded-none bg-primary font-head text-lg text-black">
                {s.n}
              </span>
              <h3 className="min-w-0 font-head text-[15px] leading-snug sm:text-lg">{s.shift}</h3>
            </div>
            <div className="p-3">
              <p className="text-[15px] leading-relaxed">{s.plain}</p>
              <p className="mt-3 border-2 border-border bg-primary p-2.5 text-[15px] font-medium leading-relaxed text-black">
                <span className="font-head text-[10px] uppercase tracking-widest">
                  The station take:{" "}
                </span>
                {s.stationTake}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const ANATOMY_PARTS = [
  { key: "whatItIs", label: "What it is", Icon: FileText },
  { key: "whereItLives", label: "Where it lives", Icon: FolderTree },
  { key: "whenClaudeLoadsIt", label: "When Claude picks it up", Icon: Zap },
] as const;

export function SkillAnatomy({ anatomy }: { anatomy: Anatomy }) {
  return (
    <div className="flex flex-col gap-4">
      {ANATOMY_PARTS.map(({ key, label, Icon }) => (
        <div key={key} className="retro-box rounded-none bg-card p-3 sm:p-4">
          <p className="flex items-center gap-2 font-head text-[11px] uppercase tracking-widest">
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed">{anatomy[key]}</p>
        </div>
      ))}
      <CopyPrompt label="Example SKILL.md" prompt={anatomy.exampleSkillMd} />
    </div>
  );
}

function Stage({
  label,
  children,
  className = "bg-card",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`retro-box rounded-none p-3 sm:p-4 ${className}`}>
      <p className="font-head text-[10px] uppercase tracking-widest">{label}</p>
      <div className="mt-2 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}

function Arrow() {
  return (
    <ArrowDown
      className="mx-auto my-2 size-6 shrink-0 text-muted-foreground"
      aria-hidden
    />
  );
}

export function AutomationBlueprint({ blueprint }: { blueprint: Blueprint }) {
  return (
    <div>
      <div className="retro-box-lg mb-6 flex flex-wrap items-center gap-3 rounded-none bg-primary p-3 text-black sm:p-4">
        <h3 className="min-w-0 flex-1 font-head text-base leading-snug sm:text-lg">
          {blueprint.name}
        </h3>
        <span className="border-2 border-border bg-card px-2.5 py-1 text-[12px] text-foreground">
          <span className="font-head text-[10px] uppercase tracking-widest">Setup: </span>
          {blueprint.estSetupTime}
        </span>
      </div>

      <Stage label="Trigger">{blueprint.trigger}</Stage>
      <Arrow />

      <Stage label="Steps">
        <ol className="flex flex-col gap-2">
          {blueprint.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="grid size-6 shrink-0 place-items-center border-2 border-border bg-muted font-mono text-[11px]">
                {i + 1}
              </span>
              <span className="min-w-0">{s}</span>
            </li>
          ))}
        </ol>
      </Stage>
      <Arrow />

      <Stage label="Output" className="bg-muted">
        {blueprint.output}
      </Stage>
      <Arrow />

      <div className="retro-box-lg rounded-none bg-primary p-3 text-black sm:p-4">
        <p className="flex items-center gap-2 font-head text-[11px] uppercase tracking-widest">
          <UserCheck className="size-5 shrink-0" aria-hidden />
          Human checkpoint — the automation stops here
        </p>
        <p className="mt-2 text-[15px] font-medium leading-relaxed">{blueprint.humanCheckpoint}</p>
      </div>
    </div>
  );
}

export function CostTeaser() {
  return (
    <div className="retro-box rounded-none bg-card p-4 sm:p-6">
      <p className="flex items-center gap-2 font-head text-[11px] uppercase tracking-widest">
        <Receipt className="size-4 shrink-0" aria-hidden />
        The numbers live on their own page
      </p>
      <p className="mt-2 text-[15px] leading-relaxed">
        The full cost model — what caching actually saves, the table of things that quietly
        break the cache and start your bill over, and the plain-English answer for when your
        GM asks what this costs — is laid out on the cost page.
      </p>
      <Link
        href="/cost"
        className="retro-box retro-lift mt-4 inline-flex min-h-11 items-center gap-2 rounded-none bg-primary px-4 font-head text-[13px] uppercase tracking-wide text-black no-underline"
      >
        See what it costs
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}
