# Step-by-step walkthroughs for non-technical public media staff

**Date:** 2026-07-12
**Status:** Approved, ready for implementation planning
**Site:** https://claude-code-public-media.vercel.app (`course/` in this repo)

---

## Problem

The site currently tells a station person *what* Claude Code can do. It does not
show them *how to do it*.

Today, a membership director who wants to act on Module 2 gets one dense paragraph:

> "Install the Claude desktop app and sign in with a paid Claude plan. Make a folder
> on your machine (call it 'station-work'), and put ONE anonymized spreadsheet in it
> — a pledge-drive export with donor names, emails, addresses and phone numbers
> deleted before it ever leaves your CRM. Numbers only. Open Claude Code and point it
> at that folder."

That is six unstated decisions compressed into one breath: what a folder path is, how
to "point it at" something, what she'll even see when it opens, and how she'd know it
worked. And the 50 use cases have **no steps at all** — only `scenario`,
`howClaudeHelps`, `timeSaved`, `guardrail`. There is nothing between "here is a good
idea" and "you are on your own."

### Where people actually quit

Confirmed with the user; all four are real, and they are stages of one journey:

1. **She never gets it open.** The terminal is an alien surface. Install, sign-in,
   folder paths, the first permission prompt.
2. **It's open and she's staring at a blinking cursor.** No idea what to type, how
   much to say, or what a good result looks like.
3. **She got output and doesn't trust it.** Is this right? Can I show the board? Did
   it invent numbers?
4. **She can't connect it to *her* job.** She read the use case, nodded, and still
   can't map it onto her Tuesday.

A walkthrough is therefore not a widget to bolt on. It is a **spine** running the
length of the journey: install → first run → do the job → trust the output.

---

## Design

### 1. The format — five beats, always in the same order

Every walkthrough, from the 30-minute onboarding down to a two-minute runbook, carries
the same five beats. **Predictability is the accessibility feature**: once you have
done one, you know the shape of all of them.

| Beat | Content | Failure it kills |
|---|---|---|
| **Before you start** | Literal prerequisites + the guardrail, stated *first* | "I'll break something" |
| **Do this** | Numbered steps. Each: the instruction, the prompt to copy, and **what you'll see** | blinking cursor |
| **Watch it happen** | The recorded session, replayed turn by turn | the terminal wall |
| **Check it** | Named checks: what to verify, why, what it means if it's wrong | "I don't trust it" |
| **When it goes wrong** | Real symptom → cause → fix | quitting at the first bump |

The guardrail goes at the **top**, not the bottom. If she cannot honour it, she should
stop before she starts — not discover that after the work.

### 2. Three tiers

**Tier 1 — one onboarding.** *"Your first 30 minutes."* Role-neutral. Install → open
it → point it at a folder → get one real result from a document she already has. Ends
in a win, risks nothing. This is the only walkthrough that assumes zero prior contact.

**Tier 2 — three flagships.** Each gets **downloadable synthetic sample data** and a
**real recorded session**:

| Flagship | Role | The muscle it builds |
|---|---|---|
| Pledge-drive export → board-ready readout | Membership | Local files, and PII discipline |
| New releases + venue calendars → adds-meeting prep | Music & Programming | Research and synthesis |
| Draft sponsor copy → red-team it against FCC rules | Underwriting | Delegation, and hard compliance |

These were chosen because they exercise three *different* skills, not because they are
the three most common jobs.

**News is deliberately not a flagship.** It still receives a light runbook like the
other 47, and the "verify before it airs" discipline is baked into every walkthrough's
*Check it* beat, so nothing is lost.

**Tier 3 — fifty light runbooks.** Every existing use case gains 5–8 imperative steps
plus the one check that matters. Agent-generated from data we already have, held to the
same guardrail rigor as the existing content. Ensures nobody in any of the nine station
roles hits a dead end.

### 3. The recorded session

