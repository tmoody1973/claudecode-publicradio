import { MessageCircle, Sparkles, TerminalSquare } from "lucide-react";
import { TABS } from "@/lib/install-facts.mjs";

const ICONS: Record<string, typeof MessageCircle> = {
  Chat: MessageCircle,
  Cowork: Sparkles,
  "Claude Code": TerminalSquare,
};

export function WhichTab() {
  return (
    <section aria-labelledby="which-tab-heading" className="mx-auto max-w-6xl px-4 py-12">
      <h2
        id="which-tab-heading"
        className="font-head text-xl uppercase tracking-tight sm:text-3xl"
      >
        You install one app. It has three tabs. None of them needs a terminal.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
        The course sometimes talks about these as three separate things. They are not — they are
        three tabs inside the one app you are about to download.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {TABS.map((tab) => {
          const Icon = ICONS[tab.name] ?? MessageCircle;
          const isCode = tab.name === "Claude Code";
          return (
            <li
              key={tab.name}
              className={`retro-box flex h-full min-w-0 flex-col gap-3 p-4 ${
                isCode ? "bg-primary text-black" : "bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`grid size-9 shrink-0 place-items-center border-2 border-border ${
                    isCode ? "bg-card" : "bg-primary"
                  }`}
                >
                  <Icon className="size-5 text-black" aria-hidden />
                </span>
                <h3 className="min-w-0 font-head text-base leading-tight uppercase">{tab.name}</h3>
              </div>

              {isCode ? (
                <span className="w-fit border-2 border-border bg-card px-2 py-1 font-head text-[10px] uppercase tracking-widest">
                  This is what the rest of the course teaches
                </span>
              ) : null}

              <p className={`text-sm leading-relaxed ${isCode ? "" : "text-muted-foreground"}`}>
                {tab.what}
              </p>
              <p className={`mt-auto text-sm ${isCode ? "" : "text-muted-foreground"}`}>
                <span className="font-head text-xs uppercase tracking-wide">Use it when: </span>
                {tab.useWhen}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
