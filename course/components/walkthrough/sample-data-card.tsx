import { Download, FlaskConical } from "lucide-react";
import type { SampleData } from "@/lib/walkthroughs";

export function SampleDataCard({ data }: { data: SampleData }) {
  return (
    <div className="retro-box bg-accent p-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-5 shrink-0" aria-hidden />
        <h3 className="font-head text-sm uppercase tracking-wide">
          Practise on this — it&apos;s fake
        </h3>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed">{data.description}</p>

      <p className="mt-2 text-[13px] leading-relaxed">
        {data.rows.toLocaleString()} rows. Every name is invented and every email
        address ends in <code className="font-mono">@example.invalid</code>, which can
        never reach a real person. Use this, not a real export, while you&apos;re
        learning.
      </p>

      <div className="scroll-x mt-3">
        <div className="flex w-max gap-1.5">
          {data.columns.map((c) => (
            <span
              key={c}
              className="border-2 border-border bg-background px-2 py-1 font-mono text-[11px] whitespace-nowrap"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <a
        href={data.downloadPath}
        download
        className="retro-box retro-lift mt-4 inline-flex min-h-11 items-center gap-2 bg-background px-4 font-head text-[12px] uppercase tracking-wide no-underline"
      >
        <Download className="size-4" aria-hidden />
        Download {data.filename}
      </a>
    </div>
  );
}
