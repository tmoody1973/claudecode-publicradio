import Link from "next/link";
import { meta } from "@/lib/course";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-border bg-card">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 pb-24 sm:pb-8">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          This site is an unofficial translation of{" "}
          <a
            href={meta.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            &ldquo;{meta.sourceTitle}&rdquo;
          </a>{" "}
          by {meta.sourceAuthor} ({meta.sourceChannel}) — {meta.chapterCount} chapters, rewritten
          for public radio and public television. All credit for the original course is his. The
          station framing, the {meta.useCaseCount} use cases, and every guardrail on this site are
          ours.
        </p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Nothing here is legal, FCC, or CPB compliance advice. Claude Code changes fast; check
          against Anthropic&apos;s current documentation before you rely on any detail.
        </p>
        <nav className="flex flex-wrap gap-2 pt-2" aria-label="Footer">
          {[
            { href: "/modules", label: "Modules" },
            { href: "/use-cases", label: "Use cases" },
            { href: "/cost", label: "What it costs" },
            { href: "/glossary", label: "Glossary" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="retro-box retro-lift flex min-h-11 items-center bg-background px-3 font-head text-[11px] uppercase tracking-wider no-underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
