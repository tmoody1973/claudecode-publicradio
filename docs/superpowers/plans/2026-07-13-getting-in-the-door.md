# Getting in the Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/install` page that gets a non-technical station person from "I have never opened a terminal" to "Claude is running and pointed at my folder" — and fixes module 1's now-false claim that Chat, Cowork and Code are three separate products.

**Architecture:** Every external fact lives in one Node-safe data module (`lib/install-facts.mjs`) with a source URL attached, so claims can be unit-tested and re-verified in one place. The page renders from that module, following the existing `/guide` pattern (a thin page composing section components). The module 1 correction reuses the course's existing `mindsetShiftsNote` mechanism rather than inventing one.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 (CSS-first, no config file) · RetroUI (Radix variant) · node:test

**Spec:** `docs/superpowers/specs/2026-07-13-getting-in-the-door-design.md`

## Global Constraints

- **Branch:** `feat/install-page`. All work in `course/`. **Never touch the repo-root `index.html`** — separate, older GitHub Pages site.
- **NO new npm dependencies.** NO new test framework — `node:test` + `assert/strict` only.
- **Route is `/install`, nav label is `Install`.** NOT `/start`: `/guide` already exists and is already labelled **"Start here"** (it covers how to use the *site*). Two "Start here" links is a coin toss for the reader.
- **RetroUI is the Radix variant:** `asChild`, not `render={}`. Sub-components are flat (`CardHeader`, not `Card.Header`). **There is no `<Text>` component.**
- **Flex/grid children need `min-w-0`** or long strings inflate the track past a 320px viewport. This has bitten this project three times.
- **Tap targets ≥ 44px** (`min-h-11`). **Never hardcode a hex colour** — tokens only, from `app/globals.css`.
- **`text-white` on `bg-destructive` is a dark-mode contrast failure (2.78:1).** Use `text-destructive-foreground`.
- **Guardrails go FIRST, never buried** (donor PII, unpublished journalism, FCC underwriting).
- **Voice:** plain English for a non-technical station person. Warm, concrete, never hypey. Translate jargon in the same breath.
- **EVERY external factual claim carries a source URL.** No claim without a link. The page's whole premise is "go check this yourself."
- **`npm run audit` NEEDS A LIVE SERVER ON :3000.** Start one (`npm start`) first, or it throws `ERR_CONNECTION_REFUSED` and reports phantom page failures. This has already misled two agents on this project.
- **Do not assert where Cowork is available.** Anthropic's rollout language dates from ~Feb 2026 and could not be verified. The page says: open the app and see whether **Cowork** appears next to **Chat**.

