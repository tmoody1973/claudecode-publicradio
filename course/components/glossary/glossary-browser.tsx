"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { glossary, type GlossaryEntry } from "@/lib/course";

/** Terms like /clear and .env sort under "#". */
const bucketOf = (term: string) => {
  const first = term[0]?.toUpperCase() ?? "#";
  return first >= "A" && first <= "Z" ? first : "#";
};

export function GlossaryBrowser() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = glossary.filter(
      (e) =>
        !q ||
        e.term.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q)
    );

    const byLetter = new Map<string, GlossaryEntry[]>();
    for (const entry of matches) {
      const letter = bucketOf(entry.term);
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), entry]);
    }

    return {
      count: matches.length,
      letters: [...byLetter.entries()].sort(([a], [b]) =>
        a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)
      ),
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="glossary-search" className="sr-only">
          Search the glossary
        </label>
        <Input
          id="glossary-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: cache, MCP, context window…"
          className="min-h-11 px-9 text-[16px]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Wraps rather than scrolls. A 26-chip horizontal scroller hides most of the
          alphabet off-screen on a phone; five wrapped rows show all of it at once. */}
      <nav aria-label="Jump to letter" className="py-1">
        <ul className="flex list-none flex-wrap gap-2 p-0">
          {groups.letters.map(([letter]) => (
            <li key={letter}>
              <a
                href={`#letter-${letter === "#" ? "symbols" : letter}`}
                className="retro-box retro-lift grid size-11 place-items-center bg-card font-head text-sm no-underline"
              >
                <span className="sr-only">Jump to </span>
                {letter}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        Showing {groups.count} {groups.count === 1 ? "term" : "terms"}
        {query.trim() && <> matching “{query.trim()}”</>}.
      </p>

      {groups.count === 0 ? (
        <div className="retro-box bg-card p-6 text-center">
          <h2 className="font-head text-lg">No terms match that.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a shorter word — “cache” instead of “caching strategy”.
          </p>
        </div>
      ) : (
        groups.letters.map(([letter, entries]) => (
          <section
            key={letter}
            id={`letter-${letter === "#" ? "symbols" : letter}`}
            className="scroll-mt-24"
            aria-labelledby={`heading-${letter === "#" ? "symbols" : letter}`}
          >
            <h2
              id={`heading-${letter === "#" ? "symbols" : letter}`}
              className="border-b-2 border-border pb-2 font-head text-xl"
            >
              {letter === "#" ? "Symbols & commands" : letter}
            </h2>
            <ul className="mt-4 grid list-none gap-4 p-0 [&>*]:min-w-0 md:grid-cols-2">
              {entries.map((entry) => (
                <li key={entry.term} className="retro-box bg-card p-4">
                  <h3 className="font-head text-base break-words">
                    {entry.term}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {entry.definition}
                  </p>
                  {entry.modules.length > 0 && (
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Appears in:</span>
                      {entry.modules.map((n) => (
                        <Link
                          key={n}
                          href={`/modules/module-${n}`}
                          className="retro-lift inline-flex min-h-11 items-center border-2 border-border bg-muted px-3 font-head text-xs no-underline"
                        >
                          Module {n}
                        </Link>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