This is the centerpiece and the reason the design works. A non-technical person's core
fear is not *"what do I type"* — it is *"what is going to happen when I press enter?"*

**Production rule, absolute: we only ever remove turns. We never add one.**

1. Generate synthetic station data (a script, so it is reproducible and obviously fake).
2. **Actually run Claude Code** against it, doing the real job.
3. Capture the real transcript — real tool calls, real output, real mistakes.
4. Trim for length. **Keep at least one permission prompt and one wrong turn plus its
   correction.** That friction is exactly what a nervous first-timer needs to see
   coming; a hand-written script would sand it off, she would hit it for real, and
   conclude she had broken something.
5. Label it visibly in the UI: *"Recorded 12 Jul 2026 · trimmed for length, nothing
   added."* Not buried in a footer.

This matters because the site's credibility already rests on not overstating things —
it refuses to claim "12 mindset shifts" when the source only names 9. Inventing AI
output would contradict that on the most prominent component we have.

**The component.** A neobrutalist terminal. `Next` advances one turn; `Show all` dumps
the transcript. Turn types are styled distinctly: user prompt, tool call
(`⏺ Read(file) └ 4,182 rows`), assistant text, and — called out in the destructive
colour — the permission prompt.

**Accessibility: every turn is in the DOM at all times.** Progressive reveal is
*visual only*. Screen-reader users always get the whole transcript. This is a hard
requirement, not a nice-to-have.

### 4. Sample data — teach the guardrail by performing it

The Membership sample pack ships the raw export **with** the PII columns still in it.
Step 1 of the walkthrough is then: *"Before anything else, make a stripped copy. Here
is the prompt."* Claude Code does it locally, on her machine.

She learns the most important guardrail in public media **by performing it**, not by
reading a red box about it.

The risk — that someone forms a casual habit with raw exports — is removed by making
the data unmistakably synthetic:

- Donor names like `SAMPLE, Not-A-Real-Donor`
- Emails at `@example.invalid` (a reserved TLD; it can never route)
- A header row and filename that say so: `pledge-drive-SYNTHETIC-do-not-upload.csv`

The copy states plainly that the file never leaves her machine — Claude Code reads it
locally. That is the entire point of the exercise.

### 5. Data model

New content, compiled by the same pipeline as the modules
(`content/walkthroughs/*.json` → `content/walkthroughs.json` → `lib/walkthroughs.ts`).

```ts
type Walkthrough = {
  id: string;                    // "w-membership-drive"
  slug: string;                  // "pledge-drive-readout"
  tier: "onboarding" | "flagship";
  title: string;
  kicker: string;
  roleSlug: RoleSlug | null;     // null for the onboarding
  moduleNumber: number;          // the module it teaches
  estMinutes: number;

  // Beat 1
  youWillNeed: string[];
  guardrail: string;
  sampleData?: SampleData;

  // Beat 2
  steps: Step[];

  // Beat 3 — required. Every Walkthrough (onboarding + all 3 flagships) is a real
  // recording. A walkthrough without one is just a list, which is what we already have.
  session: RecordedSession;

  // Beat 4
  verify: VerifyCheck[];

  // Beat 5
  troubleshooting: Trouble[];
};

type SampleData = {
  filename: string;
  description: string;
  rows: number;
  columns: string[];
  downloadPath: string;          // /samples/<file> in public/
  synthetic: true;               // always. asserted at compile time.
};

type Step = {
  n: number;
  title: string;                 // imperative, 3-8 words: "Make a folder"
  do: string;                    // literal instruction, plain English
  prompt?: string;               // copy-pasteable, when the step IS a prompt
  youWillSee: string;            // the fear-remover
  sessionTurn?: number;          // links this step to a turn in the recording
  note?: string;
};

type RecordedSession = {
  cwd: string;                   // "station-work"
  turns: Turn[];
  recordedOn: string;            // ISO date
  trimmed: boolean;
  trimNote: string;              // shown in the UI, not buried
};

type Turn = {
  n: number;
  role: "user" | "assistant" | "tool" | "permission";
  text: string;
  tool?: { name: string; arg: string; result: string };
};

type VerifyCheck = {
  check: string;                 // "The row count matches your CRM export"
  why: string;                   // "If it's off, it read the wrong file"
  ifWrong: string;
};

type Trouble = { symptom: string; cause: string; fix: string };
```

