import { Ban } from "lucide-react";

/**
 * The four non-negotiables. Same treatment as the home page Limits block on purpose —
 * this is the one section on the site that never gets softened, collapsed, or moved down.
 */
const NON_NEGOTIABLES = [
  {
    rule: "Donor and member data never goes to a cloud model",
    detail:
      "No names, no emails, no addresses, no phone numbers, no giving history — not in the prompt box, not in the project folder, not “just this once” to test something. Export the aggregate columns. Leave the people in the CRM.",
  },
  {
    rule: "Unpublished journalism and source identities never go in",
    detail:
      "Not the draft, not the tip, not the document a source handed you, not the name of the person who handed it to you. If it would burn a source or scoop your own newsroom, it does not go into a tool you do not control.",
  },
  {
    rule: "Underwriting copy always gets human FCC clearance",
    detail:
      "The FCC does not care that a machine wrote it. Every spot still gets a human compliance review — no calls to action, no price claims, no qualitative claims. That review is never the thing you automate.",
  },
  {
    rule: "Nothing publishes, sends, or posts without a human",
    detail:
      "Claude drafts, sorts, summarizes, and checks. A person presses send. No auto-posting to air, to social, to a donor inbox, or to a funder. Every automation in Module 9 ends at a human checkpoint, on purpose.",
  },
];

export function BeforeYouTouch() {
  return (
    <section
      aria-labelledby="before-heading"
      className="border-y-2 border-border bg-destructive py-12 text-white"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center border-2 border-black bg-white">
            <Ban className="size-6 text-black" aria-hidden />
          </span>
          <h2
            id="before-heading"
            className="font-head text-xl uppercase leading-tight tracking-tight sm:text-3xl"
          >
            Before you touch anything
          </h2>
        </div>

        <p className="mt-4 max-w-2xl text-sm sm:text-base">
          Four rules. They apply on day one, in every module, in every use case, and they do not
          have exceptions for pilots, tests, or deadlines. If a task on this site cannot be done
          without breaking one of them, the answer is that you do not do that task.
        </p>

        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {NON_NEGOTIABLES.map((item, i) => (
            <li
              key={item.rule}
              className="border-2 border-black bg-white p-4 text-black shadow-[4px_4px_0_0_#000]"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 place-items-center border-2 border-black bg-primary font-head text-sm text-black"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-head text-sm uppercase leading-tight tracking-wide sm:text-base">
                    <span className="sr-only">Rule {i + 1}: </span>
                    {item.rule}
                  </h3>
                  <p className="mt-2 text-sm">{item.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-2xl text-sm">
          That includes the chat assistant on this site. It is a helper, not a vault — never paste
          station data into it.
        </p>
      </div>
    </section>
  );
}