**THE VERIFIED FACTS (checked 2026-07-13 against Anthropic's official docs). Use these exact values; do not embellish, do not add facts:**

| Fact | Source |
|---|---|
| Chat, Cowork and Code are three **tabs inside one app**, not three products | https://claude.com/product/cowork |
| Download the app at `claude.com/download` (Mac, Windows, Linux) | https://claude.com/download |
| Claude Code in the desktop app: **"No terminal required."** | https://code.claude.com/docs/en/desktop-quickstart |
| **Mac needs macOS 13 (Ventura) or later** | https://code.claude.com/docs/en/setup |
| **Windows needs Git for Windows installed, or local sessions will not work** | https://code.claude.com/docs/en/desktop-quickstart |
| Git for Windows download (click-through installer, nothing to type) | https://git-scm.com/downloads/win |
| **WSL is NOT required for the desktop app** — only for the CLI path | https://code.claude.com/docs/en/setup |
| Requires **Pro, Max, Team or Enterprise**. **The free plan does not include Claude Code or Cowork.** | https://code.claude.com/docs/en/quickstart |
| Cowork runs its work in a temporary sandbox on Anthropic's servers; it reaches your machine only through folders you explicitly connect, and only while the desktop app is open | https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview |
| Getting started with Cowork | https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork |
| Using Cowork safely | https://support.claude.com/en/articles/13364135-use-claude-cowork-safely |
| Anthropic's own install troubleshooting (opens by telling non-technical users to use the desktop app instead of the CLI) | https://code.claude.com/docs/en/troubleshoot-install |

---

## File Structure

| File | Responsibility |
|---|---|
| `course/lib/install-facts.mjs` | **Create.** Every external claim + its source URL, in one place. Node-safe (no JSX/React) so `node:test` can test it. Same pattern as `lib/openui-spec.mjs`. |
| `course/lib/install-facts.d.mts` | **Create.** Types for the above (mirrors `lib/openui-spec.d.mts`). |
| `course/lib/install-facts.test.mjs` | **Create.** node:test — every claim has a source, every source is an absolute https URL. |
| `course/components/install/provenance.tsx` | **Create.** The "this is not from the video" banner + checked-on date. |
| `course/components/install/which-tab.tsx` | **Create.** Chat vs Cowork vs Code — three tabs, one app. |
| `course/components/install/prerequisites.tsx` | **Create.** Paid plan (no free path), macOS 13+, Git for Windows. |
| `course/components/install/platform-steps.tsx` | **Create.** Mac steps and Windows steps, plus the WSL dismissal. |
| `course/components/install/cowork-task.tsx` | **Create.** One real station task in Cowork. Guardrail FIRST. |
| `course/components/install/troubleshooting.tsx` | **Create.** Desktop-app failures only. |
| `course/app/install/page.tsx` | **Create.** Thin page composing the sections (mirrors `app/guide/page.tsx`). |
| `course/components/site-header.tsx` | **Modify.** Add `{ href: "/install", label: "Install" }` to `NAV`. |
| `course/content/modules/m1.json` | **Modify.** Fix the false "three things" claim; add `conceptsNote`. |
| `course/lib/course.ts` | **Modify.** Add `conceptsNote?: string` to the `CourseModule` type. |
| `course/scripts/compile-content.mjs` | **Modify.** Carry `conceptsNote` into the digest (mirror `mindsetShiftsNote`, ~line 178). |
| `course/app/modules/[slug]/page.tsx` | **Modify.** Render `conceptsNote` when present. |
| `course/scripts/audit.mjs` | **Modify.** Add `/install` to `PAGES`. |

---

## Task 1: The facts module (TDD)

**Files:**
- Create: `course/lib/install-facts.mjs`
- Create: `course/lib/install-facts.d.mts`
- Test: `course/lib/install-facts.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces, for Tasks 2–3:
  - `CHECKED_ON: string` — `"13 July 2026"`
  - `SOURCES: Record<string, string>` — keyed short names → absolute https doc URLs
  - `TABS: Array<{ name: string; what: string; useWhen: string }>`
  - `PREREQS: Array<{ label: string; detail: string; source: string }>`
  - `MAC_STEPS: Array<{ n: number; do: string; youWillSee: string }>`
  - `WINDOWS_STEPS: Array<{ n: number; do: string; youWillSee: string }>`
  - `TROUBLE: Array<{ symptom: string; cause: string; fix: string; source: string }>`

**Context you need:** This project has NO TypeScript test runner and NO new dependencies are allowed, so `node:test` can only test plain JS. `lib/openui-spec.mjs` + `lib/openui-spec.d.mts` is the established pattern for Node-safe logic that TypeScript consumers import. Follow it exactly. **No JSX, no React import in the `.mjs`.**

Putting every external claim in ONE module is the point: these facts rot, and when they do, there must be a single file to re-verify rather than seven components to grep.

- [ ] **Step 1: Write the failing tests**

Create `course/lib/install-facts.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHECKED_ON,
  SOURCES,
  TABS,
  PREREQS,
  MAC_STEPS,
  WINDOWS_STEPS,
  TROUBLE,
} from "./install-facts.mjs";

test("every source is an absolute https URL", () => {
  for (const [key, url] of Object.entries(SOURCES)) {
    assert.ok(url.startsWith("https://"), `${key} is not https: ${url}`);
    assert.doesNotThrow(() => new URL(url), `${key} is not a valid URL: ${url}`);
  }
});

test("every prerequisite cites a source that exists in SOURCES", () => {
  const known = new Set(Object.values(SOURCES));
  for (const p of PREREQS) {
    assert.ok(p.source, `prerequisite "${p.label}" has no source`);
    assert.ok(known.has(p.source), `prerequisite "${p.label}" cites an unknown source`);
  }
});

test("every troubleshooting row cites a source that exists in SOURCES", () => {
  const known = new Set(Object.values(SOURCES));
  for (const t of TROUBLE) {
    assert.ok(known.has(t.source), `"${t.symptom}" cites an unknown source`);
  }
});

test("the three tabs are named, and none of them is described as a separate product", () => {
  assert.deepEqual(TABS.map((t) => t.name), ["Chat", "Cowork", "Claude Code"]);
  const blob = JSON.stringify(TABS).toLowerCase();
  assert.ok(!/three products|separate product|three things/.test(blob));
});

