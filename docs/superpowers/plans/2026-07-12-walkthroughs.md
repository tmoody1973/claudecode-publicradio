# Step-by-Step Walkthroughs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give non-technical public media staff a step-by-step spine — install → first run → do the job → trust the output — anchored by real recorded Claude Code sessions.

**Architecture:** Content-first, exactly like the existing modules. Hand-authored JSON in `content/walkthroughs/`, validated by a pure validator module (unit-tested with `node:test`), compiled by a script into `content/walkthroughs.json`, consumed through a typed accessor `lib/walkthroughs.ts`. The centerpiece is a client component that replays a **real, recorded** Claude Code transcript turn by turn. Fifty light runbooks are agent-generated and merged into the existing `useCases` at compile time.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 (CSS-first, no config file), RetroUI (**Radix** variant, components already in `@/components/ui/*`), lucide-react, Playwright (audit only), `node:test` (built into Node 26 — no new dependency).

**Spec:** `docs/superpowers/specs/2026-07-12-walkthroughs-design.md`

## Global Constraints

> **Pre-flight decisions (binding — these supersede any conflicting text below).**
>
> 1. **Permission prompts must be REAL.** Sessions are recorded *interactively*, in a real
>    Claude Code session in default permission mode, so the prompts genuinely fire and get
>    captured. A `role: "permission"` turn may appear in a session **only if it was actually
>    recorded**. Never fabricate one — that would break the never-add rule, which is the
>    entire reason we chose recordings over scripts.
> 2. **No hardcoded hex in the terminal.** Define `--terminal-bg`, `--terminal-fg`,
>    `--terminal-dim`, `--terminal-chrome`, `--terminal-accent` in `app/globals.css`,
>    **identical in both light and dark themes** (a terminal is theme-invariant). Task 3's
>    example code shows raw hex; replace it with these tokens.
> 3. **Branch:** `feat/walkthroughs`.

- **Recording rule, absolute:** sessions are REAL recordings. We only ever **remove** turns. **Never add one.** Every session keeps ≥1 permission prompt (really captured — see decision 1) and ≥1 wrong-turn-plus-correction.
- **Sample data is always synthetic:** `sampleData.synthetic` is `true`, always. Names like `SAMPLE, Not-A-Real-Donor`, emails at `@example.invalid`, filenames containing `SYNTHETIC` and `do-not-upload`.
- **Guardrail goes FIRST**, at the top of every walkthrough — never below the fold, never behind a click.
- **Accessibility, hard requirement:** the replayed terminal renders **every** turn in the DOM at all times. Progressive reveal is *visual only*. Screen readers always get the full transcript.
- **Mobile floor:** zero horizontal page scroll at 320px; every tap target ≥44px (`min-h-11` / `size-11`); form inputs ≥16px font.
- **RetroUI is the Radix variant:** use `asChild`, NOT `render={}`. Accordion needs `type="single" collapsible`. `<Select>` has NO `items` prop. There is **no `<Text>` component**. Sub-components are flat (`CardHeader`, not `Card.Header`).
- **Tailwind v4:** no `tailwind.config.ts`. Tokens live in `app/globals.css`. Role colours come from `roleColor[slug]` + inline `style` — Tailwind cannot see `bg-role-${slug}`.
- **No new npm dependencies.** `node:test` and `playwright` (already present) cover everything.
- Never invent Claude Code features. If it isn't in the data or the recording, it doesn't go on the page.

---

## File Structure

**Create:**
- `course/scripts/lib/validate-walkthroughs.mjs` — pure validators (the only unit-tested logic)
- `course/scripts/lib/validate-walkthroughs.test.mjs` — `node:test` unit tests
- `course/scripts/compile-walkthroughs.mjs` — content/walkthroughs/*.json → content/walkthroughs.json
- `course/scripts/gen-sample-data.mjs` — writes the synthetic CSVs into `public/samples/`
- `course/lib/walkthroughs.ts` — types + accessors
- `course/content/walkthroughs/w1-first-30-minutes.json` … `w4-underwriting-copy.json`
- `course/content/walkthroughs/sessions/<slug>.json` — the recorded transcripts (kept separate so the recording artifact stays auditable)
- `course/content/runbooks/<useCaseId>.json` — 50 agent-generated runbooks
- `course/components/walkthrough/recorded-session.tsx` — **the terminal**
- `course/components/walkthrough/before-you-start.tsx`
- `course/components/walkthrough/walkthrough-steps.tsx`
- `course/components/walkthrough/verify-checks.tsx`
- `course/components/walkthrough/troubleshooting.tsx`
- `course/components/walkthrough/sample-data-card.tsx`
- `course/components/walkthrough/walkthrough-card.tsx`
- `course/app/walkthroughs/page.tsx`
- `course/app/walkthroughs/[slug]/page.tsx`
- `course/public/samples/*.csv` (generated)

**Modify:**
- `course/scripts/compile-content.mjs` — merge runbooks into `useCases`
- `course/lib/course.ts` — add `runbook` to `UseCase`
- `course/package.json` — add `test`, `gen:samples`, `gen:walkthroughs`; extend `prebuild`
- `course/scripts/audit.mjs` — add walkthrough routes + terminal a11y assert
- `course/components/site-header.tsx`, `site-footer.tsx` — nav
- `course/app/page.tsx` — hero CTA
- `course/app/modules/[slug]/page.tsx` — "Try this" becomes the doorway
- `course/components/use-cases/use-case-card.tsx` — runbook disclosure

---

## Task 1: Walkthrough validator + types

The validator is the only genuinely tricky logic, so it gets real TDD. Everything downstream (compile script, build gate) calls it.

**Files:**
- Create: `course/scripts/lib/validate-walkthroughs.mjs`
- Test: `course/scripts/lib/validate-walkthroughs.test.mjs`
- Modify: `course/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `validateWalkthrough(w, opts) -> string[]` (array of error messages; empty = valid). `opts = { sampleFileExists: (path) => boolean }`.
  - `validateRunbook(rb, useCaseId) -> string[]`
  - `TURN_ROLES = ["user", "assistant", "tool", "permission"]`

- [ ] **Step 1: Write the failing tests**

Create `course/scripts/lib/validate-walkthroughs.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateWalkthrough, validateRunbook } from "./validate-walkthroughs.mjs";

/** A minimal valid walkthrough. Tests mutate clones of this. */
function valid() {
  return {
    id: "w-membership-drive",
    slug: "pledge-drive-readout",
    tier: "flagship",
    title: "Turn a pledge-drive export into a board-ready readout",
    kicker: "Your first real file",
    roleSlug: "membership",
    moduleNumber: 2,
    estMinutes: 30,
    youWillNeed: ["Claude Code installed", "A folder on your machine"],
    guardrail: "Donor names, emails and addresses never leave your machine.",
    sampleData: {
      filename: "pledge-drive-SYNTHETIC-do-not-upload.csv",
      description: "A fake pledge export.",
      rows: 400,
      columns: ["donor_name", "gift_amount"],
      downloadPath: "/samples/pledge-drive-SYNTHETIC-do-not-upload.csv",
      synthetic: true,
    },
    steps: [
      { n: 1, title: "Make a folder", do: "Create a folder called station-work.", youWillSee: "An empty folder." },
    ],
    session: {
      cwd: "station-work",
      recordedOn: "2026-07-12",
      trimmed: true,
      trimNote: "Trimmed for length; nothing added.",
      turns: [
        { n: 1, role: "user", text: "Read the file." },
        { n: 2, role: "permission", text: "Allow Claude to read drive.csv?" },
        { n: 3, role: "assistant", text: "Actually, I misread that — correcting." },
      ],
    },
    verify: [{ check: "Row count matches", why: "Otherwise it read the wrong file", ifWrong: "Check the filename" }],
    troubleshooting: [{ symptom: "Nothing happens", cause: "Wrong folder", fix: "cd into station-work" }],
  };
}

const opts = { sampleFileExists: () => true };

test("a valid walkthrough produces no errors", () => {
  assert.deepEqual(validateWalkthrough(valid(), opts), []);
});

test("rejects a walkthrough with no guardrail", () => {
  const w = valid();
  w.guardrail = "";
  const errs = validateWalkthrough(w, opts);
  assert.ok(errs.some((e) => /guardrail/i.test(e)), errs.join("; "));
});

test("rejects a session with zero turns", () => {
  const w = valid();
  w.session.turns = [];
  assert.ok(validateWalkthrough(w, opts).some((e) => /at least one turn/i.test(e)));
});

