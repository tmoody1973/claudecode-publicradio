import { ShieldAlert, Timer } from "lucide-react";
import { roleColor } from "@/lib/course";
import type { UseCase } from "@/lib/course";

export function UseCaseCards({ useCases }: { useCases: UseCase[] }) {
  return (
    <ul className="flex flex-col gap-6">
      {useCases.map((u) => (
        <li key={u.id} className="retro-box bg-card">
          <div className="border-b-2 border-border p-3 sm:p-4">
            {/* Colour never carries meaning alone — the role label rides with it. */}
            <span
              className="inline-flex min-h-11 items-center border-2 border-border px-3 font-head text-[12px] uppercase tracking-wide text-black"
              style={{ background: roleColor[u.roleSlug] }}
            >
              {u.role}
            </span>
            <h3 className="mt-3 font-head text-base leading-snug sm:text-lg">{u.title}</h3>
          </div>

          <div className="flex flex-col gap-3 p-3 sm:p-4">
            <div>
              <p className="font-head text-[10px] uppercase tracking-widest text-muted-foreground">
                The scenario
              </p>
              <p className="mt-1 text-[15px] leading-relaxed">{u.scenario}</p>
            </div>

            <div>
              <p className="font-head text-[10px] uppercase tracking-widest text-muted-foreground">
                How Claude helps
              </p>
              <p className="mt-1 text-[15px] leading-relaxed">{u.howClaudeHelps}</p>
            </div>

            <p className="inline-flex items-start gap-2 border-2 border-border bg-muted px-3 py-2 text-[13px] font-medium">
              <Timer className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-head text-[10px] uppercase tracking-widest">
                  Time saved:{" "}
                </span>
                {u.timeSaved}
              </span>
            </p>
          </div>

          {/* Guardrails are never decoration and never behind a click. */}
          <div className="border-t-2 border-border bg-destructive p-3 text-destructive-foreground sm:p-4">
            <p className="flex items-center gap-2 font-head text-[11px] uppercase tracking-widest">
              <ShieldAlert className="size-5 shrink-0" aria-hidden />
              Guardrail — non-negotiable
            </p>
            <p className="mt-2 text-[15px] font-medium leading-relaxed">{u.guardrail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
