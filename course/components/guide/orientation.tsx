import Link from "next/link";
import { ArrowRight, Compass, ListOrdered, MessageSquare, PlayCircle, Receipt, BookA } from "lucide-react";
import { meta, roles } from "@/lib/course";

/** Each stop on the site, in the order a real person should hit them. */
const STOPS = [
  {
    icon: Compass,
    kicker: "Start here",
    title: "Start with your role, not with Module 1",
    href: "/use-cases",
    cta: "Find my role",
    body: `The ${meta.useCaseCount} use cases are filtered by ${roles.length} station roles — news, membership, music, underwriting, digital, leadership, traffic, engineering, grants. Find the job you actually do, pick a use case that sounds like your Tuesday, and work backwards to the module it came from. That is the shortest route from "what is this" to "this saved me an afternoon."`,
  },
  {
    icon: ListOrdered,
    kicker: "Or go in order",
    title: `${meta.moduleCount} modules, and it remembers where you stopped`,
    href: "/modules",
    cta: "See the modules",
    body: `Six hours of source video, cut into ${meta.moduleCount} modules you can read. Mark a module complete and the site remembers — progress is stored in your own browser, nowhere else. Close the tab in the middle of Module 4 and come back Thursday; it will still be there.`,
  },
  {
    icon: PlayCircle,
    kicker: "The proof",
    title: "Every timestamp plays right here",
    href: "/modules/module-1",
    cta: "Try it in Module 1",
    body: "Every concept, quote, and chapter links to the exact second of the source video it came from — and pressing it plays the video in place, on the module page. You never lose your spot, and you never have to take our word for anything. Check our work.",
  },
  {
    icon: MessageSquare,
    kicker: "When you're stuck",
    title: "Ask the assistant",
    href: null,
    cta: null,
    body: `The chat button, bottom-right of every page. It is grounded in all ${meta.moduleCount} modules, so it will answer for a station — "how would a music director use this?" — not in general. Two honest caveats: it runs on a free model, so give it 20–30 seconds to answer, and you must never paste donor data, member data, or unpublished source material into it.`,
  },
  {
    icon: Receipt,
    kicker: "The GM question",
    title: "What will this cost us",
    href: "/cost",
    cta: "Run the numbers",
    body: "It is the first question a general manager asks and the last one most AI pitches answer. The cost page has a simulator: put in how many people, how often, and see what a month actually looks like — plus the things that quietly make it more expensive.",
  },
  {
    icon: BookA,
    kicker: "When a word stops you",
    title: `${meta.glossaryCount} terms in plain English`,
    href: "/glossary",
    cta: "Open the glossary",
    body: "Token, context window, MCP, sub-agent, cache. Every piece of jargon on this site is defined in one sentence a non-technical person can use in a meeting, and linked to the module where it shows up.",
  },
];

export function Orientation() {
  return (
    <section aria-labelledby="orient-heading" className="mx-auto max-w-6xl px-4 py-12">
      <h2 id="orient-heading" className="font-head text-xl uppercase tracking-tight sm:text-3xl">
        How to actually use this site
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
        Six things. Read them once and you will never have to hunt for anything here again.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STOPS.map((stop) => {
          const Icon = stop.icon;
          return (
            <li key={stop.title} className="retro-box flex h-full flex-col gap-3 bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-9 shrink-0 place-items-center border-2 border-border bg-primary">
                  <Icon className="size-5 text-black" aria-hidden />
                </span>
                <span className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
                  {stop.kicker}
                </span>
              </div>

              <h3 className="font-head text-base leading-tight">{stop.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{stop.body}</p>

              {stop.href && stop.cta ? (
                <Link
                  href={stop.href}
                  className="retro-lift mt-auto inline-flex min-h-11 items-center gap-2 self-start border-2 border-border bg-background px-3 font-head text-xs uppercase tracking-wide no-underline"
                >
                  {stop.cta}
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