test("rejects a trimmed session with no trimNote", () => {
  const w = valid();
  w.session.trimNote = "";
  assert.ok(validateWalkthrough(w, opts).some((e) => /trimNote/i.test(e)));
});

test("rejects a session missing recordedOn", () => {
  const w = valid();
  delete w.session.recordedOn;
  assert.ok(validateWalkthrough(w, opts).some((e) => /recordedOn/i.test(e)));
});

test("rejects an unknown turn role", () => {
  const w = valid();
  w.session.turns[0].role = "narrator";
  assert.ok(validateWalkthrough(w, opts).some((e) => /role/i.test(e)));
});

test("requires a permission prompt in the recording", () => {
  const w = valid();
  w.session.turns = w.session.turns.filter((t) => t.role !== "permission");
  assert.ok(validateWalkthrough(w, opts).some((e) => /permission/i.test(e)));
});

test("rejects sampleData that is not marked synthetic", () => {
  const w = valid();
  w.sampleData.synthetic = false;
  assert.ok(validateWalkthrough(w, opts).some((e) => /synthetic/i.test(e)));
});

test("rejects sampleData whose file is missing from public/", () => {
  const w = valid();
  const errs = validateWalkthrough(w, { sampleFileExists: () => false });
  assert.ok(errs.some((e) => /does not exist/i.test(e)), errs.join("; "));
});

test("the onboarding tier must NOT carry sampleData", () => {
  const w = valid();
  w.tier = "onboarding";
  w.roleSlug = null;
  assert.ok(validateWalkthrough(w, opts).some((e) => /onboarding/i.test(e)));
});

test("requires at least one verify check and one troubleshooting entry", () => {
  const w = valid();
  w.verify = [];
  w.troubleshooting = [];
  const errs = validateWalkthrough(w, opts);
  assert.ok(errs.some((e) => /verify/i.test(e)));
  assert.ok(errs.some((e) => /troubleshooting/i.test(e)));
});

test("a step must say what you will see", () => {
  const w = valid();
  w.steps[0].youWillSee = "";
  assert.ok(validateWalkthrough(w, opts).some((e) => /youWillSee/i.test(e)));
});

test("a step's sessionTurn must point at a real turn", () => {
  const w = valid();
  w.steps[0].sessionTurn = 99;
  assert.ok(validateWalkthrough(w, opts).some((e) => /sessionTurn/i.test(e)));
});

test("a runbook needs 5-8 steps and a verify line", () => {
  assert.deepEqual(validateRunbook({ steps: Array(6).fill("Do a thing"), verify: "Check it" }, "m1-uc1"), []);
  assert.ok(validateRunbook({ steps: Array(3).fill("x"), verify: "y" }, "m1-uc1").some((e) => /5-8/.test(e)));
  assert.ok(validateRunbook({ steps: Array(6).fill("x"), verify: "" }, "m1-uc1").some((e) => /verify/i.test(e)));
});
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
cd course && node --test scripts/lib/
```
Expected: FAIL — `Cannot find module './validate-walkthroughs.mjs'`

- [ ] **Step 3: Write the validator**

Create `course/scripts/lib/validate-walkthroughs.mjs`:

```js
/**
 * Pure validators for walkthrough content. No I/O — file existence is injected
 * via opts.sampleFileExists so this stays unit-testable.
 *
 * These run at BUILD TIME and throw. A walkthrough that lies to a station person
 * is worse than no walkthrough, so every rule here is a build failure, not a warning.
 */

export const TURN_ROLES = ["user", "assistant", "tool", "permission"];
const TIERS = ["onboarding", "flagship"];

export function validateWalkthrough(w, opts = {}) {
  const fileExists = opts.sampleFileExists ?? (() => true);
  const e = [];
  const id = w?.id ?? "(no id)";
  const at = (msg) => e.push(`${id}: ${msg}`);

  if (!w?.id) at("missing id");
  if (!w?.slug) at("missing slug");
  if (!TIERS.includes(w?.tier)) at(`tier must be one of ${TIERS.join(" | ")}`);
  if (!w?.title) at("missing title");
  if (typeof w?.moduleNumber !== "number" || w.moduleNumber < 1 || w.moduleNumber > 10) {
    at("moduleNumber must be an integer 1-10");
  }

  // The guardrail is the whole point. It goes first, and it is never optional.
  if (!w?.guardrail || !String(w.guardrail).trim()) at("missing guardrail — every walkthrough names one");

  if (!Array.isArray(w?.youWillNeed) || w.youWillNeed.length === 0) at("youWillNeed must list at least one prerequisite");

  // --- steps ---
  if (!Array.isArray(w?.steps) || w.steps.length === 0) {
    at("must have at least one step");
  } else {
    w.steps.forEach((s, i) => {
      if (!s.title) at(`step ${i + 1}: missing title`);
      if (!s.do) at(`step ${i + 1}: missing 'do' instruction`);
      // The fear-remover. A step that doesn't say what she'll see is the bug we're fixing.
      if (!s.youWillSee) at(`step ${i + 1}: missing youWillSee`);
    });
  }

  // --- session ---
  const s = w?.session;
  if (!s) {
    at("missing session — every walkthrough is a real recording");
  } else {
    if (!s.recordedOn) at("session: missing recordedOn");
    if (s.trimmed && !String(s.trimNote ?? "").trim()) {
      at("session: trimmed sessions must carry a visible trimNote");
    }
    if (!Array.isArray(s.turns) || s.turns.length === 0) {
      at("session: must have at least one turn");
    } else {
      s.turns.forEach((t, i) => {
        if (!TURN_ROLES.includes(t.role)) {
          at(`session turn ${i + 1}: role "${t.role}" is not one of ${TURN_ROLES.join(" | ")}`);
        }
        if (!String(t.text ?? "").trim() && !t.tool) {
          at(`session turn ${i + 1}: empty turn`);
        }
      });
      // We deliberately keep the scary moment in. If it's not there, we over-trimmed.
      if (!s.turns.some((t) => t.role === "permission")) {
        at("session: no permission prompt — keep one in; it's what a first-timer needs to see coming");
      }
    }

    // steps may point at turns; those pointers must resolve
    const turnCount = Array.isArray(s.turns) ? s.turns.length : 0;
    (w.steps ?? []).forEach((st, i) => {
      if (st.sessionTurn != null && (st.sessionTurn < 1 || st.sessionTurn > turnCount)) {
        at(`step ${i + 1}: sessionTurn ${st.sessionTurn} does not exist (session has ${turnCount} turns)`);
      }
    });
  }

  // --- sample data ---
  if (w?.tier === "onboarding" && w?.sampleData) {
    at("onboarding must NOT carry sampleData — it runs against a document the reader already has");
  }
  if (w?.sampleData) {
    const sd = w.sampleData;
    if (sd.synthetic !== true) at("sampleData.synthetic must be true — we never ship real station data");
    if (!sd.downloadPath) at("sampleData: missing downloadPath");
    else if (!fileExists(sd.downloadPath)) at(`sampleData: ${sd.downloadPath} does not exist in public/`);
    if (!Array.isArray(sd.columns) || sd.columns.length === 0) at("sampleData: must list its columns");
  }

  // --- trust + recovery ---
  if (!Array.isArray(w?.verify) || w.verify.length === 0) {
    at("must have at least one verify check — 'I don't trust it' is a failure mode we're fixing");
  } else {
    w.verify.forEach((v, i) => {
      if (!v.check) at(`verify ${i + 1}: missing check`);
      if (!v.why) at(`verify ${i + 1}: missing why`);
      if (!v.ifWrong) at(`verify ${i + 1}: missing ifWrong`);
    });
  }
  if (!Array.isArray(w?.troubleshooting) || w.troubleshooting.length === 0) {
    at("must have at least one troubleshooting entry");
  }

  return e;
}

