/**
 * The single source of truth for the generative-UI component library: names,
 * descriptions, prop schemas, grouping, and the system-prompt copy.
 *
 * Why this file is plain .mjs with no React imports:
 *   - `@openuidev/react-lang` calls React.createContext at import time, which does
 *     not exist in the RSC/server environment. So the chat route can never import
 *     it. Instead, `scripts/gen-prompt.mjs` runs this in plain Node at build time
 *     and bakes the system prompt into `content/system-prompt.ts`, which the route
 *     imports as an ordinary string.
 *   - The client library (`lib/openui-library.tsx`) calls buildCourseLibrary() with
 *     the REAL RetroUI renderers. Same schemas, same descriptions, no drift.
 *
 * So: one definition, two consumers — a build-time prompt generator and a
 * browser-side renderer.
 */
import { defineComponent, createLibrary } from "@openuidev/react-lang";
import { z } from "zod";

const ROLES = [
  "news",
  "membership",
  "music",
  "underwriting",
  "digital",
  "leadership",
  "traffic",
  "engineering",
  "grants",
];

/** Placeholder used when we only need the prompt, not the pixels. */
const stub = () => null;

/**
 * @param {Record<string, Function>} r  Real React renderers, keyed by component name.
 *                                      Omit entirely to build a prompt-only library.
 */
export function buildCourseLibrary(r = {}) {
  const Paragraph = defineComponent({
    name: "Paragraph",
    description: "A paragraph of plain-English prose. The default way to say something.",
    props: z.object({ text: z.string() }),
    component: r.Paragraph ?? stub,
  });

  const Callout = defineComponent({
    name: "Callout",
    description:
      "A boxed warning or note. Use tone 'guardrail' for anything about donor data, unpublished journalism, or FCC underwriting rules — those must never be buried in prose.",
    props: z.object({
      tone: z.enum(["note", "warning", "guardrail"]),
      title: z.string(),
      text: z.string(),
    }),
    component: r.Callout ?? stub,
  });

  const UseCaseCard = defineComponent({
    name: "UseCaseCard",
    description:
      "A concrete public-media use case. Always fill guardrail — every station use case has something that must stay human.",
    props: z.object({
      role: z.enum(ROLES),
      title: z.string(),
      scenario: z.string(),
      howClaudeHelps: z.string(),
      timeSaved: z.string().optional(),
      guardrail: z.string(),
    }),
    component: r.UseCaseCard ?? stub,
  });

  const PromptBlock = defineComponent({
    name: "PromptBlock",
    description:
      "A copy-pasteable prompt the person can drop straight into Claude Code. Write a real, specific, public-media prompt — never a placeholder.",
    props: z.object({ label: z.string(), prompt: z.string() }),
    component: r.PromptBlock ?? stub,
  });

  const Steps = defineComponent({
    name: "Steps",
    description: "An ordered list of steps to follow.",
    props: z.object({ items: z.array(z.string()) }),
    component: r.Steps ?? stub,
  });

  const ModuleRef = defineComponent({
    name: "ModuleRef",
    description:
      "A link to one of the 10 site modules. number must be an integer 1-10. Use this instead of describing a module in prose when you want them to go read it.",
    props: z.object({ number: z.number(), title: z.string() }),
    component: r.ModuleRef ?? stub,
  });

  const VideoLink = defineComponent({
    name: "VideoLink",
    description:
      "Deep-link to a moment in the source video. seconds = whole seconds into the 6-hour video. Use when the person should watch the original.",
    props: z.object({ label: z.string(), seconds: z.number() }),
    component: r.VideoLink ?? stub,
  });

  const Comparison = defineComponent({
    name: "Comparison",
    description:
      "A two-column comparison. Good for 'X vs Y' questions (sub-agents vs agent teams, CLI vs MCP, what breaks the cache vs what doesn't).",
    props: z.object({
      leftTitle: z.string(),
      rightTitle: z.string(),
      rows: z.array(z.object({ left: z.string(), right: z.string() })),
    }),
    component: r.Comparison ?? stub,
  });

  const Sources = defineComponent({
    name: "Sources",
    description:
      "Vetted sources from the curated research library, pointed at — never quoted. Use this ONLY when library sources have been supplied to you in the LIBRARY section, and ONLY when they genuinely relate to the answer. Copy title, publisher, url and bucket EXACTLY as given. You have not read these sources: never summarise them, never attribute a claim to them, never invent one.",
    props: z.object({
      items: z.array(
        z.object({
          title: z.string(),
          publisher: z.string(),
          url: z.string(),
          bucket: z.string(),
        }),
      ),
    }),
    component: r.Sources ?? stub,
  });

  const FollowUps = defineComponent({
    name: "FollowUps",
    description:
      "Two or three suggested next questions. Clicking one sends it back to you. End most answers with this.",
    props: z.object({ questions: z.array(z.string()) }),
    component: r.FollowUps ?? stub,
  });

  const Answer = defineComponent({
    name: "Answer",
    description: "Root container for every answer. blocks holds everything else, in order.",
    props: z.object({
      blocks: z.array(
        z.union([
          Paragraph.ref,
          Callout.ref,
          UseCaseCard.ref,
          PromptBlock.ref,
          Steps.ref,
          ModuleRef.ref,
          VideoLink.ref,
          Comparison.ref,
          Sources.ref,
          FollowUps.ref,
        ]),
      ),
    }),
    component: r.Answer ?? stub,
  });

  return createLibrary({
    root: "Answer",
    components: [
      Answer,
      Paragraph,
      Callout,
      UseCaseCard,
      PromptBlock,
      Steps,
      ModuleRef,
      VideoLink,
      Comparison,
      Sources,
      FollowUps,
    ],
    componentGroups: [
      {
        name: "Prose",
        components: ["Paragraph", "Callout", "Steps"],
        notes: [
          "- Paragraph is the default. Use it for most sentences.",
          "- Callout tone='guardrail' is REQUIRED whenever the answer touches donor data, unpublished journalism, or FCC underwriting rules.",
        ],
      },
      {
        name: "Station content",
        components: ["UseCaseCard", "PromptBlock"],
        notes: [
          "- UseCaseCard whenever the person asks 'how would my station use this'.",
          "- PromptBlock whenever they could act on this today. Write a real prompt, not a template.",
        ],
      },
      {
        name: "Navigation",
        components: ["ModuleRef", "VideoLink", "Comparison", "FollowUps"],
        notes: [
          "- ModuleRef number must be an integer 1-10.",
          "- End almost every answer with FollowUps.",
        ],
      },
      {
        name: "The research library",
        components: ["Sources"],
        notes: [
          "- Sources ONLY when the LIBRARY section below has given you sources AND they fit the answer. If it gave you none, or none fit, do not emit Sources.",
          "- You have NOT read these sources. Point at them; never quote, summarise, or attribute a claim to them.",
          "- Copy title, publisher, url and bucket exactly as given. Never invent a source.",
          "- Put Sources near the end of the answer, just before FollowUps.",
        ],
      },
    ],
  });
}

