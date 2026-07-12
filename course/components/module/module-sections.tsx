import { AlertTriangle, ListVideo, Play, Quote } from "lucide-react";
import type { Concept, KeyQuote, SourceChapter } from "@/lib/course";

/** Shared section shell: a loud heading, an optional plain-English subtitle. */
export function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12">
      <h2 id={`${id}-h`} className="text-xl uppercase tracking-tight sm:text-2xl">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Deep link to the exact second of the source video. The site's proof of work —
 * every concept, quote and chapter carries one.
 */
export function TimestampLink({
  href,
  label,
  context,
}: {
  href: string;
  label: string;
  context: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="retro-box retro-lift inline-flex min-h-11 items-center gap-1.5 bg-card px-3 text-[13px] no-underline"
    >
      <Play className="size-3.5 shrink-0" aria-hidden />
      <span className="font-mono">{label}</span>
      <span className="sr-only">— watch “{context}” in the source video</span>
    </a>
  );
}

export function SourceChapters({ chapters }: { chapters: SourceChapter[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {chapters.map((c) => (
        <li key={c.n} className="retro-box flex flex-wrap items-center gap-3 bg-card p-3">
          <ListVideo className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 font-head text-[14px] leading-snug">{c.title}</span>
          <TimestampLink href={c.youtube} label={c.startLabel} context={c.title} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The whole value proposition: plain explanation on the left, the station
 * translation on the right, and the translation is the one we make loud.
 */
export function Concepts({ concepts }: { concepts: Concept[] }) {
  return (
    <ul className="flex flex-col gap-6">
      {concepts.map((c) => (
        <li key={c.term} className="retro-box bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border p-3">
            <h3 className="min-w-0 font-head text-base leading-snug sm:text-lg">{c.term}</h3>
            <TimestampLink href={c.youtube} label={c.tLabel} context={c.term} />
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-2">
            <div className="bg-card p-3">
              <p className="font-head text-[10px] uppercase tracking-widest text-muted-foreground">
                What it means
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed">{c.plain}</p>
            </div>
            <div className="bg-primary p-3 text-black">
              <p className="font-head text-[10px] uppercase tracking-widest">
                What it means at your station
              </p>
              <p className="mt-1.5 text-[15px] font-medium leading-relaxed">
                {c.stationTranslation}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Pitfalls({ pitfalls }: { pitfalls: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {pitfalls.map((p, i) => (
        <li key={i} className="retro-box flex gap-3 bg-card p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <span className="text-[15px] leading-relaxed">{p}</span>
        </li>
      ))}
    </ul>
  );
}

export function KeyQuotes({ quotes }: { quotes: KeyQuote[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {quotes.map((q) => (
        <li key={q.t} className="retro-box bg-card p-4">
          <Quote className="size-5 text-muted-foreground" aria-hidden />
          <blockquote className="mt-2 font-head text-lg leading-snug sm:text-xl">
            “{q.quote}”
          </blockquote>
          <div className="mt-3">
            <TimestampLink href={q.youtube} label={q.tLabel} context={q.quote} />
          </div>
        </li>
      ))}
    </ul>
  );
}