export function validateRunbook(rb, useCaseId) {
  const e = [];
  const at = (msg) => e.push(`${useCaseId}: ${msg}`);
  if (!rb) return [`${useCaseId}: missing runbook`];
  if (!Array.isArray(rb.steps) || rb.steps.length < 5 || rb.steps.length > 8) {
    at(`runbook must have 5-8 steps (has ${rb.steps?.length ?? 0})`);
  }
  (rb.steps ?? []).forEach((s, i) => {
    if (!String(s ?? "").trim()) at(`runbook step ${i + 1} is empty`);
  });
  if (!String(rb.verify ?? "").trim()) at("runbook missing its verify line");
  return e;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd course && node --test scripts/lib/
```
Expected: PASS — 14 tests, 0 failures.

- [ ] **Step 5: Wire up `npm test`**

In `course/package.json`, add to `scripts`:

```json
"test": "node --test scripts/lib/"
```

Run `cd course && npm test` — expected PASS.

- [ ] **Step 6: Commit**

```bash
cd course && git add scripts/lib/ package.json
git commit -m "feat: walkthrough content validator

Build-time asserts, not warnings. A walkthrough that lies to a station person
is worse than no walkthrough. Enforces: the guardrail is never optional; every
walkthrough is a real recording with recordedOn; a trimmed session must carry a
visible trimNote; the permission prompt stays in (over-trimming sands off the
friction a first-timer needs to see coming); sample data is always synthetic and
its file must actually exist; every step says what you'll see."
```

---

## Task 2: Synthetic sample data

Three CSVs. The Membership one deliberately ships **with** fake PII columns — stripping them is step 1 of that walkthrough, so she learns the guardrail by performing it.

**Files:**
- Create: `course/scripts/gen-sample-data.mjs`
- Create (generated): `course/public/samples/*.csv`
- Modify: `course/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: three files in `public/samples/`, whose exact filenames the walkthrough JSON in Task 5 references:
  - `pledge-drive-SYNTHETIC-do-not-upload.csv`
  - `music-adds-SYNTHETIC.csv`
  - `underwriting-copy-SYNTHETIC.csv`

- [ ] **Step 1: Write the generator**

Create `course/scripts/gen-sample-data.mjs`:

```js
/**
 * Generates the synthetic station files the flagship walkthroughs practise on.
 *
 * Everything here is FAKE and must be unmistakably so:
 *   - names are literally "SAMPLE, Not-A-Real-Donor-###"
 *   - emails use @example.invalid (a reserved TLD — it can never route anywhere)
 *   - filenames say SYNTHETIC, and the donor file says do-not-upload
 *
 * The pledge file deliberately KEEPS the personal columns. Stripping them is
 * step 1 of the membership walkthrough: she learns the most important guardrail
 * in public media by performing it, locally, rather than reading a red box.
 *
 * Deterministic (seeded) so the file never churns in git.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "samples");
mkdirSync(OUT, { recursive: true });

// tiny deterministic PRNG — no Math.random, so the CSVs are stable across runs
let seed = 20260712;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const csv = (rows) =>
  rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";

/* ---------------------------------------------- 1. pledge drive (WITH fake PII) */
{
  const header = [
    "donor_name", "email", "street_address", "phone",   // <- the columns she must strip
    "gift_amount", "gift_date", "campaign_code", "donor_type", "sustainer", "premium",
  ];
  const campaigns = ["SPRING26-AM", "SPRING26-PM", "SPRING26-WEB", "SPRING26-MAIL"];
  const rows = [header];

  for (let i = 1; i <= 420; i++) {
    const day = int(1, 7);
    rows.push([
      `SAMPLE, Not-A-Real-Donor-${String(i).padStart(3, "0")}`,
      `not-a-real-donor-${i}@example.invalid`,
      `${int(100, 9999)} Example St, Anytown WI 5320${int(0, 9)}`,
      `555-01${String(int(0, 99)).padStart(2, "0")}`,
      pick([10, 15, 20, 25, 40, 50, 60, 75, 100, 120, 150, 250, 500, 1000]),
      `2026-03-0${day}`,
      pick(campaigns),
      pick(["new", "renewing", "renewing", "renewing", "lapsed-reactivated"]),
      rnd() < 0.38 ? "yes" : "no",
      pick(["none", "none", "tote", "mug", "tickets"]),
    ]);
  }
  writeFileSync(join(OUT, "pledge-drive-SYNTHETIC-do-not-upload.csv"), csv(rows));
  console.log(`✓ pledge-drive-SYNTHETIC-do-not-upload.csv — ${rows.length - 1} rows (fake PII included ON PURPOSE)`);
}

/* ------------------------------------------------------- 2. music adds candidates */
{
  const header = ["artist", "track", "label", "release_date", "local", "genre", "spins_last_week", "notes"];
  const rows = [header];
  const artists = [
    ["Klassik", "Milwaukee Sun", "Local", 1], ["Lex Allen", "Open Wide", "Local", 1],
    ["Abby Jeanne", "Neon Hymn", "Local", 1], ["B~Free", "Sideways", "Local", 1],
    ["Immortal Girlfriend", "Cold Static", "Local", 1], ["Nickel&Rose", "Half Light", "Local", 1],
    ["The Vanishing", "Paper Radio", "Sub Pop", 0], ["Marigold Fields", "Slow Bloom", "4AD", 0],
    ["Static Palace", "Overpass", "Merge", 0], ["Nightjar", "Tin Roof", "Dead Oceans", 0],
    ["Ruthie Blue", "Anyhow", "Anti-", 0], ["Wide Ocean", "Signal Fade", "Matador", 0],
  ];
  for (const [artist, track, label, local] of artists) {
    rows.push([
      artist, track, label, `2026-07-${String(int(1, 28)).padStart(2, "0")}`,
      local ? "yes" : "no", pick(["indie", "hip-hop", "soul", "electronic", "alt"]),
      int(0, 14), local ? "MKE artist — local content quota" : "",
    ]);
  }
  writeFileSync(join(OUT, "music-adds-SYNTHETIC.csv"), csv(rows));
  console.log(`✓ music-adds-SYNTHETIC.csv — ${rows.length - 1} rows`);
}

/* ----------------------------------------------------- 3. underwriting draft copy */
{
  const header = ["client", "spot_id", "length_sec", "draft_copy", "flight_start", "flight_end"];
  const rows = [
    header,
    // These drafts deliberately contain FCC violations for the red-team step to catch:
    // calls to action, price claims, and qualitative/comparative language.
    ["Example Dental Group", "UW-1001", 15, "Support comes from Example Dental Group. Call today for the best cleaning in Milwaukee — only $79!", "2026-08-01", "2026-08-31"],
    ["Anytown Books", "UW-1002", 30, "Support comes from Anytown Books, an independent bookseller on Example Street, offering new and used titles. Online at example.invalid.", "2026-08-01", "2026-09-15"],
    ["Sample Credit Union", "UW-1003", 15, "Sample Credit Union — switch now and get our unbeatable rates. Visit any branch this week!", "2026-08-05", "2026-08-25"],
    ["Placeholder Brewing", "UW-1004", 30, "Support for this station comes from Placeholder Brewing, a family-owned brewery in Anytown, serving lunch and dinner. Information at example.invalid.", "2026-09-01", "2026-09-30"],
  ];
  writeFileSync(join(OUT, "underwriting-copy-SYNTHETIC.csv"), csv(rows));
  console.log(`✓ underwriting-copy-SYNTHETIC.csv — ${rows.length - 1} rows (2 of 4 contain deliberate FCC violations)`);
}
```

- [ ] **Step 2: Generate and eyeball the files**

```bash
cd course && node scripts/gen-sample-data.mjs && head -3 public/samples/pledge-drive-SYNTHETIC-do-not-upload.csv
```

Expected: three `✓` lines, and a header row followed by rows like
`"SAMPLE, Not-A-Real-Donor-001",not-a-real-donor-1@example.invalid,...`

Confirm by eye: **no name looks real, and every email ends `@example.invalid`.**

- [ ] **Step 3: Verify determinism (the file must not churn in git)**

```bash
cd course && md5 -q public/samples/pledge-drive-SYNTHETIC-do-not-upload.csv > /tmp/a && \
  node scripts/gen-sample-data.mjs >/dev/null && \
  md5 -q public/samples/pledge-drive-SYNTHETIC-do-not-upload.csv > /tmp/b && \
  diff /tmp/a /tmp/b && echo "DETERMINISTIC ✓"
```
Expected: `DETERMINISTIC ✓`

- [ ] **Step 4: Add the script**

In `course/package.json` scripts, add:
```json
"gen:samples": "node scripts/gen-sample-data.mjs"
```

- [ ] **Step 5: Commit**

```bash
cd course && git add scripts/gen-sample-data.mjs public/samples/ package.json
git commit -m "feat: synthetic station sample data

Three fake station files to practise on. Everything is unmistakably fake:
names read 'SAMPLE, Not-A-Real-Donor-###', emails use the reserved
@example.invalid TLD which can never route, and filenames say SYNTHETIC.

The pledge export deliberately KEEPS its donor name/email/address/phone
columns. Stripping them is step 1 of the membership walkthrough — she learns
the most important guardrail in public media by performing it locally, not by
reading a red box about it.

The underwriting drafts deliberately contain FCC violations (calls to action,
price claims, comparative language) for the red-team step to catch.

Seeded PRNG, so the CSVs are byte-stable and don't churn in git."
```

---

## Task 3: The recorded-session terminal

The centerpiece. A neobrutalist terminal that replays a real transcript turn by turn.

**Files:**
- Create: `course/components/walkthrough/recorded-session.tsx`
- Create: `course/lib/walkthroughs.ts`

**Interfaces:**
- Consumes: `validateWalkthrough` shape from Task 1.
- Produces:
  - `lib/walkthroughs.ts` exports: types `Walkthrough`, `Step`, `RecordedSession`, `Turn`, `VerifyCheck`, `Trouble`, `SampleData`; and `walkthroughs`, `getWalkthrough(slug)`, `walkthroughForModule(n)`.
  - `<RecordedSession session={session} />`

- [ ] **Step 1: Write the types**

Create `course/lib/walkthroughs.ts`:

```ts
import raw from "@/content/walkthroughs.json";
import type { RoleSlug } from "@/lib/course";

export type TurnRole = "user" | "assistant" | "tool" | "permission";

export type Turn = {
  n: number;
  role: TurnRole;
  text: string;
  tool?: { name: string; arg: string; result: string };
};

export type RecordedSession = {
  cwd: string;
  turns: Turn[];
  recordedOn: string;
  trimmed: boolean;
  trimNote: string;
};

export type Step = {
  n: number;
  title: string;
  do: string;
  prompt?: string;
  youWillSee: string;
  sessionTurn?: number;
  note?: string;
};

export type SampleData = {
  filename: string;
  description: string;
  rows: number;
  columns: string[];
  downloadPath: string;
  synthetic: true;
};

export type VerifyCheck = { check: string; why: string; ifWrong: string };
export type Trouble = { symptom: string; cause: string; fix: string };

export type Walkthrough = {
  id: string;
  slug: string;
  tier: "onboarding" | "flagship";
  title: string;
  kicker: string;
  roleSlug: RoleSlug | null;
  moduleNumber: number;
  estMinutes: number;
  youWillNeed: string[];
  guardrail: string;
  sampleData?: SampleData;
  steps: Step[];
  session: RecordedSession;
  verify: VerifyCheck[];
  troubleshooting: Trouble[];
};

export const walkthroughs = raw as unknown as Walkthrough[];

export function getWalkthrough(slug: string): Walkthrough | undefined {
  return walkthroughs.find((w) => w.slug === slug);
}

/** The walkthrough that teaches a given module, if one exists. */
export function walkthroughForModule(moduleNumber: number): Walkthrough | undefined {
  return walkthroughs.find((w) => w.moduleNumber === moduleNumber);
}

export const onboarding = walkthroughs.find((w) => w.tier === "onboarding");
```

- [ ] **Step 2: Write the terminal component**

Create `course/components/walkthrough/recorded-session.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronRight, ShieldAlert, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecordedSession as Session, Turn } from "@/lib/walkthroughs";

