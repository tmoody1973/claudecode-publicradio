import Link from "next/link";
import { ArrowRight, Clock, ShieldAlert } from "lucide-react";
import { roleColor, type UseCase } from "@/lib/course";

/** One station use case. The guardrail is never hidden — it is the loudest block on the card. */
export function UseCaseCard({ useCase }: { useCase: UseCase }) {
  return (
    <article className="retro-box flex h-full flex-col gap-3 bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center border-2 border-border px-2 py-1 font-head text-xs text-black"
          style={{ background: roleColor[useCase.roleSlug] }}
        >
          {useCase.role}
        </span>
        <span className="inline-flex items-center gap-1 border-2 border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          <span className="sr-only">Time saved: </span>
          {useCase.timeSaved}
        </span>
      </div>

      <h3 className="font-head text-base leading-tight">{useCase.title}</h3>

      <p className="text-sm text-muted-foreground">{useCase.scenario}</p>

      <div className="text-sm">
        <h4 className="font-head text-xs uppercase tracking-wide">
          How Claude helps
        </h4>
        <p className="mt-1">{useCase.howClaudeHelps}</p>
      </div>

      <div className="mt-auto flex gap-2 border-2 border-border bg-destructive p-3 text-destructive-foreground">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 text-sm">
          <h4 className="font-head text-xs uppercase tracking-wide">
            Guardrail
          </h4>
          <p className="mt-1">{useCase.guardrail}</p>
        </div>
      </div>

      <Link
        href={`/modules/module-${useCase.moduleNumber}`}
        className="retro-lift inline-flex min-h-11 items-center gap-2 border-2 border-border bg-background px-3 font-head text-xs no-underline"
      >
        Module {useCase.moduleNumber}: {useCase.moduleTitle}
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Link>
    </article>
  );
}