test("the Windows path names Git — without it, local sessions silently fail", () => {
  // This is the single most valuable fact on the page. If it ever drops out, the page
  // stops solving the problem it exists to solve.
  const blob = JSON.stringify(WINDOWS_STEPS).toLowerCase();
  assert.ok(blob.includes("git"), "the Windows steps must tell people to install Git");
});

test("steps are numbered from 1, with no gaps", () => {
  for (const steps of [MAC_STEPS, WINDOWS_STEPS]) {
    steps.forEach((s, i) => assert.equal(s.n, i + 1));
  }
});

test("every step says what you will actually see", () => {
  for (const s of [...MAC_STEPS, ...WINDOWS_STEPS]) {
    assert.ok(s.youWillSee && s.youWillSee.length > 10, `step ${s.n} doesn't say what you'll see`);
  }
});

test("we never assert where Cowork is available", () => {
  // Anthropic's rollout language dates from ~Feb 2026 and could not be verified.
  // The page must say "open the app and look for the tab", never "it's live on X".
  const blob = JSON.stringify({ TABS, PREREQS, TROUBLE }).toLowerCase();
  assert.ok(!/rolling out|rollout|generally available|beta on/.test(blob));
});

test("CHECKED_ON is a real, human-readable date", () => {
  assert.match(CHECKED_ON, /^\d{1,2} \w+ \d{4}$/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd course && node --test lib/install-facts.test.mjs`
Expected: FAIL — `Cannot find module './install-facts.mjs'`

- [ ] **Step 3: Write the facts module**

Create `course/lib/install-facts.mjs`:

```js
/**
 * Every external claim the /install page makes, with the Anthropic doc it came from.
 *
 * WHY THIS FILE EXISTS: these facts are outside our control and they WILL rot — minimum
 * OS versions move, install paths change, plan names change. When that happens there must
 * be ONE file to re-verify, not seven components to grep. A confidently-stated stale step
 * is exactly the failure this site exists to warn people about.
 *
 * Checked against Anthropic's official docs on 13 July 2026.
 * Plain .mjs (no JSX, no React) so node:test can test it — same pattern as lib/openui-spec.mjs.
 */

export const CHECKED_ON = "13 July 2026";

export const SOURCES = {
  cowork: "https://claude.com/product/cowork",
  download: "https://claude.com/download",
  desktopQuickstart: "https://code.claude.com/docs/en/desktop-quickstart",
  setup: "https://code.claude.com/docs/en/setup",
  quickstart: "https://code.claude.com/docs/en/quickstart",
  coworkArchitecture:
    "https://support.claude.com/en/articles/14479288-claude-cowork-architecture-overview",
  coworkStart: "https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork",
  coworkSafely: "https://support.claude.com/en/articles/13364135-use-claude-cowork-safely",
  troubleshoot: "https://code.claude.com/docs/en/troubleshoot-install",
  gitForWindows: "https://git-scm.com/downloads/win",
};

/**
 * The thing the course currently gets wrong: these are not three products. They are three
 * tabs in one app. You download one thing.
 */
export const TABS = [
  {
    name: "Chat",
    what: "The claude.ai you already know — a conversation, nothing more.",
    useWhen: "You want to ask a question and read the answer.",
  },
  {
    name: "Cowork",
    what:
      "You describe the outcome you want. It goes away, does the whole job — often without you watching — and hands back the finished file.",
    useWhen:
      "You want a thing made: a document, a spreadsheet, a folder sorted out. You do not want to sit and watch it work.",
  },
  {
    name: "Claude Code",
    what:
      "It opens the real files on your computer and shows you every change before it makes it. You accept or reject each one.",
    useWhen:
      "You want to see and approve every step, working against your own files. This is what the rest of this course teaches.",
  },
];

export const PREREQS = [
  {
    label: "A paid Claude plan",
    detail:
      "Pro, Max, Team or Enterprise. There is no free path — the free claude.ai plan does not include Claude Code or Cowork. If you click Code and it asks you to upgrade, this is why.",
    source: SOURCES.quickstart,
  },
  {
    label: "On a Mac: macOS 13 (Ventura) or later",
    detail:
      "Anything older and the app will not start. Apple menu → About This Mac tells you which version you are on.",
    source: SOURCES.setup,
  },
  {
    label: "On Windows: Git, installed first",
    detail:
      "This is the one that stops people. Without Git installed, Claude Code's local sessions simply do nothing — the app looks broken and gives you no reason why. It is an ordinary click-through installer; there is nothing to type.",
    source: SOURCES.desktopQuickstart,
  },
];

export const MAC_STEPS = [
  {
    n: 1,
    do: "Go to claude.com/download and download the Mac version.",
    youWillSee: "A file lands in your Downloads folder.",
  },
  {
    n: 2,
    do: "Open it and drag Claude into your Applications folder, the way you would any Mac app.",
    youWillSee: "Claude appears in Applications and in Launchpad.",
  },
  {
    n: 3,
    do: "Open Claude and sign in with your paid Claude account.",
    youWillSee: "The app opens on a message box, with tabs above it.",
  },
  {
    n: 4,
    do: "Click the Code tab.",
    youWillSee:
      "It asks which folder to work in. If it asks you to upgrade instead, you are on the free plan.",
  },
  {
    n: 5,
    do: "Choose Local, then pick your folder — the station-work folder the course asks you to make.",
    youWillSee:
      "Claude is now pointed at that folder, and only that folder. You never opened a terminal.",
  },
];

export const WINDOWS_STEPS = [
  {
    n: 1,
    do: "Install Git for Windows FIRST, from git-scm.com/downloads/win. Click through the installer and accept the defaults.",
    youWillSee:
      "Nothing dramatic — no window to keep open, nothing to type. But without this step, step 5 will silently do nothing, and the app will look broken.",
  },
  {
    n: 2,
    do: "Go to claude.com/download and download the Windows version.",
    youWillSee: "An installer lands in your Downloads folder.",
  },
  {
    n: 3,
    do: "Run the installer, then open Claude and sign in with your paid Claude account.",
    youWillSee: "The app opens on a message box, with tabs above it.",
  },
  {
    n: 4,
    do: "Click the Code tab.",
    youWillSee:
      "It asks which folder to work in. If it asks you to upgrade instead, you are on the free plan.",
  },
  {
    n: 5,
    do: "Choose Local, then pick your folder — the station-work folder the course asks you to make.",
    youWillSee:
      "Claude is now pointed at that folder. If nothing happens at all, go back to step 1: Git is missing.",
  },
];

export const TROUBLE = [
  {
    symptom: "Clicking Code asks me to upgrade.",
    cause: "You are on the free plan.",
    fix: "Claude Code and Cowork need Pro, Max, Team or Enterprise. There is no free path.",
    source: SOURCES.quickstart,
  },
  {
    symptom: "I picked a folder on Windows and nothing happened.",
    cause: "Git is not installed.",
    fix: "Install Git for Windows, then reopen Claude and pick the folder again.",
    source: SOURCES.desktopQuickstart,
  },
  {
    symptom: "The app will not start on my Mac.",
    cause: "Your macOS is older than 13 (Ventura).",
    fix: "Update macOS, or use a newer machine.",
    source: SOURCES.setup,
  },
  {
    symptom: "I do not see a Cowork tab.",
    cause: "Cowork may not be switched on for your plan or your device yet.",
    fix: "Use the Code tab — it is what this course teaches, and it is the powerful one.",
    source: SOURCES.coworkStart,
  },
  {
    symptom: "A page somewhere told me I need WSL.",
    cause: "That is for the command-line version, which you are not using.",
    fix: "The desktop app does not need WSL. Ignore it.",
    source: SOURCES.setup,
  },
];
```

- [ ] **Step 4: Write the type declarations**

Create `course/lib/install-facts.d.mts`:

```ts
export const CHECKED_ON: string;
export const SOURCES: Record<string, string>;
export const TABS: { name: string; what: string; useWhen: string }[];
export const PREREQS: { label: string; detail: string; source: string }[];
export const MAC_STEPS: { n: number; do: string; youWillSee: string }[];
export const WINDOWS_STEPS: { n: number; do: string; youWillSee: string }[];
export const TROUBLE: { symptom: string; cause: string; fix: string; source: string }[];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd course && npm test`
Expected: all existing tests still pass, plus 9 new ones. **0 failures.**

(`package.json`'s `test` script already globs `lib/*.test.mjs` — no change needed.)

- [ ] **Step 6: Verify every source URL actually resolves**

The tests check the URLs are well-formed. They cannot check they are *real* — that needs the network, and a network call in a test is a flaky test. Do it once, by hand:

```bash
cd course && node -e "
const { SOURCES } = await import('./lib/install-facts.mjs');
for (const [k, url] of Object.entries(SOURCES)) {
  const r = await fetch(url, { redirect: 'follow' }).catch(e => ({ status: 'ERR ' + e.message }));
  console.log(String(r.status).padEnd(6), k.padEnd(20), url);
}
" --input-type=module
```

Expected: every line reports **200**. **A 404 on a page whose entire premise is "go check this yourself" is self-defeating.** If one fails, find the correct URL and fix it — do not ship a dead link.

- [ ] **Step 7: Commit**

```bash
git add course/lib/install-facts.mjs course/lib/install-facts.d.mts course/lib/install-facts.test.mjs
git commit -m "feat: the install facts, each with the doc it came from

These facts are outside our control and will rot. One file to re-verify beats
seven components to grep."
```

---

## Task 2: Fix module 1's false claim

**Files:**
- Modify: `course/content/modules/m1.json`
- Modify: `course/lib/course.ts` (the `CourseModule` type, near `mindsetShiftsNote?` at ~line 132)
- Modify: `course/scripts/compile-content.mjs` (~line 178, where `mindsetShiftsNote` is written into the digest)
- Modify: `course/app/modules/[slug]/page.tsx` (render the note)

**Interfaces:**
- Consumes: nothing.
- Produces: a `conceptsNote?: string` field on `CourseModule`, rendered on a module page and carried into the AI chat's digest.

**Context you need:**

`content/modules/m1.json` is the SOURCE OF TRUTH. `scripts/compile-content.mjs` compiles it into `content/course.json` and `content/digest.md` (the digest is what the chat's retriever grounds on), and this runs inside `prebuild`. **Never hand-edit `content/course.json`.**

The course already has exactly this mechanism: `mindsetShiftsNote` exists because the video's chapter is titled "12 mindset shifts" but the source only names 9, and the site says so rather than inventing three. **You are adding the same kind of note for the same kind of reason.** Read how `mindsetShiftsNote` is declared (`lib/course.ts`), compiled (`compile-content.mjs`), and rendered (`app/modules/[slug]/page.tsx:54-60`), and mirror it.

**Do not silently rewrite the source's claim into a correct one and move on.** The site's rule is: *"Where the source video is vague, wrong, or overstates something, say so."* The reader must be able to see that the video said one thing and the truth is now another.

- [ ] **Step 1: Correct the concept and add the note in `content/modules/m1.json`**

Find the concept with `"term": "Chat vs. Cowork vs. Code"`. Replace its `plain` value, and add a `conceptsNote` key at the TOP LEVEL of the module object (a sibling of `concepts`, not inside it — mirroring `mindsetShiftsNote`).

The concept's new `plain`:

```
"Chat, Cowork and Claude Code are three tabs inside one app — you download one thing. Chat is the claude.ai you already know. Cowork does a whole job for you and hands back the finished file. Claude Code opens the real files on your computer and shows you every change before it makes it. None of the three needs a terminal."
```

The new top-level `conceptsNote`:

```
"The video calls these three separate products. As of July 2026 they are not — they are three tabs inside the one Claude desktop app, and you install a single thing to get all three. We checked Anthropic's documentation on 13 July 2026. This matters more here than it would for a developer: the video's wording implies you must go and choose a different product, when in fact you download one app and click a different tab."
```

Leave `stationTranslation`, `tLabel` and `t` on the concept untouched — the timestamp still points at the right moment in the video.

- [ ] **Step 2: Add the field to the type**

In `course/lib/course.ts`, in the `CourseModule` type, beside the existing `mindsetShiftsNote?: string;`:

```ts
  conceptsNote?: string;
```

- [ ] **Step 3: Carry it into the digest**

In `course/scripts/compile-content.mjs`, near line 157 (`for (const c of m.concepts)`) — after the concepts loop finishes, add:

```js
    if (m.conceptsNote) lines.push(`IMPORTANT CORRECTION TO THESE CONCEPTS: ${m.conceptsNote}`);
```

This matters: the digest is what the AI chat grounds on. If the note is not in the digest, the **chat will keep telling people there are three products** even after the page is fixed.

- [ ] **Step 4: Render it on the module page**

In `course/app/modules/[slug]/page.tsx`, find where concepts are rendered. After the concepts block, add a note callout when `mod.conceptsNote` is present. Match the existing visual treatment used for `mindsetShiftsNote` (read lines 54–60 and follow that shape — do NOT invent a new style).

Use tokens, not hex. If you use a destructive/warning background, remember `text-destructive-foreground`, never `text-white`.

- [ ] **Step 5: Rebuild the content and verify the correction is really there**

```bash
cd course && npm run gen:content
grep -c "three tabs" content/course.json     # expect >= 1
grep -c "IMPORTANT CORRECTION" content/digest.md   # expect 1
grep -c "three separate products" content/digest.md # expect 1 — the note names what the video said
```

Then confirm the false claim is gone:

```bash
grep -c "Anthropic makes three things" content/course.json   # expect 0
```

- [ ] **Step 6: Typecheck and test**

Run: `cd course && npx tsc --noEmit && npm test`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add course/content/modules/m1.json course/content/course.json course/content/digest.md course/lib/course.ts course/scripts/compile-content.mjs course/app/modules/\[slug\]/page.tsx
git commit -m "fix: Chat, Cowork and Code are three tabs, not three products

The video calls them three products and the course faithfully translated that.
It is no longer true. Flagged with a note rather than silently rewritten — the
same way the course already flags '12 mindset shifts' that are actually 9.

The note goes into the digest too, or the chat keeps saying three products."
```

---

## Task 3: The `/install` page

**Files:**
- Create: `course/components/install/provenance.tsx`
- Create: `course/components/install/which-tab.tsx`
- Create: `course/components/install/prerequisites.tsx`
- Create: `course/components/install/platform-steps.tsx`
- Create: `course/components/install/cowork-task.tsx`
- Create: `course/components/install/troubleshooting.tsx`
- Create: `course/app/install/page.tsx`

**Interfaces:**
- Consumes: everything exported from `lib/install-facts.mjs` (Task 1).
- Produces: the route `/install`. Task 4 links to it and adds it to the audit.

**Context you need:**

**Mirror `app/guide/page.tsx`.** Read it first. It is a thin page that composes section components from `components/guide/*` — `BeforeYouTouch`, `Orientation`, `Paths`, `UseCasePattern`. Your page is the same shape. Do not invent a new page architecture.

Read `components/guide/before-you-touch.tsx` for the house style of a section component and of a guardrail block.

These are **server components** — no `"use client"` unless a section genuinely needs interactivity. None of them does.

**Section order is not arbitrary. It is the order a frightened person needs:**

1. `Provenance` — the honesty note, first, before any instruction.
2. `WhichTab` — because the answer changes what you click (and reveals you only install one thing).
3. `Prerequisites` — the walls, before someone hits them.
4. `PlatformSteps` — Mac, then Windows.
5. `CoworkTask` — the alternative, made concrete.
6. `Troubleshooting` — last, because it is a reference, not a read.

- [ ] **Step 1: The provenance banner**

Create `course/components/install/provenance.tsx`. It renders, prominently (this is not a footnote):

> **This page is not from the video.**
> The video does not cover installation — it assumes you are already set up. We wrote this from Anthropic's own documentation, checked on **{CHECKED_ON}**. Every fact below links to the page it came from, so if something has changed since, you can see for yourself.

Import `CHECKED_ON` from `@/lib/install-facts.mjs`. **Do not hardcode the date in JSX** — it lives in one place so it can be updated in one place.

- [ ] **Step 2: Which tab**

Create `course/components/install/which-tab.tsx`. Map over `TABS`. Lead with the headline fact, in plain words:

> **You install one app. It has three tabs. None of them needs a terminal.**

Then a card per tab: name, what it is, when to use it. Make clear that **Claude Code is what the rest of the course teaches**.

At 320px this must not overflow — if you use a grid or flex, put `min-w-0` on the children.

- [ ] **Step 3: Prerequisites**

Create `course/components/install/prerequisites.tsx`. Map over `PREREQS`. Each renders its `label`, its `detail`, and a link to its `source` (an `<a>` with `target="_blank"` and `rel="noopener noreferrer"`, `min-h-11`).

**Give the Windows/Git item visual weight.** It is the single most valuable fact on this page — without it, the app appears broken and the person gives up, and no other content on this site ever reaches them.

- [ ] **Step 4: Platform steps**

Create `course/components/install/platform-steps.tsx`. Two clearly separated blocks — **On a Mac** and **On Windows** — rendering `MAC_STEPS` and `WINDOWS_STEPS`. Each step shows its number, what to do, and **what you will see** (that second half is what makes a step trustworthy to someone who is nervous).

Then a short, plain paragraph dismissing WSL:

> **If you read the word "WSL" somewhere and panicked: ignore it.** WSL is only for the command-line version of Claude Code, which you are not using. The desktop app does not need it.

Link to `SOURCES.setup`.

Numbered steps: reuse the visual pattern from the `Steps` renderer in `lib/openui-library.tsx` (the numbered square) rather than inventing one.

- [ ] **Step 5: The Cowork task — guardrail FIRST**

Create `course/components/install/cowork-task.tsx`.

**The guardrail comes before the task, not after it.** Site convention, non-negotiable:

> **Before you connect a folder to Cowork.** Cowork does its work on Anthropic's servers, and reaches your computer only through the folders you explicitly connect — and only while the app is open. So connect a folder that holds nothing you would not read aloud on air. No donor names, no emails, no addresses, no giving history. If you would not put it in a press release, it does not go in that folder.

Link that claim to `SOURCES.coworkArchitecture` and `SOURCES.coworkSafely`.

Then ONE concrete station task, end to end. Cowork's model is different enough from Claude Code's that someone who has only seen the course's examples will not guess it: **you describe an outcome and walk away.** Write a real example — e.g. *"Take the four underwriting scripts in this folder and turn them into a one-page style sheet a new hire could follow"* — showing what you type and what comes back.

- [ ] **Step 6: Troubleshooting**

Create `course/components/install/troubleshooting.tsx`. Map over `TROUBLE`: symptom (in the person's own words), cause, fix, and a link to the source.

If you use a table, it MUST scroll inside its own `overflow-x: auto` container — the page body must never scroll horizontally at 320px.

- [ ] **Step 7: The page**

Create `course/app/install/page.tsx`, mirroring `app/guide/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Provenance } from "@/components/install/provenance";
import { WhichTab } from "@/components/install/which-tab";
import { Prerequisites } from "@/components/install/prerequisites";
import { PlatformSteps } from "@/components/install/platform-steps";
import { CoworkTask } from "@/components/install/cowork-task";
import { Troubleshooting } from "@/components/install/troubleshooting";

export const metadata: Metadata = {
  title: "Install — Claude Code for Public Media",
  description:
    "Get Claude running on a Mac or a Windows machine without opening a terminal — including the one Windows step nobody tells you about. Plus which of the three tabs you actually want.",
};

export default function InstallPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:pt-14">
        <p className="font-head text-xs uppercase tracking-widest text-muted-foreground">
          Before module 1
        </p>
        <h1 className="mt-3 font-head text-[2rem] uppercase leading-[1.05] tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
          Getting in the door
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          The course teaches you everything except how to start. This page fixes that. You will not
          open a terminal, you will not type a command, and there is exactly one step on Windows
          that nobody tells you about — it is below, and it is the reason most people give up.
        </p>
      </section>

      <Provenance />
      <WhichTab />
      <Prerequisites />
      <PlatformSteps />
      <CoworkTask />
      <Troubleshooting />

      {/* Bottom breathing room — the chat FAB lives bottom-right. */}
      <div className="h-20" aria-hidden />
    </>
  );
}
```

- [ ] **Step 8: Typecheck and build**

Run: `cd course && npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 9: LOOK AT IT. A typecheck is not evidence that a page works.**

