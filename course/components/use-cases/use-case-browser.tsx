"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { UseCaseCard } from "@/components/use-cases/use-case-card";
import { roleColor, roles, useCases, type RoleSlug } from "@/lib/course";

type Filter = RoleSlug | "all";

const isRole = (v: string | null): v is RoleSlug =>
  roles.some((r) => r.slug === v);

/** Reads `?role=` — must live inside a <Suspense> boundary (Next 16). */
export function UseCaseBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");

  const raw = params.get("role");
  const role: Filter = isRole(raw) ? raw : "all";

  const setRole = (next: Filter) => {
    // Shareable: a colleague can be sent straight to their own role.
    router.replace(next === "all" ? pathname : `${pathname}?role=${next}`, {
      scroll: false,
    });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return useCases.filter((u) => {
      if (role !== "all" && u.roleSlug !== role) return false;
      if (!q) return true;
      return (
        u.title.toLowerCase().includes(q) ||
        u.scenario.toLowerCase().includes(q) ||
        u.howClaudeHelps.toLowerCase().includes(q)
      );
    });
  }, [role, query]);

  const roleLabel =
    role === "all"
      ? "all roles"
      : roles.find((r) => r.slug === role)!.label;

  return (
    <div className="flex flex-col gap-6">
      <div className="scroll-x no-scrollbar -mx-4 px-4 py-1">
        <div
          className="flex w-max gap-2"
          role="group"
          aria-label="Filter use cases by station role"
        >
          <FilterChip
            active={role === "all"}
            onClick={() => setRole("all")}
            label="All roles"
            count={useCases.length}
          />
          {roles.map((r) => (
            <FilterChip
              key={r.slug}
              active={role === r.slug}
              onClick={() => setRole(r.slug)}
              label={r.label}
              count={r.useCaseCount}
              swatch={roleColor[r.slug]}
            />
          ))}
        </div>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <label htmlFor="use-case-search" className="sr-only">
          Search use cases
        </label>
        <Input
          id="use-case-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: pledge, PDF, transcript…"
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

      <p aria-live="polite" className="text-sm text-muted-foreground">
        Showing {results.length} {results.length === 1 ? "use case" : "use cases"}{" "}
        for {roleLabel}
        {query.trim() && <> matching “{query.trim()}”</>}.
      </p>

      {results.length === 0 ? (
        <div className="retro-box bg-card p-6 text-center">
          <h2 className="font-head text-lg">No use cases match that.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a shorter word, or clear the search and pick a different role.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setRole("all");
            }}
            className="retro-box retro-lift mt-4 inline-flex min-h-11 items-center bg-primary px-4 font-head text-sm text-black"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((u) => (
            <li key={u.id} className="flex">
              <UseCaseCard useCase={u} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  swatch,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  swatch?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`retro-box retro-lift flex min-h-11 shrink-0 items-center gap-2 px-3 font-head text-xs whitespace-nowrap ${
        active ? "bg-primary text-black" : "bg-card"
      }`}
    >
      {swatch && (
        <span
          className="size-4 shrink-0 border-2 border-border"
          style={{ background: swatch }}
          aria-hidden
        />
      )}
      {label}
      <span className={active ? "text-black/70" : "text-muted-foreground"}>
        {count}
      </span>
    </button>
  );
}
