import { TROUBLE } from "@/lib/install-facts.mjs";

export function Troubleshooting() {
  return (
    <section
      aria-labelledby="troubleshooting-heading"
      className="mx-auto max-w-6xl px-4 py-12"
    >
      <h2
        id="troubleshooting-heading"
        className="font-head text-xl uppercase tracking-tight sm:text-3xl"
      >
        If something doesn&apos;t look right
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
        A reference, not a read — come back to it if one of these happens.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {TROUBLE.map((t) => (
          <li key={t.symptom} className="retro-box flex min-w-0 flex-col gap-2 bg-card p-4">
            <h3 className="font-head text-sm leading-tight">&ldquo;{t.symptom}&rdquo;</h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-head text-xs uppercase tracking-wide">Why: </span>
              {t.cause}
            </p>
            <p className="text-sm">
              <span className="font-head text-xs uppercase tracking-wide">Fix: </span>
              {t.fix}
            </p>
            <a
              href={t.source}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex min-h-11 w-fit items-center pt-1 font-medium text-foreground underline underline-offset-2"
            >
              Source
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
