import { SearchCheck } from "lucide-react";
import type { VerifyCheck } from "@/lib/walkthroughs";

/** "I got output and I don't trust it" is a real failure mode. This is the fix. */
export function VerifyChecks({ checks }: { checks: VerifyCheck[] }) {
  return (
    <ul className="space-y-3">
      {checks.map((c, i) => (
        <li key={i} className="retro-box bg-card p-4">
          <div className="flex items-start gap-2.5">
            <SearchCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-head text-[15px] leading-snug">{c.check}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                {c.why}
              </p>
              <p className="mt-2 border-t-2 border-border pt-2 text-[14px] leading-relaxed">
                <span className="font-head text-[10px] uppercase tracking-wider">
                  If it&apos;s wrong ·{" "}
                </span>
                {c.ifWrong}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