```bash
cd course && npm start   # or npm run dev
```

Open `http://localhost:3000/install`. Then:
- Resize to **320px** wide. Scroll the whole page. **Is there any horizontal scroll?** If yes, the offender is a flex/grid child missing `min-w-0`, or a table without an `overflow-x: auto` wrapper.
- Check it in **both light and dark mode** (the theme toggle is in the header). No invisible text.
- Click every external link. Do they open the right Anthropic page?

Take a screenshot at 320px and at desktop width. **Look at them.** Describe what you actually see.

- [ ] **Step 10: Commit**

```bash
git add course/app/install course/components/install
git commit -m "feat: /install — get in the door without a terminal

Provenance first (this is not from the video), then which tab you actually
want, then the walls before you hit them. The Windows/Git step gets visual
weight: without it the app silently does nothing and the person gives up,
and nothing else on this site ever reaches them."
```

---

## Task 4: Wire it in

**Files:**
- Modify: `course/components/site-header.tsx` (the `NAV` array, ~line 11)
- Modify: `course/scripts/audit.mjs` (the `PAGES` array, ~line 18)
- Modify: `course/app/guide/page.tsx` (link to `/install`)
- Modify: `course/content/modules/m2.json` (the `tryThis.setup` currently assumes install)

**Interfaces:**
- Consumes: the `/install` route (Task 3), the `conceptsNote` mechanism (Task 2).
- Produces: nothing. This is the last task.