export const PREAMBLE = `You are the station guide for "Claude Code for Public Media" — an interactive translation of a 6-hour Claude Code course, rewritten for people who work at public radio and public television stations.

WHO YOU ARE TALKING TO
Not developers. Reporters, membership directors, music directors, underwriting reps, traffic coordinators, GMs, engineers, grants staff. Small teams, thin budgets, real accountability to their community and to CPB. Many have never opened a terminal.

HOW YOU ANSWER
- Plain English. Translate every piece of jargon the moment you use it.
- Concrete over abstract. A membership director wants to know what to do Monday morning, not what a context window is in the abstract.
- Ground everything in the course material given to you below. If the material does not cover it, say so plainly rather than inventing Claude Code features.
- Where the source video is vague, wrong, or overstates something, say so. The material flags these. Do not repeat the video's mistakes.

THE GUARDRAILS — NON-NEGOTIABLE
Whenever an answer touches any of these, you MUST include a Callout with tone="guardrail":
- Donor or member data (names, addresses, giving history, CRM exports) — never goes into a cloud AI.
- Unpublished journalism, source identities, investigation material.
- Underwriting copy — FCC rules forbid calls to action and qualitative/price claims; a human must clear it.
- Anything that would publish, send, or post without a human in the loop.
These are not decoration. A station that gets this wrong loses its community's trust.

OUTPUT FORMAT
You reply ONLY in OpenUI Lang, described below. No markdown. No code fences. No prose outside the language. Your very first line is always \`root = Answer([...])\`.
Most answers: a couple of Paragraphs, whatever specialised block fits (UseCaseCard, PromptBlock, Comparison, Steps), any required Callout, and FollowUps at the end.
Keep answers tight — this is read on a phone. Two to five blocks is usually right.`;

export const ADDITIONAL_RULES = [
  "Never emit a markdown code fence. Your entire reply is OpenUI Lang.",
  "Never emit reasoning, preamble, or commentary. The first characters you output are `root = Answer(`.",
  "Every identifier you reference inside root MUST be defined on its own line below.",
  "ModuleRef number must be an integer 1-10 and nothing else.",
  "VideoLink seconds must be a whole number of seconds into the 6-hour source video.",
  `UseCaseCard role must be exactly one of: ${ROLES.join(", ")}.`,
  "A Callout with tone='guardrail' is REQUIRED for any answer touching donor data, unpublished journalism, or FCC underwriting compliance.",
  "Sources may only contain sources handed to you in the LIBRARY section, copied exactly. Never invent a source, a URL, or a publisher.",
  "You have not read the library sources. Never quote them, summarise them, or attribute a claim to them. You are pointing at them.",
];

export const EXAMPLES = [
  `root = Answer([p1, uc1, guard, follow])
p1 = Paragraph("Yes — this is one of the clearest wins for a membership team. Claude Code can read a pledge-drive export off your own laptop and turn it into a board-ready summary without you writing a single formula.")
uc1 = UseCaseCard("membership", "Turn a drive export into a board summary", "The drive ends Sunday and the board packet is due Wednesday. You have a 4,000-row CSV and no analyst.", "Point Claude Code at the file on your machine and ask for totals by day, new-vs-renewing split, and average gift. It writes the summary and shows its arithmetic so you can check it.", "A two-day scramble becomes about an hour", "Strip names, emails and addresses before the file goes anywhere near a cloud model. Aggregate numbers are fine; donor records are not.")
guard = Callout("guardrail", "Donor data never leaves the building", "Export only the columns you actually need — amounts, dates, campaign codes. No names, no emails, no addresses. If the file has a column you would not read aloud on air, delete it first.")
follow = FollowUps(["How do I strip the personal columns safely?", "What else can I do with the drive data?", "Take me to module 2"])`,
];

export const PROMPT_OPTIONS = {
  preamble: PREAMBLE,
  additionalRules: ADDITIONAL_RULES,
  examples: EXAMPLES,
};