The 50 use cases gain one optional field:

```ts
type UseCase = {
  /* ...existing... */
  runbook?: {
    steps: string[];             // 5-8 imperative steps
    verify: string;              // the one check that matters
    walkthroughSlug?: string;    // link to a flagship, when one covers this job
  };
};
```

### 6. Information architecture

New routes: `/walkthroughs` (index) and `/walkthroughs/[slug]`.

Wiring into what exists:

- **Home CTA** changes from "Start with Module 1" → **"Do the first walkthrough."** A
  stronger promise: a result, not a reading assignment.
- **Each module's "Try this today"** becomes the doorway into its walkthrough rather
  than a lone prompt sitting in isolation.
- **Each use case card** gains an expandable *"How to actually do this"* holding its
  runbook, and a link to a flagship when one covers that job.
- **Nav** grows to six: Start here · **Walkthroughs** · Modules · Use cases · What it
  costs · Glossary.

### 7. Content production

- **Onboarding + 3 flagships:** hand-authored, with real recorded sessions. These are
  the crown jewels and cannot be delegated wholesale — the recording is the point.
- **50 runbooks:** agent-generated in parallel from existing use case + module data
  (the same method that produced the 10 modules), then validated by script.

### 8. Verification

Compile-time asserts (build fails, not a warning):

- every walkthrough — onboarding *and* all three flagships — has a `session` with ≥ 1 turn
- every session has `recordedOn` and, if `trimmed`, a `trimNote`
- only the three flagships carry `sampleData`; the onboarding deliberately does not
  (it runs against a document the reader already has)
- every walkthrough names a `guardrail` and has ≥ 1 `verify` and ≥ 1 `troubleshooting`
- every `sampleData.downloadPath` resolves to a file that actually exists in `public/`
- `sampleData.synthetic` is `true` — always
- every use case has a `runbook` with 5–8 steps

Runtime / browser:

- `npm run audit` extended to `/walkthroughs` and every `/walkthroughs/[slug]`:
  zero horizontal scroll at 320px, all tap targets ≥ 44px, no unnamed controls
- an explicit a11y assert that the terminal renders **every** turn in the DOM,
  regardless of how many are visually revealed

---

## Non-goals

- No live/interactive terminal that really executes anything. The session is a
  recording, not an emulator.
- No per-station customisation, accounts, or saved progress beyond the existing
  localStorage module tracking.
- No News flagship (see §2).
- No screenshots of Claude Code's UI — they go stale the moment Anthropic ships a
  change, they are heavy on a phone, and alt text cannot carry them.

## Risks

| Risk | Mitigation |
|---|---|
| **Recording four real sessions is the long pole** and will be messy — real sessions are long, repetitive, and occasionally fail | Budget real time for it. Trim aggressively but never add. If a session genuinely fails, that failure may be the most valuable thing we record. |
| 50 agent-generated runbooks read as filler | Validate at compile time; hold them to the same guardrail rigor as the existing 50 use cases, which did survive that bar. |
| The synthetic PII file teaches a bad habit | Unmistakably fake data (`@example.invalid`, `Not-A-Real-Donor`, filename says `do-not-upload`), plus copy stating the file never leaves the machine. |
| Progressive reveal hides content from screen readers | Hard requirement: all turns in DOM always; reveal is visual only. Asserted in the audit. |
| Nav bloat at six items | Mobile is a hamburger already; desktop fits six. Revisit only if a seventh appears. |
