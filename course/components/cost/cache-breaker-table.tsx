"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CacheBreaker } from "@/lib/course";

type Filter = "all" | "breaks" | "safe";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "breaks", label: "Breaks the cache" },
  { value: "safe", label: "Safe" },
];

/** Colour is never the only signal — every state carries an icon and a word. */
function Verdict({ breaks }: { breaks: boolean }) {
  return breaks ? (
    <span className="inline-flex items-center gap-1.5 border-2 border-border bg-destructive px-2 py-1 font-head text-xs text-destructive-foreground">
      <ShieldAlert className="size-4 shrink-0" aria-hidden />
      BREAKS
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 border-2 border-border bg-primary px-2 py-1 font-head text-xs text-black">
      <CheckCircle2 className="size-4 shrink-0" aria-hidden />
      SAFE
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const variant =
    impact === "High"
      ? "destructive"
      : impact === "Medium"
        ? "default"
        : "outline";
  return (
    <Badge variant={variant} className="h-auto py-1">
      <span className="sr-only">Cost impact: </span>
      {impact}
    </Badge>
  );
}

export function CacheBreakerTable({ breakers }: { breakers: CacheBreaker[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const rows = breakers.filter((b) =>
    filter === "all" ? true : filter === "breaks" ? b.breaksCache : !b.breaksCache
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        className="scroll-x no-scrollbar -mx-4 px-4 py-1"
        role="group"
        aria-label="Filter the cache-breaker list"
      >
        <div className="flex w-max gap-2">
          {FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? breakers.length
                : breakers.filter((b) =>
                    f.value === "breaks" ? b.breaksCache : !b.breaksCache
                  ).length;
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={`retro-box retro-lift flex min-h-11 shrink-0 items-center gap-2 px-3 font-head text-xs whitespace-nowrap ${
                  active ? "bg-primary text-black" : "bg-card"
                }`}
              >
                {f.label}
                <span className={active ? "text-black/70" : "text-muted-foreground"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        Showing {rows.length} of {breakers.length} actions.
      </p>

      {/* Phone: stacked cards. A five-column table at 320px is unusable. */}
      <ul className="grid list-none gap-4 p-0 md:hidden">
        {rows.map((b) => (
          <li key={b.action} className="retro-box flex flex-col gap-3 bg-card p-4">
            <Verdict breaks={b.breaksCache} />
            <h3 className="font-head text-base leading-tight">{b.action}</h3>
            <p className="text-sm text-muted-foreground">{b.why}</p>
            <p className="text-sm">
              <span className="font-head text-xs uppercase tracking-wide">
                Cost impact:{" "}
              </span>
              <ImpactBadge impact={b.costImpact} />
            </p>
            <p className="border-t-2 border-border pt-3 text-sm">
              <span className="font-head text-xs uppercase tracking-wide">
                What to do
              </span>
              <br />
              {b.avoidBy}
            </p>
          </li>
        ))}
      </ul>

      {/* Tablet and up: the real table. It brings its own scroll container. */}
      <div className="hidden md:block">
        <Table className="bg-card">
          <TableHeader>
            <TableRow>
              <TableHead className="font-head">Action</TableHead>
              <TableHead className="font-head">Cache</TableHead>
              <TableHead className="font-head">Why</TableHead>
              <TableHead className="font-head">Impact</TableHead>
              <TableHead className="font-head">What to do</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.action}>
                <TableCell className="w-48 align-top font-head text-sm whitespace-normal">
                  {b.action}
                </TableCell>
                <TableCell className="align-top">
                  <Verdict breaks={b.breaksCache} />
                </TableCell>
                <TableCell className="align-top text-sm whitespace-normal text-muted-foreground">
                  {b.why}
                </TableCell>
                <TableCell className="align-top">
                  <ImpactBadge impact={b.costImpact} />
                </TableCell>
                <TableCell className="w-64 align-top text-sm whitespace-normal">
                  {b.avoidBy}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
