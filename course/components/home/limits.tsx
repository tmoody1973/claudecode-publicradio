import Link from "next/link";
import { Ban } from "lucide-react";

/**
 * Drawn straight from the guardrails attached to the 50 use cases. Not decoration —
 * this is the section a news director reads before they trust anything else here.
 */
const LIMITS = [
  {
    title: "It will not write publishable journalism unsupervised",
    body: "It can find the lead, read the 200-page PDF, and draft the question. Nothing it produces goes on air or online until a reporter has opened the actual source page and confirmed the number. AI finds it; a human confirms it. Always.",
  },
  {
    title: "Donor data never goes into a cloud model",
    body: "No names, no addresses, no emails, no giving history, no CRM export — not in the prompt box, not in the project folder. Export the aggregate numbers, not the people. Strip PII before Claude ever sees the file.",
  },
  {
    title: "Underwriting copy always needs human FCC clearance",
    body: "FCC rules do not care that a machine wrote it. Every spot still gets a human compliance review — no calls to action, no price claims, no qualitative claims. That review never gets automated.",
  },
  {
    title: "It is not a compliance tool",
    body: "A rule in a CLAUDE.md file is a first filter, not a lawyer. Never treat the model saying “this is compliant” as clearance — for CPB reporting, FCC filings, or an audit, the human signature is still the one that counts.",
  },
];

export function Limits() {
  return (
    <section aria-labelledby="limits-heading" className="bg-destructive py-12 text-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center border-2 border-black bg-white">
            <Ban className="size-6 text-black" aria-hidden />
          </span>
          <h2
            id="limits-heading"
            className="font-head text-xl uppercase leading-tight tracking-tight sm:text-3xl"
          >
            What this will not do for you
          </h2>
        </div>

        <p className="mt-4 max-w-2xl text-sm sm:text-base">
          Every use case on this site ships with a guardrail attached to it. Here are the four that
          never move, no matter which module you are in.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {LIMITS.map((limit) => (
            <li
              key={limit.title}
              className="border-2 border-black bg-white p-4 text-black shadow-[4px_4px_0_0_#000]"
            >
              <h3 className="font-head text-sm uppercase leading-tight tracking-wide sm:text-base">
                {limit.title}
              </h3>
              <p className="mt-2 text-sm">{limit.body}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/use-cases"
          className="retro-box retro-lift mt-6 inline-flex min-h-11 items-center bg-background px-4 font-head text-sm uppercase tracking-wide text-foreground no-underline"
        >
          See the guardrail on all 50 use cases
        </Link>
      </div>
    </section>
  );
}
