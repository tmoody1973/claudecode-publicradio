import type { Trouble } from "@/lib/walkthroughs";

export function Troubleshooting({ items }: { items: Trouble[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t, i) => (
        <li key={i} className="retro-box bg-card p-4">
          <p className="font-head text-[15px] leading-snug">{t.symptom}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
            <span className="font-head text-[10px] uppercase tracking-wider text-foreground">
              Why ·{" "}
            </span>
            {t.cause}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed">
            <span className="font-head text-[10px] uppercase tracking-wider">Fix · </span>
            {t.fix}
          </p>
        </li>
      ))}
    </ul>
  );
}
