"use client";

/**
 * The RetroUI renderers for the generative-UI library.
 *
 * Schemas, descriptions and prompt copy live in `lib/openui-spec.mjs` — the single
 * source of truth, shared with the build-time prompt generator. This file only
 * supplies the pixels: each component is built from the same RetroUI primitives as
 * the rest of the site, so an AI-generated answer is visually indistinguishable
 * from a hand-built page. That's the point — the chat isn't a grey bubble bolted
 * onto a neobrutalist site.
 */

import { useTriggerAction } from "@openuidev/react-lang";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ExternalLink, Info, Library, ShieldAlert } from "lucide-react";
import { buildCourseLibrary } from "@/lib/openui-spec.mjs";
import { LIBRARY_INDEX, type LibraryIndexEntry } from "@/content/library-index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyPrompt } from "@/components/copy-prompt";
import { roleColor, type RoleSlug } from "@/lib/course";

const VIDEO = "https://www.youtube.com/watch?v=jdbOVepEtUE";

type R<P> = (args: { props: P; renderNode: (v: unknown) => React.ReactNode }) => React.ReactNode;

const Paragraph: R<{ text: string }> = ({ props }) => (
  <p className="text-[15px] leading-relaxed text-foreground">{props.text}</p>
);

const Callout: R<{ tone: "note" | "warning" | "guardrail"; title: string; text: string }> = ({
  props,
}) => {
  const cfg = {
    note: { Icon: Info, bg: "var(--accent)" },
    warning: { Icon: AlertTriangle, bg: "var(--primary)" },
    guardrail: { Icon: ShieldAlert, bg: "var(--destructive)" },
  }[props.tone] ?? { Icon: Info, bg: "var(--accent)" };
  const { Icon } = cfg;
  const onDark = props.tone === "guardrail";
  return (
    <div
      className="retro-box p-3 sm:p-4"
      style={{ background: cfg.bg, color: onDark ? "var(--destructive-foreground)" : "#000" }}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-head text-sm uppercase tracking-wide">{props.title}</p>
          <p className="mt-1 text-[14px] leading-relaxed">{props.text}</p>
        </div>
      </div>
    </div>
  );
};

const UseCaseCard: R<{
  role: RoleSlug;
  title: string;
  scenario: string;
  howClaudeHelps: string;
  timeSaved?: string;
  guardrail: string;
}> = ({ props }) => (
  <article className="retro-box bg-card">
    <div
      className="border-b-2 border-border px-3 py-1.5"
      style={{ background: roleColor[props.role] ?? "var(--muted)" }}
    >
      <span className="font-head text-[11px] uppercase tracking-wider text-black">{props.role}</span>
    </div>
    <div className="space-y-2 p-3 sm:p-4">
      <h4 className="font-head text-base leading-snug">{props.title}</h4>
      <p className="text-[14px] leading-relaxed text-muted-foreground">{props.scenario}</p>
      <p className="text-[14px] leading-relaxed">{props.howClaudeHelps}</p>
      {props.timeSaved ? (
        <Badge variant="outline" className="text-[11px]">
          {props.timeSaved}
        </Badge>
      ) : null}
      <div className="mt-2 flex items-start gap-2 border-t-2 border-border pt-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <p className="text-[13px] leading-relaxed">
          <span className="font-head text-[11px] uppercase tracking-wide">Guardrail: </span>
          {props.guardrail}
        </p>
      </div>
    </div>
  </article>
);

const PromptBlock: R<{ label: string; prompt: string }> = ({ props }) => (
  <CopyPrompt label={props.label} prompt={props.prompt} />
);

const Steps: R<{ items: string[] }> = ({ props }) => (
  <ol className="space-y-2">
    {(props.items ?? []).map((s, i) => (
      <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
        <span
          className="grid size-6 shrink-0 place-items-center border-2 border-border bg-primary font-head text-[12px] text-black"
          aria-hidden
        >
          {i + 1}
        </span>
        <span className="pt-0.5">{s}</span>
      </li>
    ))}
  </ol>
);

const ModuleRef: R<{ number: number; title: string }> = ({ props }) => {
  const n = Math.min(10, Math.max(1, Math.round(props.number)));
  return (
    <Link
      href={`/modules/module-${n}`}
      className="retro-box retro-lift flex min-h-11 items-center gap-2.5 bg-primary p-2.5 no-underline"
    >
      <span className="grid size-7 shrink-0 place-items-center border-2 border-border bg-background font-head text-[13px]">
        {n}
      </span>
      <span className="flex-1 font-head text-[13px] leading-tight text-black">{props.title}</span>
      <ArrowRight className="size-4 shrink-0 text-black" aria-hidden />
    </Link>
  );
};