/**
 * Replays a REAL recorded Claude Code session, one turn at a time.
 *
 * Why this exists: a non-technical person's core fear isn't "what do I type",
 * it's "what is going to HAPPEN when I press enter". Watching a real session
 * over someone's shoulder removes that fear in a way no prose can.
 *
 * ACCESSIBILITY, non-negotiable: every turn is in the DOM at all times. The
 * step-through is a VISUAL affordance only — future turns are dimmed and
 * inert, never removed. Screen-reader and keyboard users always get the whole
 * transcript, and `Show all` reveals it visually in one press.
 */
export function RecordedSession({ session }: { session: Session }) {
  const total = session.turns.length;
  const [shown, setShown] = useState(1);

  const atEnd = shown >= total;

  return (
    <figure className="retro-box-lg bg-[#1a1815]">
      {/* title bar */}
      <div className="flex items-center gap-2 border-b-2 border-border bg-[#3a352f] px-3 py-2">
        <Terminal className="size-4 shrink-0 text-[#ffdc58]" aria-hidden />
        <span className="truncate font-mono text-[12px] text-[#f5f0e6]">
          {session.cwd} — claude
        </span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-[#b8b1a3]">
          {Math.min(shown, total)} / {total}
        </span>
      </div>

      {/* transcript — ALL turns rendered, always */}
      <ol className="scroll-x space-y-3 p-3 sm:p-4">
        {session.turns.map((t, i) => (
          <TurnRow key={t.n} turn={t} hidden={i + 1 > shown} />
        ))}
      </ol>

      {/* controls */}
      <div className="flex flex-wrap gap-2 border-t-2 border-border bg-[#262320] p-2.5">
        <Button
          size="sm"
          className="min-h-11"
          onClick={() => setShown((s) => Math.min(s + 1, total))}
          disabled={atEnd}
        >
          <ChevronRight className="size-4" aria-hidden />
          {atEnd ? "End of session" : "Next turn"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 bg-background"
          onClick={() => setShown(atEnd ? 1 : total)}
        >
          {atEnd ? "Replay from the top" : "Show all turns"}
        </Button>
      </div>

      <figcaption className="border-t-2 border-border bg-card px-3 py-2">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-head text-[10px] uppercase tracking-wider text-foreground">
            Real recording ·{" "}
          </span>
          Captured {session.recordedOn}.{" "}
          {session.trimmed ? session.trimNote : "Shown in full."} Nothing was added.
        </p>
      </figcaption>
    </figure>
  );
}

function TurnRow({ turn, hidden }: { turn: Turn; hidden: boolean }) {
  // `hidden` dims and disables — it NEVER removes the turn from the DOM.
  const dim = hidden ? "opacity-25" : "opacity-100";

  if (turn.role === "user") {
    return (
      <li className={cn("transition-opacity", dim)}>
        <div className="flex gap-2">
          <span className="shrink-0 font-mono text-[13px] text-[#ffdc58]" aria-hidden>
            &gt;
          </span>
          <p className="min-w-0 [overflow-wrap:anywhere] font-mono text-[13px] leading-relaxed text-[#ffdc58]">
            <span className="sr-only">You typed: </span>
            {turn.text}
          </p>
        </div>
      </li>
    );
  }

  if (turn.role === "permission") {
    return (
      <li className={cn("transition-opacity", dim)}>
        <div className="retro-box border-destructive bg-destructive p-2.5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />
            <p className="min-w-0 [overflow-wrap:anywhere] text-[13px] leading-relaxed text-white">
              <span className="font-head text-[10px] uppercase tracking-wider">
                Claude is asking permission ·{" "}
              </span>
              {turn.text}
            </p>
          </div>
        </div>
      </li>
    );
  }

  if (turn.role === "tool") {
    return (
      <li className={cn("transition-opacity", dim)}>
        <div className="font-mono text-[12px] leading-relaxed text-[#b8b1a3]">
          <div className="[overflow-wrap:anywhere]">
            <span aria-hidden>⏺ </span>
            <span className="sr-only">Claude used a tool: </span>
            {turn.tool ? `${turn.tool.name}(${turn.tool.arg})` : turn.text}
          </div>
          {turn.tool?.result ? (
            <div className="[overflow-wrap:anywhere] pl-4 text-[#7d7669]">
              <span aria-hidden>└ </span>
              {turn.tool.result}
            </div>
          ) : null}
        </div>
      </li>
    );
  }

  // assistant
  return (
    <li className={cn("transition-opacity", dim)}>
      <p className="min-w-0 [overflow-wrap:anywhere] text-[13px] leading-relaxed text-[#f5f0e6]">
        <span className="sr-only">Claude replied: </span>
        {turn.text}
      </p>
    </li>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd course && git add lib/walkthroughs.ts components/walkthrough/recorded-session.tsx
git commit -m "feat: replayed-terminal component for recorded sessions

The centerpiece. A non-technical person's core fear isn't 'what do I type',
it's 'what will HAPPEN when I press enter' — so we let her watch a real
session over someone's shoulder before she risks anything.

Accessibility is load-bearing here: every turn is in the DOM at all times.
The step-through dims future turns, it never removes them, so screen-reader
and keyboard users always get the whole transcript.

The permission prompt gets its own loud treatment rather than being smoothed
over — it's the moment first-timers panic, and seeing it coming is the point."
```

---

## Task 4: Walkthrough page sections

The four supporting components + the page shell. Small, presentational, one responsibility each.

**Files:**
- Create: `course/components/walkthrough/before-you-start.tsx`
- Create: `course/components/walkthrough/sample-data-card.tsx`
- Create: `course/components/walkthrough/walkthrough-steps.tsx`
- Create: `course/components/walkthrough/verify-checks.tsx`
- Create: `course/components/walkthrough/troubleshooting.tsx`

**Interfaces:**
- Consumes: types from `lib/walkthroughs.ts` (Task 3); `<CopyPrompt label prompt />` from `@/components/copy-prompt`.
- Produces: `<BeforeYouStart w={...} />`, `<SampleDataCard data={...} />`, `<WalkthroughSteps steps={...} />`, `<VerifyChecks checks={...} />`, `<Troubleshooting items={...} />`

- [ ] **Step 1: Before-you-start (the guardrail, first)**

Create `course/components/walkthrough/before-you-start.tsx`:

```tsx
import { Check, ShieldAlert } from "lucide-react";
import type { Walkthrough } from "@/lib/walkthroughs";

/** The guardrail is stated BEFORE the work, not after. If she can't honour it,
 *  she should stop now — not discover that when she's already holding the output. */
export function BeforeYouStart({ w }: { w: Walkthrough }) {
  return (
    <div className="grid gap-4 [&>*]:min-w-0 md:grid-cols-2">
      <div className="retro-box bg-card p-4">
        <h3 className="font-head text-sm uppercase tracking-wide">You&apos;ll need</h3>
        <ul className="mt-3 space-y-2">
          {w.youWillNeed.map((n, i) => (
            <li key={i} className="flex gap-2 text-[14px] leading-relaxed">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="retro-box bg-destructive p-4 text-white">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 shrink-0" aria-hidden />
          <h3 className="font-head text-sm uppercase tracking-wide">
            The line you don&apos;t cross
          </h3>
        </div>
        <p className="mt-3 text-[14px] font-medium leading-relaxed">{w.guardrail}</p>
        <p className="mt-3 text-[12px] leading-relaxed text-white/80">
          If you can&apos;t hold this line, stop here and pick a different job. That is a
          real answer, and it is better than the alternative.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Sample-data card**

Create `course/components/walkthrough/sample-data-card.tsx`:

```tsx
import { Download, FlaskConical } from "lucide-react";
import type { SampleData } from "@/lib/walkthroughs";

export function SampleDataCard({ data }: { data: SampleData }) {
  return (
    <div className="retro-box bg-accent p-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-5 shrink-0" aria-hidden />
        <h3 className="font-head text-sm uppercase tracking-wide">
          Practise on this — it&apos;s fake
        </h3>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed">{data.description}</p>

      <p className="mt-2 text-[13px] leading-relaxed">
        {data.rows.toLocaleString()} rows. Every name is invented and every email
        address ends in <code className="font-mono">@example.invalid</code>, which can
        never reach a real person. Use this, not a real export, while you&apos;re
        learning.
      </p>

      <div className="scroll-x mt-3">
        <div className="flex w-max gap-1.5">
          {data.columns.map((c) => (
            <span
              key={c}
              className="border-2 border-border bg-background px-2 py-1 font-mono text-[11px] whitespace-nowrap"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <a
        href={data.downloadPath}
        download
        className="retro-box retro-lift mt-4 inline-flex min-h-11 items-center gap-2 bg-background px-4 font-head text-[12px] uppercase tracking-wide no-underline"
      >
        <Download className="size-4" aria-hidden />
        Download {data.filename}
      </a>
    </div>
  );
}
```

- [ ] **Step 3: Steps**

Create `course/components/walkthrough/walkthrough-steps.tsx`:

```tsx
import { Eye } from "lucide-react";
import { CopyPrompt } from "@/components/copy-prompt";
import type { Step } from "@/lib/walkthroughs";

export function WalkthroughSteps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-6">
      {steps.map((s) => (
        <li key={s.n} className="retro-box bg-card p-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center border-2 border-border bg-primary font-head text-base text-black"
              aria-hidden
            >
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-head text-base leading-snug">
                <span className="sr-only">Step {s.n}: </span>
                {s.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed">{s.do}</p>

              {s.prompt ? (
                <div className="mt-3">
                  <CopyPrompt label="Type this" prompt={s.prompt} />
                </div>
              ) : null}

              {/* The fear-remover. Every step tells her what's about to appear. */}
              <div className="mt-3 flex items-start gap-2 border-t-2 border-border pt-3">
                <Eye className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p className="text-[14px] leading-relaxed">
                  <span className="font-head text-[10px] uppercase tracking-wider">
                    What you&apos;ll see ·{" "}
                  </span>
                  {s.youWillSee}
                </p>
              </div>

              {s.note ? (
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {s.note}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Verify + troubleshooting**

Create `course/components/walkthrough/verify-checks.tsx`:

```tsx
import { SearchCheck } from "lucide-react";
import type { VerifyCheck } from "@/lib/walkthroughs";

/** "I got output and I don't trust it" is a real failure mode. This is the fix. */
export function VerifyChecks({ checks }: { checks: VerifyCheck[] }) {
  return (
    <ul className="space-y-3">
      {checks.map((c, i) => (
        <li key={i} className="retro-box bg-card p-4">
          <div className="flex items-start gap-2.5">
            <SearchCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-head text-[15px] leading-snug">{c.check}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                {c.why}
              </p>
              <p className="mt-2 border-t-2 border-border pt-2 text-[14px] leading-relaxed">
                <span className="font-head text-[10px] uppercase tracking-wider">
                  If it&apos;s wrong ·{" "}
                </span>
                {c.ifWrong}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

Create `course/components/walkthrough/troubleshooting.tsx`:

```tsx
import type { Trouble } from "@/lib/walkthroughs";

export function Troubleshooting({ items }: { items: Trouble[] }) {
  return (
    <ul className="space-y-3">
      {items.map((t, i) => (
        <li key={i} className="retro-box bg-card p-4">
          <p className="font-head text-[15px] leading-snug">{t.symptom}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
            <span className="font-head text-[10px] uppercase tracking-wider text-foreground">
              Why ·{" "}
            </span>
            {t.cause}
          </p>
          <p className="mt-2 text-[14px] leading-relaxed">
            <span className="font-head text-[10px] uppercase tracking-wider">Fix · </span>
            {t.fix}
          </p>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd course && git add components/walkthrough/
git commit -m "feat: walkthrough section components

Five beats, one component each. The guardrail renders FIRST, in red, above the
work — if she can't hold the line she should stop before she starts, not after
she's holding the output. Every step carries a 'what you'll see' line, which is
the whole fear-removal mechanism."
```

---

## Task 5: Author the four walkthroughs + record the real sessions

**This is the long pole and the crown jewel.** It is a content task, not a coding task.

**Files:**
- Create: `course/content/walkthroughs/w1-first-30-minutes.json`
- Create: `course/content/walkthroughs/w2-pledge-drive-readout.json`
- Create: `course/content/walkthroughs/w3-music-adds-prep.json`
- Create: `course/content/walkthroughs/w4-underwriting-red-team.json`
- Create: `course/content/walkthroughs/sessions/<slug>.json` × 4
- Create: `course/scripts/compile-walkthroughs.mjs`
- Modify: `course/package.json`

**Interfaces:**
- Consumes: `validateWalkthrough` (Task 1), sample filenames (Task 2), the `Walkthrough` type (Task 3).
- Produces: `content/walkthroughs.json` — the array `lib/walkthroughs.ts` imports.

- [ ] **Step 1: Record the sessions FOR REAL**

For each of the four, in a scratch directory outside the repo:

1. Copy the relevant synthetic CSV from `course/public/samples/` into a folder named `station-work`.
2. Actually run Claude Code there and do the job for real:
   - **w1 (onboarding):** point it at a folder holding one ordinary document; ask it to summarise it.
   - **w2:** strip the PII columns from the pledge CSV, then produce a board-ready readout.
   - **w3:** read the music adds CSV; prep a ranked adds-meeting brief flagging local artists.
   - **w4:** read the underwriting CSV; red-team each spot against FCC rules (no calls to action, no price or qualitative claims).
3. Capture the transcript verbatim.

**Then trim, under the absolute rule: remove only. Never add.**

Keep in every recording:
- at least one **permission prompt** (`role: "permission"`)
- at least one **wrong turn and its correction** — this is not optional. A first-timer who never sees Claude get something wrong will think she broke it when it happens to her.

Write each to `course/content/walkthroughs/sessions/<slug>.json`:

```json
{
  "cwd": "station-work",
  "recordedOn": "2026-07-12",
  "trimmed": true,
  "trimNote": "Trimmed for length. Turns were removed, never added or reworded.",
  "turns": [
    { "n": 1, "role": "user", "text": "There's one spreadsheet in this folder — our last pledge drive. Read it and tell me exactly what columns it has. Don't change anything yet." },
    { "n": 2, "role": "permission", "text": "Claude wants to read pledge-drive-SYNTHETIC-do-not-upload.csv. Allow?" },
    { "n": 3, "role": "tool", "text": "", "tool": { "name": "Read", "arg": "pledge-drive-SYNTHETIC-do-not-upload.csv", "result": "420 rows, 10 columns" } },
    { "n": 4, "role": "assistant", "text": "It has 10 columns. Four of them are personal: donor_name, email, street_address, phone. The other six are the ones you actually need..." }
  ]
}
```

- [ ] **Step 2: Author the four walkthrough JSON files**

Each must satisfy every rule in Task 1's validator. Shape (w2 shown; the other three follow the same schema — `tier: "onboarding"`, `roleSlug: null`, and **no `sampleData`** for w1):

```json
{
  "id": "w-membership-drive",
  "slug": "pledge-drive-readout",
  "tier": "flagship",
  "title": "Turn a pledge-drive export into a board-ready readout",
  "kicker": "No formulas. Nothing leaves your machine.",
  "roleSlug": "membership",
  "moduleNumber": 2,
  "estMinutes": 35,
  "youWillNeed": [
    "Claude Code installed and signed in (do the 30-minute walkthrough first if not)",
    "A folder on your machine called station-work",
    "The practice file below — do NOT use a real export while you're learning"
  ],
  "guardrail": "Donor names, emails, addresses and phone numbers never go to a cloud model. In this walkthrough you strip them yourself, on your own machine, in step 1 — before you ask Claude to analyse anything.",
  "sampleData": {
    "filename": "pledge-drive-SYNTHETIC-do-not-upload.csv",
    "description": "A fake pledge drive: 420 gifts across four campaign codes. It still has donor names, emails, addresses and phones in it — on purpose. Removing them is the first thing you'll do.",
    "rows": 420,
    "columns": ["donor_name", "email", "street_address", "phone", "gift_amount", "gift_date", "campaign_code", "donor_type", "sustainer", "premium"],
    "downloadPath": "/samples/pledge-drive-SYNTHETIC-do-not-upload.csv",
    "synthetic": true
  },
  "steps": [
    {
      "n": 1,
      "title": "Look before you touch",
      "do": "Ask Claude to read the file and tell you what's in it — without changing anything.",
      "prompt": "There is one spreadsheet in this folder — our last pledge drive. Read it and tell me exactly what columns it has, and how many rows. Don't change anything yet.",
      "youWillSee": "Claude will ask your permission to read the file. Say yes. It will then list the columns and the row count.",
      "sessionTurn": 1
    },
    {
      "n": 2,
      "title": "Strip the personal columns",
      "do": "Before any analysis, have Claude write a copy with the four personal columns removed. This happens on your machine.",
      "prompt": "Four of those columns are personal: donor_name, email, street_address, phone. Make me a NEW file called drive-numbers-only.csv with those four columns removed and everything else intact. Don't touch the original. Then tell me how many columns the new file has.",
      "youWillSee": "A new file appears in your folder. Claude will confirm it has 6 columns. The original is untouched.",
      "note": "This is the habit. Do it every single time, before you ask for anything else."
    }
  ],
  "verify": [
    {
      "check": "Open drive-numbers-only.csv and search it for an @ sign.",
      "why": "If any email survived the strip, the file is not safe to work with.",
      "ifWrong": "Delete the file and run step 2 again, naming the columns explicitly."
    },
    {
      "check": "The total in the readout matches the total in your CRM.",
      "why": "If the total is off, Claude read the wrong file or the wrong column — everything downstream is then wrong too.",
      "ifWrong": "Ask it to show its arithmetic: 'Show me the total and how you calculated it.'"
    }
  ],
  "troubleshooting": [
    {
      "symptom": "Claude says it can't find the file.",
      "cause": "It's looking in a different folder than the one the file is in.",
      "fix": "Ask it: 'What folder are you in, and what files can you see?' Then move the file there."
    },
    {
      "symptom": "It made up a number that looks plausible but is wrong.",
      "cause": "You asked for a conclusion before asking it to read the data.",
      "fix": "Always make it read first and summarise the columns, before you ask it to calculate anything."
    }
  ]
}
```

- [ ] **Step 3: Write the compile script**

Create `course/scripts/compile-walkthroughs.mjs`:

```js
/**
 * Merges content/walkthroughs/*.json + their sessions into content/walkthroughs.json,
 * validating everything. Fails the build on any violation — a walkthrough that lies
 * to a station person is worse than no walkthrough.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWalkthrough } from "./lib/validate-walkthroughs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "content", "walkthroughs");
const PUBLIC = join(__dirname, "..", "public");
const OUT = join(__dirname, "..", "content");

const files = readdirSync(SRC).filter((f) => /^w\d+-.*\.json$/.test(f)).sort();

const walkthroughs = files.map((f) => {
  const w = JSON.parse(readFileSync(join(SRC, f), "utf8"));
  const sessionPath = join(SRC, "sessions", `${w.slug}.json`);
  if (!existsSync(sessionPath)) {
    throw new Error(`${w.id}: no recorded session at content/walkthroughs/sessions/${w.slug}.json`);
  }
  w.session = JSON.parse(readFileSync(sessionPath, "utf8"));
  return w;
});

const sampleFileExists = (p) => existsSync(join(PUBLIC, p.replace(/^\//, "")));

const errors = walkthroughs.flatMap((w) => validateWalkthrough(w, { sampleFileExists }));
if (errors.length) {
  console.error("✗ Walkthrough validation failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

const onboarding = walkthroughs.filter((w) => w.tier === "onboarding");
if (onboarding.length !== 1) throw new Error(`Expected exactly 1 onboarding walkthrough, got ${onboarding.length}`);
if (walkthroughs.filter((w) => w.tier === "flagship").length !== 3) {
  throw new Error("Expected exactly 3 flagship walkthroughs");
}

writeFileSync(join(OUT, "walkthroughs.json"), JSON.stringify(walkthroughs, null, 2));
console.log(
  `✓ content/walkthroughs.json — ${walkthroughs.length} walkthroughs, ` +
    `${walkthroughs.reduce((n, w) => n + w.session.turns.length, 0)} recorded turns, ` +
    `${walkthroughs.reduce((n, w) => n + w.steps.length, 0)} steps`,
);
```

- [ ] **Step 4: Prove the validator actually bites**

Temporarily blank the `guardrail` in `w2-pledge-drive-readout.json`, then:

```bash
cd course && node scripts/compile-walkthroughs.mjs
```
Expected: exit 1, and `- w-membership-drive: missing guardrail — every walkthrough names one`

Restore the guardrail and re-run. Expected: the `✓` summary line.

- [ ] **Step 5: Wire into the build**

In `course/package.json`:
```json
"gen:walkthroughs": "node scripts/compile-walkthroughs.mjs",
"prebuild": "node scripts/gen-sample-data.mjs && node scripts/compile-content.mjs && node scripts/compile-walkthroughs.mjs && node scripts/gen-prompt.mjs"
```

- [ ] **Step 6: Commit**

```bash
cd course && git add content/walkthroughs/ content/walkthroughs.json scripts/compile-walkthroughs.mjs package.json
git commit -m "feat: four walkthroughs with real recorded sessions

Onboarding plus three flagships (membership, music, underwriting). The sessions
were ACTUALLY RUN against the synthetic data and captured — not scripted. Trimmed
for length under an absolute rule: turns were removed, never added or reworded.

Every recording keeps a permission prompt and at least one wrong turn plus its
correction. A first-timer who never sees Claude get something wrong will think
she broke it when it happens to her.

The compile step validates all of this and fails the build, not a warning."
```

---

## Task 6: Walkthrough pages

**Files:**
- Create: `course/app/walkthroughs/page.tsx`
- Create: `course/app/walkthroughs/[slug]/page.tsx`
- Create: `course/components/walkthrough/walkthrough-card.tsx`

**Interfaces:**
- Consumes: `walkthroughs`, `getWalkthrough` (Task 3); all five section components (Tasks 3–4).
- Produces: routes `/walkthroughs` and `/walkthroughs/[slug]`.

- [ ] **Step 1: The card**

Create `course/components/walkthrough/walkthrough-card.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { roleColor } from "@/lib/course";
import type { Walkthrough } from "@/lib/walkthroughs";

export function WalkthroughCard({ w }: { w: Walkthrough }) {
  return (
    <Link
      href={`/walkthroughs/${w.slug}`}
      className="retro-box retro-lift flex flex-col bg-card p-4 no-underline"
    >
      <div className="flex items-center gap-2">
        {w.roleSlug ? (
          <span
            className="border-2 border-border px-2 py-0.5 font-head text-[10px] uppercase tracking-wider text-black"
            style={{ background: roleColor[w.roleSlug] }}
          >
            {w.roleSlug}
          </span>
        ) : (
          <span className="border-2 border-border bg-primary px-2 py-0.5 font-head text-[10px] uppercase tracking-wider text-black">
            Start here
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[12px] text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {w.estMinutes} min
        </span>
      </div>

      <h3 className="mt-3 font-head text-base leading-snug">{w.title}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{w.kicker}</p>

      <p className="mt-3 flex items-center gap-1.5 font-head text-[11px] uppercase tracking-wide">
        {w.steps.length} steps · real recording
        <ArrowRight className="size-4" aria-hidden />
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: The index page**

Create `course/app/walkthroughs/page.tsx`:

```tsx
import type { Metadata } from "next";
import { WalkthroughCard } from "@/components/walkthrough/walkthrough-card";
import { walkthroughs } from "@/lib/walkthroughs";

export const metadata: Metadata = {
  title: "Walkthroughs",
  description:
    "Do it with us. Step-by-step walkthroughs with real recorded sessions and practice data you can download.",
};

export default function WalkthroughsPage() {
  const onboarding = walkthroughs.filter((w) => w.tier === "onboarding");
  const flagships = walkthroughs.filter((w) => w.tier === "flagship");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10">
      <h1 className="text-2xl uppercase tracking-tight sm:text-4xl">Do it with us</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed sm:text-base">
        Every walkthrough shows you a <strong>real recorded session</strong> — the actual
        thing running, permission prompts and wrong turns and all — before you try it
        yourself. The three job-specific ones come with fake station data you can practise
        on, so nothing real is ever at risk.
      </p>

      <section aria-labelledby="start" className="mt-10">
        <h2 id="start" className="font-head text-lg uppercase tracking-tight">
          Never opened a terminal? Start here.
        </h2>
        <div className="mt-4 grid gap-4 [&>*]:min-w-0 md:grid-cols-2">
          {onboarding.map((w) => (
            <WalkthroughCard key={w.id} w={w} />
          ))}
        </div>
      </section>

      <section aria-labelledby="jobs" className="mt-12">
        <h2 id="jobs" className="font-head text-lg uppercase tracking-tight">
          Then do a real job
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Three different muscles: working with files, researching and synthesising, and
          delegating a compliance check.
        </p>
        <div className="mt-4 grid gap-4 [&>*]:min-w-0 md:grid-cols-2 lg:grid-cols-3">
          {flagships.map((w) => (
            <WalkthroughCard key={w.id} w={w} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: The detail page**

Create `course/app/walkthroughs/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BeforeYouStart } from "@/components/walkthrough/before-you-start";
import { RecordedSession } from "@/components/walkthrough/recorded-session";
import { SampleDataCard } from "@/components/walkthrough/sample-data-card";
import { Troubleshooting } from "@/components/walkthrough/troubleshooting";
import { VerifyChecks } from "@/components/walkthrough/verify-checks";
import { WalkthroughSteps } from "@/components/walkthrough/walkthrough-steps";
import { getWalkthrough, walkthroughs } from "@/lib/walkthroughs";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return walkthroughs.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const w = getWalkthrough(slug);
  if (!w) return { title: "Not found" };
  return { title: w.title, description: w.kicker };
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12">
      <h2 id={`${id}-h`} className="text-xl uppercase tracking-tight sm:text-2xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function WalkthroughPage({ params }: Props) {
  const { slug } = await params;
  const w = getWalkthrough(slug);
  if (!w) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <p className="font-head text-[11px] uppercase tracking-widest text-muted-foreground">
        Walkthrough · {w.estMinutes} minutes · {w.steps.length} steps
      </p>
      <h1 className="mt-2 text-2xl uppercase tracking-tight sm:text-4xl">{w.title}</h1>
      <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground sm:text-lg">
        {w.kicker}
      </p>

      <Section id="before" title="Before you start">
        <BeforeYouStart w={w} />
        {w.sampleData ? (
          <div className="mt-4">
            <SampleDataCard data={w.sampleData} />
          </div>
        ) : null}
      </Section>

      <Section
        id="watch"
        title="Watch it happen first"
        subtitle="A real session, recorded. Press Next to step through it — including the bits where it asks permission, and the bit where it gets something wrong."
      >
        <RecordedSession session={w.session} />
      </Section>

      <Section id="steps" title="Now do it" subtitle="Each step tells you what you'll see.">
        <WalkthroughSteps steps={w.steps} />
      </Section>

      <Section
        id="verify"
        title="Check it before you trust it"
        subtitle="It will sound confident either way. That's why you check."
      >
        <VerifyChecks checks={w.verify} />
      </Section>

      <Section id="trouble" title="When it goes wrong">
        <Troubleshooting items={w.troubleshooting} />
      </Section>

      <Link
        href={`/modules/module-${w.moduleNumber}`}
        className="retro-box retro-lift mt-12 flex min-h-11 items-center gap-2 bg-primary p-4 no-underline"
      >
        <span className="font-head text-[13px] uppercase tracking-wide text-black">
          Understand why this works — Module {w.moduleNumber}
        </span>
        <ArrowRight className="ml-auto size-5 shrink-0 text-black" aria-hidden />
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Verify the routes render**

```bash
cd course && npm run build && npm run start &
sleep 8
for p in /walkthroughs /walkthroughs/pledge-drive-readout; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$p)"
done
```
Expected: `200` for both.

- [ ] **Step 5: Commit**

```bash
cd course && git add app/walkthroughs/ components/walkthrough/walkthrough-card.tsx
git commit -m "feat: /walkthroughs index and detail pages"
```

---

## Task 7: Fifty runbooks on the use cases

**Files:**
- Create: `course/content/runbooks/<useCaseId>.json` × 50
- Modify: `course/scripts/compile-content.mjs`
- Modify: `course/lib/course.ts`
- Modify: `course/components/use-cases/use-case-card.tsx`

**Interfaces:**
- Consumes: `validateRunbook` (Task 1); existing `useCases` from `content/course.json`.
- Produces: `UseCase.runbook?: { steps: string[]; verify: string; walkthroughSlug?: string }`

- [ ] **Step 1: Generate the runbooks with agents**

Dispatch parallel agents (the same method that produced the 10 modules). Each owns a batch of use cases and, for each, writes `course/content/runbooks/<useCase.id>.json`:

```json
{
  "steps": [
    "Export only the columns you need from your CRM — no names, emails, addresses or phone numbers.",
    "Put the file in a folder on your machine called station-work.",
    "Open Claude Code in that folder and ask it to read the file and list its columns.",
    "Ask for the specific summary you need, and tell it to show its arithmetic.",
    "Check the totals against your CRM before you use the numbers anywhere.",
    "Save the prompt as a Skill so the station owns it, not just you."
  ],
  "verify": "The totals match your CRM. If they don't, it read the wrong file or the wrong column.",
  "walkthroughSlug": "pledge-drive-readout"
}
```

Rules for the agents (hard):
- 5–8 steps, imperative, plain English, no jargon without translating it in the same breath.
- Step 1 is always the data-handling step when the use case touches member or source data.
- The `verify` line is the one check that actually matters — not a platitude.
- `walkthroughSlug` only when a flagship genuinely covers that job; otherwise omit it.
- Never invent a Claude Code feature. If it isn't in the module data, it doesn't go in.

- [ ] **Step 2: Merge and validate at compile time**

In `course/scripts/compile-content.mjs`, after the `useCases` array is built and before `writeFileSync`, add:

```js
import { validateRunbook } from "./lib/validate-walkthroughs.mjs";

// --- merge runbooks ---
const RUNBOOKS = join(__dirname, "..", "content", "runbooks");
const runbookErrors = [];

for (const uc of useCases) {
  const p = join(RUNBOOKS, `${uc.id}.json`);
  if (!existsSync(p)) {
    runbookErrors.push(`${uc.id}: missing runbook (content/runbooks/${uc.id}.json)`);
    continue;
  }
  const rb = JSON.parse(readFileSync(p, "utf8"));
  runbookErrors.push(...validateRunbook(rb, uc.id));
  uc.runbook = rb;
}

if (runbookErrors.length) {
  console.error("✗ Runbook validation failed:\n" + runbookErrors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${useCases.length} runbooks merged`);
```

Add `existsSync` to the `node:fs` import at the top of that file.

- [ ] **Step 3: Add the type**

In `course/lib/course.ts`, extend `UseCase`:

```ts
export type Runbook = {
  steps: string[];
  verify: string;
  walkthroughSlug?: string;
};

export type UseCase = {
  id: string;
  role: string;
  roleSlug: RoleSlug;
  title: string;
  scenario: string;
  howClaudeHelps: string;
  timeSaved: string;
  guardrail: string;
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
  runbook?: Runbook;
};
```

- [ ] **Step 4: Surface it on the use-case card**

In `course/components/use-cases/use-case-card.tsx`, add a native disclosure below the guardrail block (native `<details>` — keyboard-accessible for free, no JS, and it stays open when printed):

```tsx
{useCase.runbook ? (
  <details className="mt-3 border-t-2 border-border pt-3">
    <summary className="flex min-h-11 cursor-pointer items-center font-head text-[12px] uppercase tracking-wide">
      How to actually do this
    </summary>
    <ol className="mt-3 space-y-2">
      {useCase.runbook.steps.map((s, i) => (
        <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed">
          <span
            className="grid size-6 shrink-0 place-items-center border-2 border-border bg-primary font-head text-[11px] text-black"
            aria-hidden
          >
            {i + 1}
          </span>
          <span className="min-w-0">{s}</span>
        </li>
      ))}
    </ol>
    <p className="mt-3 border-t-2 border-border pt-2 text-[13px] leading-relaxed">
      <span className="font-head text-[10px] uppercase tracking-wider">Check it · </span>
      {useCase.runbook.verify}
    </p>
    {useCase.runbook.walkthroughSlug ? (
      <a
        href={`/walkthroughs/${useCase.runbook.walkthroughSlug}`}
        className="retro-box retro-lift mt-3 inline-flex min-h-11 items-center bg-primary px-3 font-head text-[11px] uppercase tracking-wide text-black no-underline"
      >
        Do the full walkthrough
      </a>
    ) : null}
  </details>
) : null}
```

- [ ] **Step 5: Verify the gate bites, then passes**

Delete one runbook file and run `npm run gen:content` — expected: exit 1 naming the missing use case. Restore it, re-run — expected `✓ 50 runbooks merged`.

- [ ] **Step 6: Commit**

```bash
cd course && git add content/runbooks/ scripts/compile-content.mjs lib/course.ts components/use-cases/use-case-card.tsx
git commit -m "feat: a runbook on every one of the 50 use cases

5-8 imperative steps plus the one check that actually matters, so nobody in any
of the nine station roles hits a dead end. Native <details> disclosure —
keyboard-accessible for free, no JS. Missing or malformed runbooks fail the build."
```

---

## Task 8: Wire it in, and gate it

**Files:**
- Modify: `course/components/site-header.tsx`, `course/components/site-footer.tsx`
- Modify: `course/app/page.tsx`
- Modify: `course/app/modules/[slug]/page.tsx`
- Modify: `course/scripts/audit.mjs`

- [ ] **Step 1: Nav**

In `site-header.tsx`, insert into `NAV` after `Start here`:
```ts
{ href: "/walkthroughs", label: "Walkthroughs" },
```
Add the same entry to the footer array in `site-footer.tsx`.

- [ ] **Step 2: Home CTA**

In `app/page.tsx`, change the primary hero CTA from `/modules/module-1` to the onboarding walkthrough:

```tsx
<Button asChild size="lg" className="min-h-11">
  <Link href="/walkthroughs/first-30-minutes">
    Do the first walkthrough
    <ArrowRight className="size-4" aria-hidden />
  </Link>
</Button>
```

(Keep the secondary "Find my role" CTA exactly as it is.)

- [ ] **Step 3: Module page — "Try this" becomes the doorway**

In `app/modules/[slug]/page.tsx`, inside the existing `try-this` Section, above the `<CopyPrompt>`, add:

```tsx
{walkthroughForModule(mod.number) ? (
  <Link
    href={`/walkthroughs/${walkthroughForModule(mod.number)!.slug}`}
    className="retro-box retro-lift mb-4 flex min-h-11 items-center gap-2 bg-primary p-4 no-underline"
  >
    <span className="font-head text-[13px] uppercase tracking-wide text-black">
      Rather be walked through it? Do this step by step, with a real recording
    </span>
    <ArrowRight className="ml-auto size-5 shrink-0 text-black" aria-hidden />
  </Link>
) : null}
```

Import `walkthroughForModule` from `@/lib/walkthroughs` and `Link` from `next/link`.

- [ ] **Step 4: Extend the audit — routes + the a11y rule that matters**

In `course/scripts/audit.mjs`, add the routes to `PAGES`:

```js
const PAGES = [
  "/",
  "/guide",
  "/walkthroughs",
  "/walkthroughs/first-30-minutes",
  "/walkthroughs/pledge-drive-readout",
  "/walkthroughs/music-adds-prep",
  "/walkthroughs/underwriting-red-team",
  "/modules",
  ...Array.from({ length: 10 }, (_, i) => `/modules/module-${i + 1}`),
  "/use-cases",
  "/cost",
  "/glossary",
];
```

Then add this check inside the `audit` function, just before the `return`, and include `terminalTurnsHidden` in the returned object:

```js
  // The replayed terminal MUST render every turn in the DOM. Progressive reveal is
  // visual only — a screen-reader user has to be able to read the whole transcript.
  let terminalTurnsHidden = 0;
  const term = document.querySelector("figure ol");
  if (term && document.querySelector('[aria-label*="turn"], figure')) {
    const lis = term.querySelectorAll("li");
    lis.forEach((li) => {
      const s = getComputedStyle(li);
      if (s.display === "none" || s.visibility === "hidden" || li.hasAttribute("hidden")) {
        terminalTurnsHidden++;
      }
    });
  }
```

And in the reporting loop, add:

```js
  if (r.terminalTurnsHidden > 0) {
    problems.push(`${r.terminalTurnsHidden} terminal turns removed from the a11y tree`);
  }
```

- [ ] **Step 5: Run the full gate**

```bash
cd course && npm test && npx tsc --noEmit && npm run build && npm run start &
sleep 8 && npm run audit
```

Expected:
- `npm test` — PASS
- `tsc` — exit 0
- build — `✓ Compiled successfully`, plus `✓ content/walkthroughs.json` and `✓ 50 runbooks merged`
- audit — `✓ All 20 pages clean at 320px.`

- [ ] **Step 6: Commit and deploy**

```bash
cd course && git add -A
git commit -m "feat: wire walkthroughs into nav, home CTA, and module pages

Home CTA is now 'Do the first walkthrough' — a result, not a reading assignment.
Each module's 'Try this' becomes a doorway into its walkthrough rather than a
lone prompt sitting in isolation.

Audit extended to the four walkthrough routes, plus a hard check that the
replayed terminal never removes a turn from the accessibility tree."

# secret check before anything leaves the machine
git diff HEAD~1 | grep -c "sk-or-" | xargs -I{} sh -c 'test {} -eq 0 && echo "✓ no key in diff" || (echo "✗ KEY IN DIFF — ABORT" && exit 1)'

vercel deploy --prod --yes
```

Then verify production: all 20 routes 200, and `npm run audit https://claude-code-public-media.vercel.app` is clean.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §1 Five beats | 4 (components), 5 (content) |
| §2 Three tiers | 5 (onboarding + 3 flagships), 7 (50 runbooks) |
| §3 Recorded session (+ the only-remove rule, permission prompt, a11y) | 1 (validator), 3 (component), 5 (recording), 8 (audit assert) |
| §4 Sample data teaches the guardrail by performing it | 2 (generator), 5 (w2 step 1) |
| §5 Data model | 1, 3, 7 |
| §6 IA (routes, nav, CTA, module doorway, use-case disclosure) | 6, 7, 8 |
| §7 Content production | 5 (hand-authored + recorded), 7 (agent-generated) |
| §8 Verification (compile asserts, audit, a11y) | 1, 5, 7, 8 |

No gaps.

**Placeholder scan:** none. Every code step contains the actual code; every command has an expected output.

**Type consistency:** `Walkthrough`, `Step`, `RecordedSession`, `Turn`, `VerifyCheck`, `Trouble`, `SampleData`, `Runbook` are defined once (Tasks 3 and 7) and referenced with identical names and shapes thereafter. `validateWalkthrough(w, opts)` and `validateRunbook(rb, id)` keep the signatures declared in Task 1 wherever they are called (Tasks 5 and 7). `session` is **required** on `Walkthrough` in both the type (Task 3) and the validator (Task 1), matching the spec's corrected rule. Sample filenames generated in Task 2 are the exact strings referenced in Task 5's JSON and Task 6's routes.
