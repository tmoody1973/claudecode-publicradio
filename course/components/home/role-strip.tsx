import Link from "next/link";
import { roleColor, roles } from "@/lib/course";

export function RoleStrip() {
  return (
    <section aria-labelledby="roles-heading" className="mx-auto max-w-6xl px-4 py-10">
      <h2 id="roles-heading" className="font-head text-xl uppercase tracking-tight sm:text-2xl">
        Start where you sit
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
        Fifty real station use cases, sorted by the job you actually do. Pick yours.
      </p>

      {/* The row scrolls, never the page. */}
      <div className="scroll-x no-scrollbar -mx-4 mt-5 px-4 md:mx-0 md:overflow-visible md:px-0">
        <ul className="flex w-max gap-2 md:w-full md:flex-wrap">
          {roles.map((role) => (
            <li key={role.slug}>
              <Link
                href={`/use-cases?role=${role.slug}`}
                className="retro-box retro-lift flex min-h-11 items-center gap-2 bg-card px-3 py-2 no-underline"
              >
                <span
                  className="size-4 shrink-0 border-2 border-border"
                  style={{ background: roleColor[role.slug] }}
                  aria-hidden
                />
                <span className="font-head text-xs uppercase tracking-wide">{role.label}</span>
                <span className="border-2 border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] leading-none">
                  {role.useCaseCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