**Context you need:**

`NAV` in `components/site-header.tsx` currently reads:

```js
const NAV = [
  { href: "/guide", label: "Start here" },
  { href: "/walkthroughs", label: "Walkthroughs" },
  { href: "/modules", label: "Modules" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/cost", label: "What it costs" },
  { href: "/glossary", label: "Glossary" },
];
```

**`/guide` is already "Start here"** and it is about how to use the *site*. Do not rename it and do not add a second "Start here" — a reader facing two of them has to guess. Add `Install` and put it FIRST, because it comes first in real life.

- [ ] **Step 1: Add to the nav**

```js
const NAV = [
  { href: "/install", label: "Install" },
  { href: "/guide", label: "Start here" },
  { href: "/walkthroughs", label: "Walkthroughs" },
  { href: "/modules", label: "Modules" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/cost", label: "What it costs" },
  { href: "/glossary", label: "Glossary" },
];
```

**The nav now has 7 items.** Check the mobile menu at 320px still works and nothing overflows.

- [ ] **Step 2: Add `/install` to the audit**

In `course/scripts/audit.mjs`, in `PAGES` (~line 18), add `"/install"` after `"/"`.

- [ ] **Step 3: Link from `/guide`**

`/guide` tells people how to use the site. Someone who has not installed anything needs to be sent to `/install` first. Add a short, prominent line near the top of `app/guide/page.tsx` (or in `components/guide/before-you-touch.tsx`, whichever reads better once you have looked at both):

