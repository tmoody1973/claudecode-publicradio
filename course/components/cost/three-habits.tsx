import type { CourseModule } from "@/lib/course";

/**
 * The three habits, lifted from module 10's own guidance rather than
 * paraphrased: two from the cache-breaker table's `avoidBy`, one from the
 * "Session handoff" concept. If the data changes, this changes with it.
 */
export function ThreeHabits({ module }: { module: CourseModule }) {
  const breakers = module.cacheBreakers ?? [];
  const avoidBy = (needle: string) =>
    breakers.find((b) => b.action.toLowerCase().includes(needle))?.avoidBy;
  const handoff = module.concepts.find((c) => c.term === "Session handoff");

  const habits = [
    {
      n: 1,
      title: "/clear between unrelated tasks",
      body: avoidBy("running /clear"),
      href: undefined as string | undefined,
    },
    {
      n: 2,
      title: "Pick one model and stay in it",
      body: avoidBy("switching the model"),
      href: undefined as string | undefined,
    },
    {
      n: 3,
      title: "Hand off instead of /compact",
      body: handoff?.plain,
      href: handoff?.youtube,
    },
  ].filter((h) => Boolean(h.body));

  return (
    <ul className="grid list-none gap-4 p-0 md:grid-cols-3">
      {habits.map((h) => (
        <li key={h.n} className="retro-box flex flex-col gap-3 bg-card p-4">
          <span
            className="grid size-11 place-items-center border-2 border-border bg-primary font-head text-lg text-black"
            aria-hidden
          >
            {h.n}
          </span>
          <h3 className="font-head text-base leading-tight">
            <span className="sr-only">Habit {h.n}: </span>
            {h.title}
          </h3>
          <p className="text-sm text-muted-foreground">{h.body}</p>
          {h.href && (
            <a
              href={h.href}
              target="_blank"
              rel="noreferrer"
              className="retro-lift mt-auto inline-flex min-h-11 items-center border-2 border-border bg-background px-3 font-head text-xs no-underline"
            >
              Watch this bit ({handoff?.tLabel})
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