const VideoLink: R<{ label: string; seconds: number }> = ({ props }) => {
  const s = Math.max(0, Math.floor(props.seconds ?? 0));
  const stamp = `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(
    s % 60,
  ).padStart(2, "0")}`;
  return (
    <a
      href={`${VIDEO}&t=${s}s`}
      target="_blank"
      rel="noopener noreferrer"
      className="retro-box retro-lift inline-flex min-h-11 items-center gap-2 bg-card px-3 py-2 text-[13px] no-underline"
    >
      <ExternalLink className="size-4 shrink-0" aria-hidden />
      <span className="font-medium">{props.label}</span>
      <span className="font-mono text-[12px] text-muted-foreground">{stamp}</span>
    </a>
  );
};

const Comparison: R<{
  leftTitle: string;
  rightTitle: string;
  rows: { left: string; right: string }[];
}> = ({ props }) => {
  const rows = props.rows ?? [];
  return (
    <div className="retro-box overflow-hidden bg-card">
      <div className="grid grid-cols-2 border-b-2 border-border">
        <div className="border-r-2 border-border bg-primary p-2">
          <span className="font-head text-[12px] uppercase text-black">{props.leftTitle}</span>
        </div>
        <div className="bg-accent p-2">
          <span className="font-head text-[12px] uppercase text-black">{props.rightTitle}</span>
        </div>
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          className={`grid grid-cols-2 ${i < rows.length - 1 ? "border-b-2 border-border" : ""}`}
        >
          <div className="border-r-2 border-border p-2.5 text-[13px] leading-relaxed">{r.left}</div>
          <div className="p-2.5 text-[13px] leading-relaxed">{r.right}</div>
        </div>
      ))}
    </div>
  );
};

/**
 * The model can only ever emit numeric ids (see lib/openui-spec.mjs) — never a
 * free-text title, publisher, or url. Each id is resolved against LIBRARY_INDEX,
 * generated from the real vetted content/library.json by scripts/gen-library-index.mjs.
 * An id that doesn't resolve — a fabrication, or an id the model was never actually
 * handed in the LIBRARY grounding block — is silently dropped, and if none resolve
 * the whole card renders nothing. This makes a fabricated citation structurally
 * unrenderable rather than merely discouraged by prompt wording.
 */
const Sources: R<{ ids: number[] }> = ({ props }) => {
  const items = (props.ids ?? [])
    .map((id) => LIBRARY_INDEX[id])
    .filter((s): s is LibraryIndexEntry => Boolean(s));
  if (items.length === 0) return null;

  return (
    <section className="retro-box bg-card p-3" aria-label="Sources from the library">
      <header className="mb-2 flex items-center gap-2">
        <Library className="size-4 shrink-0" aria-hidden />
        <h4 className="font-head text-[13px] leading-tight">From the library</h4>
      </header>

      <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
        Vetted sources matched to your question. The assistant has not read them — it is
        pointing you at them.
      </p>

      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="retro-box retro-lift flex min-h-11 items-start gap-2 bg-background p-2.5 no-underline"
            >
              <ExternalLink className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[13px] font-medium leading-tight">{s.title}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground">{s.publisher}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {s.bucketLabel}
                  </Badge>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};

const FollowUps: R<{ questions: string[] }> = ({ props }) => {
  const trigger = useTriggerAction();
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {(props.questions ?? []).slice(0, 3).map((q, i) => (
        <Button
          key={i}
          variant="outline"
          size="sm"
          className="h-auto min-h-11 whitespace-normal py-2 text-left text-[13px]"
          onClick={() => trigger(q)}
        >
          {q}
        </Button>
      ))}
    </div>
  );
};

const Answer: R<{ blocks: unknown[] }> = ({ props, renderNode }) => (
  <div className="space-y-3">{renderNode(props.blocks)}</div>
);

/** Same schemas as the build-time prompt, now with real pixels attached. */
export const courseLibrary = buildCourseLibrary({
  Answer,
  Paragraph,
  Callout,
  UseCaseCard,
  PromptBlock,
  Steps,
  ModuleRef,
  VideoLink,
  Comparison,
  Sources,
  FollowUps,
});