> **Not installed yet?** Start at [Install](/install) — it takes about ten minutes and you will not open a terminal.

Use `next/link`. `min-h-11` on the link.

- [ ] **Step 4: Fix module 2's setup, which currently assumes install**

`content/modules/m2.json`'s `tryThis.setup` begins *"Install the Claude desktop app and sign in with a paid Claude plan."* That sentence is the entire install coverage in the course today. Change it to point at the page that now actually teaches it:

```
"Install Claude first — see the Install page; it takes about ten minutes, you will not open a terminal, and on Windows there is one step nobody tells you about. Then make a folder on your machine (call it 'station-work'), and put ONE anonymized spreadsheet in it — a pledge-drive export with donor names, emails, addresses and phone numbers deleted before it ever leaves your CRM. Numbers only. Open Claude Code and point it at that folder."
```

Keep the donor-data guardrail sentence exactly as it is — do not weaken it.

- [ ] **Step 5: Rebuild content**

Run: `cd course && npm run gen:content`
Expected: clean. `content/course.json` and `content/digest.md` regenerate.

- [ ] **Step 6: Run every gate**

```bash
cd course
npm test          # node:test
npx tsc --noEmit
npm run build
```

Then, **with a live server**:

```bash
npm start &
# wait for it to answer on :3000
npm run audit
```

