import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { roleColor } from "@/lib/course";
import type { Walkthrough } from "@/lib/walkthroughs";

export function WalkthroughCard({ w }: { w: Walkthrough }) {
  return (
    <Link
      href={`/walkthroughs/${w.slug}`}
      className="retro-box retro-lift flex flex-col bg-card p-4 no-underline"
    >
      <div className="flex items-center gap-2">
        {w.roleSlug ? (
          <span
            className="border-2 border-border px-2 py-0.5 font-head text-[10px] uppercase tracking-wider text-black"
            style={{ background: roleColor[w.roleSlug] }}
          >
            {w.roleSlug}
          </span>
        ) : (
          <span className="border-2 border-border bg-primary px-2 py-0.5 font-head text-[10px] uppercase tracking-wider text-black">
            Start here
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[12px] text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {w.estMinutes} min
        </span>
      </div>

      <h3 className="mt-3 font-head text-base leading-snug">{w.title}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{w.kicker}</p>

      <p className="mt-3 flex items-center gap-1.5 font-head text-[11px] uppercase tracking-wide">
        {w.steps.length} steps · real recording
        <ArrowRight className="size-4" aria-hidden />
      </p>
    </Link>
  );
}
