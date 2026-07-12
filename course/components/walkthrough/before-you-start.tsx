import { Check, ShieldAlert } from "lucide-react";
import type { Walkthrough } from "@/lib/walkthroughs";

/** The guardrail is stated BEFORE the work, not after. If she can't honour it,
 *  she should stop now — not discover that when she's already holding the output. */
export function BeforeYouStart({ w }: { w: Walkthrough }) {
  return (
    <div className="grid gap-4 [&>*]:min-w-0 md:grid-cols-2">
      <div className="retro-box bg-card p-4">
        <h3 className="font-head text-sm uppercase tracking-wide">You&apos;ll need</h3>
        <ul className="mt-3 space-y-2">
          {w.youWillNeed.map((n, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-relaxed">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="retro-box bg-destructive p-4 text-destructive-foreground">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 shrink-0" aria-hidden />
          <h3 className="font-head text-sm uppercase tracking-wide">
            The line you don&apos;t cross
          </h3>
        </div>
        <p className="mt-3 text-[14px] font-medium leading-relaxed">{w.guardrail}</p>
        <p className="mt-3 text-[12px] leading-relaxed text-destructive-foreground/80">
          If you can&apos;t hold this line, stop here and pick a different job. That is a
          real answer, and it is better than the alternative.
        </p>
      </div>
    </div>
  );
}