**`npm run audit` NEEDS A SERVER ON :3000.** Without one it throws `ERR_CONNECTION_REFUSED` and reports phantom failures — this has already misled two agents on this project. Expected: **all 22 pages clean at 320px** (the original 21 plus `/install`).

- [ ] **Step 7: Confirm the chat learned the correction**

The digest is what the AI chat grounds on. Ask it the question that used to get the wrong answer:

```bash
curl -sN localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"What is the difference between Chat, Cowork and Claude Code?"}]}' \
  | grep -o '"content":"[^"]*"' | sed 's/"content":"//' | tr -d '\n'
```

Read the answer. **It must not say they are three separate products.** If it does, the `conceptsNote` did not reach the digest — go back to Task 2, Step 3.

- [ ] **Step 8: Commit**

```bash
git add course/components/site-header.tsx course/scripts/audit.mjs course/app/guide/page.tsx course/content/modules/m2.json course/content/course.json course/content/digest.md
git commit -m "feat: wire /install into the nav, the guide, and module 2

Module 2's setup step was the course's entire install coverage: one sentence.
It now points at the page that teaches it."
```

---

## Notes for the reviewer

1. **Every external claim must carry a link, and the links must resolve.** Task 1 Step 6 checks them. A dead link on a page whose premise is "go verify this yourself" is worse than no page.
2. **The Windows/Git fact must be impossible to miss.** It is the difference between this page working and not working. If it reads as one bullet among six, push back.
3. **The chat must have learned the correction.** Task 4 Step 7 checks it. A fixed page and a chat still saying "three products" is worse than either alone — it makes the site contradict itself.
4. **`npm run audit` without a live server on :3000 reports phantom failures.** If a report claims pages fail, check the server was actually running before believing it.
