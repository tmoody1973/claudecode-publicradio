# Library Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The chat surfaces 2–4 vetted sources from Tarik's 292-source NotebookLM library alongside its course answer — as pointers it has openly not read, never as quoted citations.

**Architecture:** Two offline scripts (run by hand, never in CI) turn the notebook into a committed `content/library.json`. A synchronous in-process keyword scorer (`lib/library-search.mjs`, mirroring `lib/retrieval.ts`) picks the top hits per question. A new `Sources` OpenUI component renders them. The chat route gains one sync call and one conditional system block. **No database, no new npm dependency, no added chat latency.**

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 (CSS-first, no config file) · RetroUI (Radix variant) · OpenUI Lang · node:test · `notebooklm-py` CLI (offline only) · OpenRouter (offline bucket classification only)

**Spec:** `docs/superpowers/specs/2026-07-12-library-retrieval-design.md`

## Global Constraints

- **Branch:** `feat/library-retrieval`. All work happens in `course/`. **Never touch the repo-root `index.html`** — that is a separate, older GitHub Pages site.
- **NO new npm dependencies.** None. The spec's earlier `@neondatabase/serverless` exception was withdrawn along with the database.
- **NO new test framework.** `node:test` only, `assert/strict` only.
- **NEVER import `@openuidev/react-lang` in a server route or in `lib/library.ts`.** It calls `React.createContext` at import time, which does not exist in the RSC/server runtime.
- **A new component MUST be added to BOTH `lib/openui-spec.mjs` (Node-safe schema, no JSX) and `lib/openui-library.tsx` (`"use client"` renderer).** `scripts/gen-prompt.mjs` reads the spec, so the system prompt regenerates itself. Miss one file and they drift.
- **RetroUI is the Radix variant:** `asChild`, not `render={}`. Sub-components are flat (`CardHeader`, not `Card.Header`). **There is no `<Text>` component.**
- **Grid items default to `min-width: auto`** and will inflate the track past the viewport. Use `[&>*]:min-w-0`. This has bitten this project three times.
- **Never hardcode a hex colour.** Use tokens from `app/globals.css`.
- **`text-white` on `bg-destructive` is a dark-mode contrast failure (2.78:1).** Use `text-destructive-foreground`.
- **Tap targets ≥ 44px** (`min-h-11`) — `npm run audit` fails the build otherwise.
- **Neither new script joins the `prebuild` chain.** `export-library.mjs` needs Google cookie auth that does not exist on Vercel; `index-library.mjs` makes ~292 network calls. A network fetch inside a build is a flaky build.
- **Never invent a description for a source.** An LLM assigns *buckets* (a correctable label). An LLM never writes *descriptions* (an uncheckable claim). A failed fetch leaves `description: null` and `descriptionSource: "none"`.
- **Never silently drop a source.** All 292 stay in `library.json`. Scripts report coverage loudly and never round up.
- **Voice:** plain English for a non-technical station person. Warm, concrete, never hypey.

**Constants used across tasks (copy verbatim):**

```
NOTEBOOK_ID  = "da7c4315-35c1-448b-ae4c-bd65cc2026f4"
NOTEBOOK_URL = "https://notebooklm.google.com/notebook/da7c4315-35c1-448b-ae4c-bd65cc2026f4"
PANEL_PDF_URL = "https://tmoody1973.github.io/claudecode-publicradio/public-media-ai-panel.pdf"   (verified 200 application/pdf on 2026-07-12)
```

**The six buckets (slug → label). `other` exists so nothing is force-fitted:**

```
newsroom-policy → "Newsroom & editorial AI policy"
audience        → "Audience & personalisation"
production      → "Transcription & production tooling"
governance      → "Ethics & governance frameworks"
agents          → "AI agents in public media"
other           → "Other"
```

---

## File Structure

| File | Responsibility |
|---|---|
| `course/scripts/export-library.mjs` | **Create.** Shell out to the `notebooklm` CLI; write the raw snapshot. Network + auth, no logic. |
| `course/content/library-raw.json` | **Generate + commit.** The untouched export. 292 sources. |
| `course/scripts/lib/library-index.mjs` | **Create.** Pure, network-free helpers: title cleaning, publisher derivation, og-tag parsing, URL overrides, bucket validation. All the logic worth testing. |
| `course/scripts/lib/library-index.test.mjs` | **Create.** node:test for the above. |
| `course/scripts/index-library.mjs` | **Create.** The orchestrator: fetch og tags, classify buckets via OpenRouter, apply overrides, write `library.json`, print the coverage report. Impure by design; logic lives in the lib. |
| `course/content/library.json` | **Generate + commit.** The enriched library the app ships. |
| `course/lib/library-search.mjs` | **Create.** Pure synchronous scorer. Plain `.mjs` (not `.ts`) so `node:test` can test it with no framework — the exact pattern `lib/openui-spec.mjs` already uses. |
| `course/lib/library-search.d.mts` | **Create.** Types for the above, mirroring `lib/openui-spec.d.mts`. |
| `course/lib/library-search.test.mjs` | **Create.** node:test for scoring and the floor. |
| `course/lib/library.ts` | **Create.** Loads `library.json`, exposes `searchLibrary()` and `formatLibraryGrounding()`. The app's only entry point to the library. |
| `course/lib/openui-spec.mjs` | **Modify.** Add the `Sources` schema, its `Answer` union member, its group, and its rules. |
| `course/lib/openui-library.tsx` | **Modify.** Add the `Sources` RetroUI renderer. |
| `course/app/api/chat/route.ts` | **Modify.** Lines ~153 and ~157: one sync call, one conditional system block. |
| `course/package.json` | **Modify.** Extend the `test` glob to include `lib/*.test.mjs`; add `library:export` and `library:index` scripts. **Neither joins `prebuild`.** |

---

## Task 1: Export the notebook

**Files:**
- Create: `course/scripts/export-library.mjs`
- Modify: `course/package.json` (add `library:export` script)
- Generate + commit: `course/content/library-raw.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `content/library-raw.json`, shape `{ id: string, title: string, created_at: string, is_owner: boolean, sources: Array<{ type: "web_page"|"pdf"|"markdown", title: string, url?: string }> }`. Every later task reads this shape.

**Context you need:** The `notebooklm` CLI is already installed at `~/.local/bin/notebooklm` and already authenticated (verified: `notebooklm doctor` → all checks pass). `--quiet` is a **global** flag and must come *before* the subcommand — `notebooklm --quiet metadata`, not `notebooklm metadata --quiet`. This script runs on Tarik's machine only; it can never run on Vercel because auth is a Google cookie jar.

- [ ] **Step 1: Write the export script**

Create `course/scripts/export-library.mjs`:

```js
/**
 * Snapshot the public NotebookLM notebook's source list into content/library-raw.json.
 *
 * This is a SNAPSHOT, NOT A SYNC. Re-run it by hand when Tarik adds sources.
 *
 * It is deliberately NOT part of `prebuild`: the notebooklm CLI authenticates with a
 * Google cookie jar that does not exist on Vercel, and NotebookLM has no query API we
 * could depend on at runtime anyway. The committed JSON is what the site ships.
 *
 * Run: npm run library:export
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTEBOOK_ID = "da7c4315-35c1-448b-ae4c-bd65cc2026f4";
const CLI = join(homedir(), ".local", "bin", "notebooklm");

let raw;
try {
  raw = execFileSync(CLI, ["--quiet", "metadata", "-n", NOTEBOOK_ID, "--json"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  throw new Error(
    `notebooklm CLI failed. Is it installed and logged in? Try \`notebooklm doctor\` then \`notebooklm login\`.\n${err.message}`,
  );
}

const data = JSON.parse(raw);
if (data.error) throw new Error(`notebooklm returned an error: ${JSON.stringify(data)}`);

const sources = data.sources ?? [];
if (sources.length < 200) {
  throw new Error(
    `Only ${sources.length} sources came back. Expected ~292. Refusing to overwrite the snapshot with a partial export.`,
  );
}

writeFileSync(join(__dirname, "..", "content", "library-raw.json"), JSON.stringify(data, null, 2) + "\n");

const byType = sources.reduce((a, s) => ((a[s.type] = (a[s.type] ?? 0) + 1), a), {});
const noUrl = sources.filter((s) => !s.url).length;

console.log(`✓ content/library-raw.json — ${sources.length} sources`);
console.log(`  by type: ${JSON.stringify(byType)}`);
console.log(`  with no URL: ${noUrl}   (these get hand-mapped in index-library.mjs)`);
```

- [ ] **Step 2: Add the npm script**

In `course/package.json`, inside `"scripts"`, add:

```json
"library:export": "node scripts/export-library.mjs",
```

**Do NOT add it to `prebuild`, and do NOT rewrite `prebuild`.** It currently reads, and must still read, exactly:

```
"prebuild": "node scripts/gen-sample-data.mjs && node scripts/compile-content.mjs && node scripts/compile-walkthroughs.mjs && node scripts/gen-prompt.mjs"
```

This is the build chain of a live, deployed site. Leave it byte-for-byte alone. Your only change to `scripts` is adding your own key.

- [ ] **Step 3: Run it**

Run: `cd course && npm run library:export`
Expected output (numbers may drift up if Tarik added sources; they must not drop below 200):
```
✓ content/library-raw.json — 292 sources
  by type: {"web_page":266,"pdf":20,"markdown":6}
  with no URL: 8   (these get hand-mapped in index-library.mjs)
```

If the CLI errors with an auth failure, run `notebooklm login` and retry. **Do not work around it by hand-writing the JSON.**

- [ ] **Step 4: Commit**

```bash
git add course/scripts/export-library.mjs course/package.json course/content/library-raw.json
git commit -m "feat: snapshot the NotebookLM library source list

292 sources, {type,title,url} only. A snapshot, not a sync — the CLI needs
Google cookie auth, so this never runs in CI. The committed JSON is what ships."
```

---

## Task 2: The pure indexing helpers (TDD)

**Files:**
- Create: `course/scripts/lib/library-index.mjs`
- Test: `course/scripts/lib/library-index.test.mjs`

**Interfaces:**
- Consumes: the `library-raw.json` source shape from Task 1.
- Produces, for Task 3:
  - `BUCKETS: Record<string, string>` — the six slug→label pairs.
  - `NOTEBOOK_URL: string`, `PANEL_PDF_URL: string`
  - `cleanTitle(rawTitle: string, ogTitle?: string|null): string`
  - `publisherFromUrl(url: string): string`
  - `parseOgTags(html: string): { title: string|null, description: string|null, siteName: string|null }`
  - `resolveUrl(source: {title: string, url?: string}): { url: string, linkKind: "direct"|"notebook" }`
  - `isValidBucket(slug: string): boolean`

**Context you need:** These are pure functions with no network and no LLM, which is exactly why they are the only part unit-tested. The messy parts of the real data, measured from the live export:

- **12 of 292 titles are truncated** mid-sentence with a literal `...` — e.g. `"How BBC Eye built a multi-agent AI system to sift through ten ..."`. `og:title` repairs these.
- **165 of 292 carry a publisher suffix** — `" - Poynter"`, `"| Research.com"`, `" - ResearchGate"`. Strip it; it belongs in the `publisher` field.
- **8 have no URL at all.** One is `public-media-ai-panel.pdf` (hand-map to the live GitHub Pages URL). The other seven point at the public notebook.

- [ ] **Step 1: Write the failing tests**

Create `course/scripts/lib/library-index.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUCKETS,
  NOTEBOOK_URL,
  PANEL_PDF_URL,
  cleanTitle,
  publisherFromUrl,
  parseOgTags,
  resolveUrl,
  isValidBucket,
} from "./library-index.mjs";

test("cleanTitle strips a trailing publisher suffix", () => {
  assert.equal(cleanTitle("16 AI Governance Policy Examples - Madison AI"), "16 AI Governance Policy Examples");
  assert.equal(cleanTitle("2026 Best Agentic AI Courses | Research.com"), "2026 Best Agentic AI Courses");
});

test("cleanTitle keeps hyphens that are part of the title", () => {
  // Only a SHORT trailing segment is a publisher. A long one is prose.
  assert.equal(
    cleanTitle("Curating the Curators - a field guide to the people who map civic technology"),
    "Curating the Curators - a field guide to the people who map civic technology",
  );
});

test("cleanTitle prefers og:title when the export truncated the title", () => {
  assert.equal(
    cleanTitle(
      "How BBC Eye built a multi-agent AI system to sift through ten ...",
      "How BBC Eye built a multi-agent AI system to sift through ten thousand documents",
    ),
    "How BBC Eye built a multi-agent AI system to sift through ten thousand documents",
  );
});

test("cleanTitle ignores og:title when the export title is not truncated", () => {
  // og:title is often SEO junk. Only trust it to repair a truncation.
  assert.equal(cleanTitle("A perfectly good title", "Buy Now! A Perfectly Good Title | SEO Spam"), "A perfectly good title");
});

test("cleanTitle strips the (PDF) prefix", () => {
  assert.equal(cleanTitle("(PDF) Ethical guidelines for journalistic use of GenAI"), "Ethical guidelines for journalistic use of GenAI");
});

test("publisherFromUrl drops www and returns the host", () => {
  assert.equal(publisherFromUrl("https://www.poynter.org/a/b"), "poynter.org");
  assert.equal(publisherFromUrl("https://reutersinstitute.politics.ox.ac.uk/x"), "reutersinstitute.politics.ox.ac.uk");
});

test("publisherFromUrl on a bad URL returns empty string, never throws", () => {
  assert.equal(publisherFromUrl("not a url"), "");
});

test("parseOgTags reads og:title, og:description and og:site_name", () => {
  const html = `<html><head>
    <meta property="og:title" content="Real Title" />
    <meta property="og:description" content="A real description." />
    <meta property="og:site_name" content="Poynter" />
  </head></html>`;
  assert.deepEqual(parseOgTags(html), {
    title: "Real Title",
    description: "A real description.",
    siteName: "Poynter",
  });
});

test("parseOgTags falls back to the plain meta description", () => {
  const html = `<meta name="description" content="Fallback description.">`;
  assert.equal(parseOgTags(html).description, "Fallback description.");
});

test("parseOgTags decodes HTML entities", () => {
  const html = `<meta property="og:description" content="Ethics &amp; governance &quot;rules&quot;">`;
  assert.equal(parseOgTags(html).description, 'Ethics & governance "rules"');
});

test("parseOgTags returns nulls when there are no tags", () => {
  assert.deepEqual(parseOgTags("<html><body>nothing</body></html>"), {
    title: null,
    description: null,
    siteName: null,
  });
});

test("resolveUrl passes a real URL straight through", () => {
  assert.deepEqual(resolveUrl({ title: "Whatever", url: "https://npr.org/x" }), {
    url: "https://npr.org/x",
    linkKind: "direct",
  });
});

test("resolveUrl hand-maps the panel PDF to its live GitHub Pages URL", () => {
  assert.deepEqual(resolveUrl({ title: "public-media-ai-panel.pdf" }), {
    url: PANEL_PDF_URL,
    linkKind: "direct",
  });
});

test("resolveUrl sends every other URL-less source to the public notebook", () => {
  assert.deepEqual(resolveUrl({ title: "Orchestrating the Newsroom: The Rise of Agentic AI" }), {
    url: NOTEBOOK_URL,
    linkKind: "notebook",
  });
});

test("the six buckets are exactly the agreed set", () => {
  assert.deepEqual(Object.keys(BUCKETS).sort(), [
    "agents",
    "audience",
    "governance",
    "newsroom-policy",
    "other",
    "production",
  ]);
});

test("isValidBucket rejects anything an LLM might invent", () => {
  assert.equal(isValidBucket("governance"), true);
  assert.equal(isValidBucket("Governance"), false);
  assert.equal(isValidBucket("ethics-and-stuff"), false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd course && node --test scripts/lib/library-index.test.mjs`
Expected: FAIL — `Cannot find module './library-index.mjs'`

- [ ] **Step 3: Write the implementation**

Create `course/scripts/lib/library-index.mjs`:

```js
/**
 * Pure, network-free helpers for turning the raw NotebookLM export into the
 * library the site ships. All the logic worth testing lives here; the network and
 * the LLM live in scripts/index-library.mjs.
 *
 * The messy shape of the real export (measured, 2026-07-12, 292 sources):
 *   - 12 titles are truncated mid-sentence with "..." — og:title repairs them
 *   - 165 titles carry a publisher suffix (" - Poynter", "| Research.com")
 *   - 8 sources have no URL at all
 */

export const NOTEBOOK_URL =
  "https://notebooklm.google.com/notebook/da7c4315-35c1-448b-ae4c-bd65cc2026f4";

/** Already served by the repo-root GitHub Pages site. Verified 200 application/pdf. */
export const PANEL_PDF_URL =
  "https://tmoody1973.github.io/claudecode-publicradio/public-media-ai-panel.pdf";

/** `other` exists so nothing is ever force-fitted into a bucket it does not belong in. */
export const BUCKETS = {
  "newsroom-policy": "Newsroom & editorial AI policy",
  audience: "Audience & personalisation",
  production: "Transcription & production tooling",
  governance: "Ethics & governance frameworks",
  agents: "AI agents in public media",
  other: "Other",
};

export function isValidBucket(slug) {
  return Object.prototype.hasOwnProperty.call(BUCKETS, slug);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

function decodeEntities(s) {
  return s.replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? m);
}

/** The export truncates long titles with a literal "...". */
function isTruncated(title) {
  return /\.\.\.\s*$/.test(title) || /…\s*$/.test(title);
}

/**
 * Strip a trailing " - Publisher" / " | Publisher".
 * Only a SHORT trailing segment (≤ 4 words) is a publisher — a long one is prose.
 */
function stripPublisherSuffix(title) {
  const m = title.match(/^(.*\S)\s+[-|–—]\s+([^-|–—]{2,40})$/);
  if (!m) return title;
  const tail = m[2].trim();
  if (tail.split(/\s+/).length > 4) return title; // that's a subtitle, not a publisher
  return m[1].trim();
}

/**
 * @param {string} rawTitle  The export's title.
 * @param {string|null} [ogTitle]  og:title, if we fetched one.
 *
 * og:title is trusted ONLY to repair a truncation. Otherwise it is often SEO junk
 * ("Buy Now! …"), and the export's title — which is what Tarik saw when he vetted
 * the source — is the better one.
 */
export function cleanTitle(rawTitle, ogTitle = null) {
  const base = isTruncated(rawTitle) && ogTitle && ogTitle.trim() ? ogTitle : rawTitle;
  let t = decodeEntities(String(base).trim());
  t = t.replace(/^\(PDF\)\s*/i, "");
  t = stripPublisherSuffix(t);
  return t.trim();
}

export function publisherFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const metaRe = (attr, value) =>
  new RegExp(
    `<meta[^>]+${attr}\\s*=\\s*["']${value}["'][^>]*content\\s*=\\s*["']([^"']*)["']|` +
      `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*${attr}\\s*=\\s*["']${value}["']`,
    "i",
  );

function meta(html, attr, value) {
  const m = html.match(metaRe(attr, value));
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? "").trim();
  return raw ? decodeEntities(raw) : null;
}

/** Meta tags only. We never parse article bodies — see the spec. */
export function parseOgTags(html) {
  return {
    title: meta(html, "property", "og:title"),
    description:
      meta(html, "property", "og:description") ?? meta(html, "name", "description"),
    siteName: meta(html, "property", "og:site_name"),
  };
}

/**
 * Every one of the 292 sources must end up reachable. A pointer with nowhere to
 * point is a dead end, so the 8 URL-less sources are resolved by hand.
 */
export function resolveUrl(source) {
  if (source.url) return { url: source.url, linkKind: "direct" };
  if (source.title === "public-media-ai-panel.pdf") {
    return { url: PANEL_PDF_URL, linkKind: "direct" };
  }
  // The rest live only inside the notebook — which is public, so that is a real
  // destination. Honestly labelled as a weaker pointer by linkKind: "notebook".
  return { url: NOTEBOOK_URL, linkKind: "notebook" };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd course && node --test scripts/lib/library-index.test.mjs`
Expected: PASS — 15 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add course/scripts/lib/library-index.mjs course/scripts/lib/library-index.test.mjs
git commit -m "feat: pure helpers for indexing the library

Title cleaning (12 truncated, 165 with publisher suffixes), og-tag parsing,
and hand-mapped URLs for the 8 sources the export gives no URL for."
```

---

## Task 3: The indexing script

**Files:**
- Create: `course/scripts/index-library.mjs`
- Modify: `course/package.json` (add `library:index` script)
- Generate + commit: `course/content/library.json`

**Interfaces:**
- Consumes: `content/library-raw.json` (Task 1); every export of `scripts/lib/library-index.mjs` (Task 2).
- Produces: `content/library.json`, shape:

```ts
{
  notebookId: string;
  notebookUrl: string;
  snapshotDate: string;          // "YYYY-MM-DD"
  count: number;                 // total sources — ALWAYS the true count
  withDescription: number;
  titleOnly: number;
  sources: Array<{
    id: number;                  // stable, index-ordered
    title: string;
    publisher: string;
    url: string;
    linkKind: "direct" | "notebook";
    bucket: "newsroom-policy" | "audience" | "production" | "governance" | "agents" | "other";
    bucketLabel: string;           // denormalised on purpose — see below
    type: "web_page" | "pdf" | "markdown";
    description: string | null;
    descriptionSource: "og" | "none";
  }>;
}
```

Task 4 and Task 6 both depend on this shape exactly.

**Why `bucketLabel` is denormalised into every record:** it keeps `lib/library-search.mjs` (app code) from having to import the `BUCKETS` table out of `scripts/lib/` (build tooling). App code must never depend on the scripts directory — it inverts the dependency and drags a build file into the server bundle. Writing the label into the JSON costs a few hundred bytes and buys zero coupling.

**Context you need:**
- **`OPENROUTER_API_KEY` is already in `course/.env.local`** (gitignored). This script reads it for bucket classification only. Load it with `node --env-file=.env.local` — Node supports this natively; **do not add `dotenv`.**
- Bucket classification is a **label**, not a claim. An LLM does it from title + publisher + description. A wrong label is visible and correctable in the committed JSON. **The LLM must never write a `description`** — that is a claim about a document nobody read.
- Fetching is best-effort. **A 403 costs a description, never a source.** PDFs have no meta tags and will land title-only; that is expected and fine.
- Be polite: cap concurrency at 6, set a 12s timeout, send a real User-Agent.

- [ ] **Step 1: Write the script**

Create `course/scripts/index-library.mjs`:

```js
/**
 * Enrich content/library-raw.json into content/library.json — the file the site ships.
 *
 * Fetches META TAGS ONLY. No article bodies, no readability, no PDF parsing. A failed
 * fetch costs a DESCRIPTION, never a SOURCE: that record degrades to title-only and
 * stays in the library. All 292 sources always come out the other side.
 *
 * An LLM assigns BUCKETS (a label — wrong, it is visible and correctable here).
 * An LLM NEVER writes DESCRIPTIONS (a claim — wrong, it is invisible). Descriptions
 * come from the publisher's own og:description or they do not exist.
 *
 * NOT part of prebuild: ~292 network calls inside a Vercel build is a flaky build.
 *
 * Run: npm run library:index
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUCKETS,
  NOTEBOOK_URL,
  cleanTitle,
  publisherFromUrl,
  parseOgTags,
  resolveUrl,
  isValidBucket,
} from "./lib/library-index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTEBOOK_ID = "da7c4315-35c1-448b-ae4c-bd65cc2026f4";
const CONCURRENCY = 6;
const TIMEOUT_MS = 12_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error(
    "OPENROUTER_API_KEY is not set. Run with: node --env-file=.env.local scripts/index-library.mjs",
  );
}

/** Run `tasks` with a concurrency cap. Order of results matches order of tasks. */
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

/** Meta tags only. Returns null on ANY failure — the source survives, the description does not. */
async function fetchMeta(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return { ok: false, reason: `not html (${ct.split(";")[0] || "unknown"})` };
    // Meta tags live in <head>. Read a slice, not the whole document.
    const html = (await res.text()).slice(0, 200_000);
    return { ok: true, tags: parseOgTags(html) };
  } catch (err) {
    return { ok: false, reason: err.name === "AbortError" ? "timeout" : `network (${err.message})` };
  } finally {
    clearTimeout(timer);
  }
}

const BUCKET_LIST = Object.entries(BUCKETS)
  .map(([slug, label]) => `- ${slug}: ${label}`)
  .join("\n");

/**
 * Classify a batch of sources into buckets. LABELS ONLY — the model is never asked
 * what a source SAYS, only which shelf it belongs on, from metadata it has been given.
 */
async function classifyBatch(batch) {
  const numbered = batch
    .map((s, i) => `${i + 1}. "${s.title}" (${s.publisher})${s.description ? ` — ${s.description.slice(0, 200)}` : ""}`)
    .join("\n");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://claude-code-public-media.vercel.app",
      "X-Title": "Claude Code for Public Media — library indexing",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp:free",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            `You file sources into a public-media AI research library. For each numbered source, ` +
            `return ONLY its bucket slug.\n\nBuckets:\n${BUCKET_LIST}\n\n` +
            `Use "other" when none of the five fits — do NOT force-fit.\n` +
            `Reply with exactly ${batch.length} lines, each "N: slug". No prose, no fences.`,
        },
        { role: "user", content: numbered },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = (await res.json()).choices?.[0]?.message?.content ?? "";

  const buckets = new Array(batch.length).fill("other");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(\d+)\s*[:.)-]\s*([a-z-]+)\s*$/);
    if (!m) continue;
    const i = Number(m[1]) - 1;
    if (i >= 0 && i < batch.length && isValidBucket(m[2])) buckets[i] = m[2];
  }
  return buckets;
}

// ---------------------------------------------------------------------------

const raw = JSON.parse(readFileSync(join(__dirname, "..", "content", "library-raw.json"), "utf8"));
const input = raw.sources ?? [];
if (input.length < 200) throw new Error(`library-raw.json has only ${input.length} sources. Re-run npm run library:export.`);

console.log(`Indexing ${input.length} sources (meta tags only, concurrency ${CONCURRENCY})…\n`);

const failures = [];

const enriched = await pool(input, CONCURRENCY, async (s, i) => {
  const { url, linkKind } = resolveUrl(s);

  // Sources that point at the notebook have no page of their own to fetch.
  const fetchable = linkKind === "direct" && s.type !== "pdf";
  const meta = fetchable ? await fetchMeta(url) : { ok: false, reason: linkKind === "notebook" ? "no standalone page" : "pdf (no meta tags)" };

  if (!meta.ok) failures.push({ title: s.title.slice(0, 60), url, reason: meta.reason });

  const tags = meta.ok ? meta.tags : { title: null, description: null, siteName: null };
  const description = tags.description?.trim() || null;

  return {
    id: i + 1,
    title: cleanTitle(s.title, tags.title),
    publisher: tags.siteName?.trim() || publisherFromUrl(url) || "—",
    url,
    linkKind,
    bucket: "other", // filled in below
    bucketLabel: BUCKETS.other, // filled in below
    type: s.type,
    description,
    descriptionSource: description ? "og" : "none",
  };
});

// Buckets, in batches of 25.
console.log(`\nClassifying into buckets…`);
for (let i = 0; i < enriched.length; i += 25) {
  const batch = enriched.slice(i, i + 25);
  const buckets = await classifyBatch(batch);
  batch.forEach((s, j) => {
    s.bucket = buckets[j];
    // Denormalised so lib/library-search.mjs never has to import BUCKETS out of scripts/.
    s.bucketLabel = BUCKETS[buckets[j]];
  });
  process.stdout.write(`  ${Math.min(i + 25, enriched.length)}/${enriched.length}\r`);
}

const withDescription = enriched.filter((s) => s.description).length;

const out = {
  notebookId: NOTEBOOK_ID,
  notebookUrl: NOTEBOOK_URL,
  snapshotDate: new Date().toISOString().slice(0, 10),
  count: enriched.length,
  withDescription,
  titleOnly: enriched.length - withDescription,
  sources: enriched,
};

writeFileSync(join(__dirname, "..", "content", "library.json"), JSON.stringify(out, null, 2) + "\n");

// --- The coverage report. Loud, honest, never rounded up. ---
console.log(`\n\n✓ content/library.json — ${out.count} sources, ALL of them kept\n`);
console.log(`  with a description : ${withDescription}`);
console.log(`  title-only         : ${out.titleOnly}`);
console.log(`\n  buckets:`);
const byBucket = enriched.reduce((a, s) => ((a[s.bucket] = (a[s.bucket] ?? 0) + 1), a), {});
for (const [slug, label] of Object.entries(BUCKETS)) {
  console.log(`    ${String(byBucket[slug] ?? 0).padStart(4)}  ${slug} — ${label}`);
}
if (failures.length) {
  console.log(`\n  ${failures.length} sources have no description. Every one is still in the library:`);
  for (const f of failures) console.log(`    · [${f.reason}] ${f.title}`);
}
console.log("");
```

- [ ] **Step 2: Add the npm script**

In `course/package.json`, inside `"scripts"`, add:

```json
"library:index": "node --env-file=.env.local scripts/index-library.mjs",
```

**Do NOT add it to `prebuild`.**

- [ ] **Step 3: Run it**

Run: `cd course && npm run library:index`

Expected: it takes a few minutes (292 fetches at concurrency 6, then ~12 classification calls). It ends with a coverage report like:

```
✓ content/library.json — 292 sources, ALL of them kept

  with a description : 2xx
  title-only         : xx

  buckets:
     xx  newsroom-policy — Newsroom & editorial AI policy
     ...

  NN sources have no description. Every one is still in the library:
    · [HTTP 403] ...
```

**Sanity-check before committing:**
```bash
node -e "const d=require('./content/library.json');
  console.assert(d.count===d.sources.length, 'count lies');
  console.assert(d.sources.every(s=>s.url), 'a source has no URL');
  console.assert(d.sources.every(s=>['newsroom-policy','audience','production','governance','agents','other'].includes(s.bucket)), 'bad bucket');
  console.log('OK', d.count, 'sources,', d.withDescription, 'with descriptions');"
```
Expected: `OK 292 sources, NNN with descriptions` and no assertion output.

If `google/gemini-2.0-flash-exp:free` is rate-limited, swap the model id for another free one from `lib/models.ts` and re-run. **Do not fall back to keyword bucketing without saying so.**

- [ ] **Step 4: Eyeball the buckets**

Spot-check 10 records in `content/library.json`. The bucket is an LLM's label and this is the moment it is cheap to fix. **Correct any that are wrong by hand** — the file is committed, human-readable, and the hand edit survives until the next re-index.

- [ ] **Step 5: Commit**

```bash
git add course/scripts/index-library.mjs course/package.json course/content/library.json
git commit -m "feat: index the library — og descriptions, buckets, resolved URLs

Meta tags only; a failed fetch costs a description, never a source. All 292
sources come out the other side, and the script says out loud how many have
no description. An LLM assigns buckets (a correctable label) and never writes
descriptions (an uncheckable claim)."
```

---

## Task 4: The retriever (TDD)

**Files:**
- Create: `course/lib/library-search.mjs`
- Create: `course/lib/library-search.d.mts`
- Test: `course/lib/library-search.test.mjs`
- Create: `course/lib/library.ts`
- Modify: `course/package.json` (extend the `test` glob)

**Interfaces:**
- Consumes: `content/library.json` (Task 3).
- Produces, for Task 6:
  - `searchLibrary(question: string, k?: number): LibraryHit[]` — **synchronous**
  - `formatLibraryGrounding(hits: LibraryHit[]): string`
  - `type LibraryHit = { id: number; title: string; publisher: string; url: string; bucket: string; bucketLabel: string; linkKind: "direct" | "notebook"; description: string | null }`

**Context you need:**

**Why `.mjs` + `.d.mts` and not plain `.ts`:** this project has no TypeScript test runner and **no new dependencies are allowed**. `node:test` can only test plain JS. `lib/openui-spec.mjs` + `lib/openui-spec.d.mts` is the established pattern for exactly this — Node-safe logic, typed for TS consumers. Follow it.

**Why a separate stopword list from `lib/retrieval.ts` (do NOT try to share it):** the two corpora need *different* stopwords. `retrieval.ts` stops `"claude"`, `"code"`, `"station"` because every course module is about those. The library needs to additionally stop `"ai"`, `"artificial"`, `"intelligence"`, `"media"`, `"public"` — those appear in a large fraction of 292 sources *about AI in public media* and carry no discriminating signal. Sharing one list would degrade both. **This is a deliberate divergence, not an oversight.** Say so in a comment.

**Scoring:** a token matching the title is worth more than one matching the description, which beats the publisher. Below a floor, return nothing at all rather than pad the prompt with irrelevant sources.

- [ ] **Step 1: Write the failing tests**

Create `course/lib/library-search.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, searchSources, SCORE_FLOOR } from "./library-search.mjs";

/** A tiny fixture standing in for content/library.json. */
const SOURCES = [
  {
    id: 1,
    title: "NPR Ethics Handbook: Artificial Intelligence",
    publisher: "npr.org",
    url: "https://npr.org/ethics",
    bucket: "governance",
    bucketLabel: "Ethics & governance frameworks",
    linkKind: "direct",
    description: "How NPR journalists should disclose and verify AI-assisted work.",
  },
  {
    id: 2,
    title: "Automating transcription in the newsroom",
    publisher: "bbc.co.uk",
    url: "https://bbc.co.uk/transcription",
    bucket: "production",
    bucketLabel: "Transcription & production tooling",
    linkKind: "direct",
    description: "Whisper and its rivals, tested against broadcast audio.",
  },
  {
    id: 3,
    title: "Personalising the public radio homepage",
    publisher: "current.org",
    url: "https://current.org/personalisation",
    bucket: "audience",
    bucketLabel: "Audience & personalisation",
    linkKind: "direct",
    description: "Recommendation systems and member retention.",
  },
];

test("a question matches the source whose title carries its words", () => {
  const hits = searchSources(SOURCES, "how do we handle transcription of broadcast audio?", 4);
  assert.equal(hits[0].id, 2);
});

test("a question matches on the description, not just the title", () => {
  const hits = searchSources(SOURCES, "what should we disclose when journalists use AI?", 4);
  assert.equal(hits[0].id, 1);
});

test("an off-topic question returns NOTHING — the score floor holds", () => {
  // Course mechanics. There is nothing for it in a research library, and sending
  // irrelevant sources invites the model to mention them anyway.
  assert.deepEqual(searchSources(SOURCES, "how do I install Claude Code on my laptop?", 4), []);
});

test("an empty question returns nothing", () => {
  assert.deepEqual(searchSources(SOURCES, "", 4), []);
});

test("results are capped at k", () => {
  const hits = searchSources(SOURCES, "AI transcription ethics personalisation newsroom radio", 2);
  assert.ok(hits.length <= 2);
});

test("the same URL never appears twice in one result set", () => {
  // The notebook genuinely contains 3 URLs filed twice under different titles. We keep
  // both records (never drop a source), but showing a person the same link twice in one
  // Sources block looks broken. Dedupe by URL at retrieval time, keeping the best-scoring.
  const dupes = [
    ...SOURCES,
    {
      id: 4,
      title: "Automating transcription in the newsroom: a case study series",
      publisher: "bbc.co.uk",
      url: "https://bbc.co.uk/transcription", // same URL as id 2
      bucket: "production",
      bucketLabel: "Transcription & production tooling",
      linkKind: "direct",
      description: "Whisper and its rivals, tested against broadcast audio.",
    },
  ];
  const hits = searchSources(dupes, "transcription in the newsroom", 4);
  const urls = hits.map((h) => h.url);
  assert.equal(new Set(urls).size, urls.length, "a URL was returned twice");
});

test("results carry a human-readable bucket label for the UI", () => {
  const hits = searchSources(SOURCES, "transcription", 4);
  assert.equal(hits[0].bucketLabel, "Transcription & production tooling");
});

test("tokenize drops stopwords that carry no signal in THIS corpus", () => {
  // Every source in the library is about AI in public media. Those words discriminate nothing.
  const t = tokenize("What is the AI policy for public media newsrooms?");
  assert.ok(!t.includes("ai"));
  assert.ok(!t.includes("public"));
  assert.ok(!t.includes("media"));
  assert.ok(t.includes("policy"));
  assert.ok(t.includes("newsrooms"));
});

test("SCORE_FLOOR is a positive number", () => {
  assert.ok(SCORE_FLOOR > 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd course && node --test lib/library-search.test.mjs`
Expected: FAIL — `Cannot find module './library-search.mjs'`

- [ ] **Step 3: Write the scorer**

Create `course/lib/library-search.mjs`:

```js
/**
 * Keyword scoring over the curated library. Deliberately the same shape as
 * lib/retrieval.ts — tokenize, score, take the top few — because 292 short records
 * (~18k tokens all in) is a SMALLER haystack than the course digest that file already
 * handles in-process. No vector DB. See the spec for the upgrade ladder if recall
 * ever measurably suffers.
 *
 * Plain .mjs (with a .d.mts alongside) so node:test can test it without adding a
 * TypeScript test runner. Same pattern as lib/openui-spec.mjs.
 *
 * ponytail: keyword overlap, not embeddings. Climb a rung only on evidence.
 *
 * NB: this file imports NOTHING. In particular it must never reach into scripts/ for
 * the BUCKETS table — app code depending on build tooling inverts the dependency and
 * drags a script into the server bundle. content/library.json carries bucketLabel on
 * every record precisely so this file doesn't need it.
 */

/**
 * NOTE: deliberately NOT shared with lib/retrieval.ts. The two corpora need different
 * stoplists. retrieval.ts stops "claude"/"code"/"station" because every module is about
 * them. The library must ALSO stop "ai"/"artificial"/"intelligence"/"public"/"media" —
 * those appear across a large fraction of 292 sources about AI in public media and
 * discriminate nothing. Sharing one list would degrade both.
 */
const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "i", "you", "we", "they", "it", "he", "she", "my", "our", "your", "their", "its",
  "to", "of", "in", "on", "for", "with", "at", "by", "from", "as", "about", "into", "over",
  "can", "could", "should", "would", "will", "may", "might", "must", "shall",
  "what", "how", "why", "when", "where", "who", "which",
  "not", "no", "so", "up", "out", "just", "me", "use", "using", "get", "make", "want",
  // Domain stopwords: true of nearly every source in THIS library.
  "ai", "artificial", "intelligence", "public", "media", "station", "claude",
]);

export function tokenize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * Below this, we send NO library block at all. "How do I install Claude Code" scores
 * nothing against a research library and must get nothing — handing the model
 * irrelevant sources only invites it to mention them.
 *
 * 5 ≈ two solid hits (a title match is 3, a description match 2).
 */
export const SCORE_FLOOR = 5;

const cache = new WeakMap();

/** Precompute per-source token sets once per array. */
function fields(source) {
  let f = cache.get(source);
  if (!f) {
    f = {
      title: new Set(tokenize(source.title)),
      description: new Set(tokenize(source.description ?? "")),
      bucket: new Set(tokenize(source.bucketLabel ?? "")),
      publisher: new Set(tokenize(source.publisher)),
    };
    f.all = new Set([...f.title, ...f.description, ...f.bucket, ...f.publisher]);
    cache.set(source, f);
  }
  return f;
}

export function scoreSource(queryTokens, source) {
  const f = fields(source);
  let s = 0;
  for (const q of queryTokens) {
    if (f.title.has(q)) s += 3;
    else if (f.description.has(q)) s += 2;
    else if (f.bucket.has(q)) s += 2;
    else if (f.publisher.has(q)) s += 1;
    else {
      // cheap stem-ish partial: "transcribing" should still reach "transcription"
      for (const w of f.all) {
        if (w.length > 3 && q.length > 3 && (w.startsWith(q) || q.startsWith(w))) {
          s += 1;
          break;
        }
      }
    }
  }
  return s;
}

/**
 * @returns the top k sources scoring at or above SCORE_FLOOR, best first. [] if none.
 *
 * Deduped by URL. The notebook genuinely files 3 URLs twice under different titles; we
 * keep both records (a source is never dropped from the library) but a person must never
 * be handed the same link twice in one Sources block. Best-scoring title wins.
 */
export function searchSources(sources, question, k = 4) {
  const q = tokenize(question);
  if (q.length === 0) return [];

  const seen = new Set();

  return sources
    .map((source) => ({ source, s: scoreSource(q, source) }))
    .filter((r) => r.s >= SCORE_FLOOR)
    .sort((a, b) => b.s - a.s || a.source.id - b.source.id)
    .filter(({ source }) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .slice(0, k)
    .map(({ source }) => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      bucket: source.bucket,
      bucketLabel: source.bucketLabel ?? "Other",
      linkKind: source.linkKind,
      description: source.description ?? null,
    }));
}
```

- [ ] **Step 4: Write the type declarations**

Create `course/lib/library-search.d.mts`:

```ts
export type LibraryHit = {
  id: number;
  title: string;
  publisher: string;
  url: string;
  bucket: string;
  bucketLabel: string;
  linkKind: "direct" | "notebook";
  description: string | null;
};

export type LibrarySource = {
  id: number;
  title: string;
  publisher: string;
  url: string;
  linkKind: "direct" | "notebook";
  bucket: string;
  bucketLabel: string;
  type: string;
  description: string | null;
  descriptionSource: "og" | "none";
};

export const SCORE_FLOOR: number;
export function tokenize(s: string): string[];
export function scoreSource(queryTokens: string[], source: LibrarySource): number;
export function searchSources(sources: LibrarySource[], question: string, k?: number): LibraryHit[];
```

- [ ] **Step 5: Extend the test glob**

In `course/package.json`, change:

```json
"test": "node --test scripts/lib/*.test.mjs"
```

to:

```json
"test": "node --test scripts/lib/*.test.mjs lib/*.test.mjs"
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd course && npm test`
Expected: PASS — the existing 21 walkthrough tests, plus 15 from Task 2, plus 8 here. **0 failures.**

- [ ] **Step 7: Write the app-facing module**

Create `course/lib/library.ts`:

```ts
import libraryJson from "@/content/library.json";
import { searchSources, type LibraryHit, type LibrarySource } from "@/lib/library-search.mjs";

export type { LibraryHit };

const library = libraryJson as {
  notebookUrl: string;
  snapshotDate: string;
  count: number;
  withDescription: number;
  titleOnly: number;
  sources: LibrarySource[];
};

export const libraryMeta = {
  notebookUrl: library.notebookUrl,
  snapshotDate: library.snapshotDate,
  count: library.count,
  withDescription: library.withDescription,
  titleOnly: library.titleOnly,
};

/**
 * The top vetted sources for a question. SYNCHRONOUS — 292 records scored in-process,
 * no network, no database, no added latency on the chat's critical path.
 *
 * Returns [] when nothing clears the score floor, and the caller must then send NO
 * library block at all.
 */
export function searchLibrary(question: string, k = 4): LibraryHit[] {
  return searchSources(library.sources, question, k);
}

/**
 * The grounding block handed to the model.
 *
 * The wording is load-bearing. The model has NOT read these sources — nobody has. It
 * is POINTING at them. If this block ever implies otherwise, the model will start
 * attributing claims to documents it never saw, which is the exact failure this site
 * exists to warn stations about.
 */
export function formatLibraryGrounding(hits: LibraryHit[]): string {
  if (hits.length === 0) return "";

  const lines = hits.map((h) => {
    const where = h.linkKind === "notebook" ? " [no standalone link — lives in the notebook]" : "";
    const desc = h.description ? `\n  ${h.description}` : "\n  (no description available)";
    return `- title: ${h.title}\n  publisher: ${h.publisher}\n  bucket: ${h.bucketLabel}\n  url: ${h.url}${where}${desc}`;
  });

  return [
    `These sources come from a library of ${libraryMeta.count} sources on AI in public media,`,
    `hand-vetted by Tarik Moody (Radio Milwaukee). They were matched to this question by`,
    `keyword overlap.`,
    ``,
    `YOU HAVE NOT READ THEM. Nobody has read them for you. You may POINT the person at`,
    `them with a Sources block, copying title, publisher, url and bucket EXACTLY as given.`,
    `You must NEVER quote them, summarise what they say, or attribute any claim to them.`,
    `If they are not relevant to your answer, leave the Sources block out entirely.`,
    ``,
    ...lines,
  ].join("\n");
}
```

- [ ] **Step 8: Typecheck**

Run: `cd course && npx tsc --noEmit`
Expected: clean, no errors.

If TS complains about importing `library.json`, confirm `resolveJsonModule` is on in `tsconfig.json` (Next.js sets it by default). If it complains about the `.mjs` import, confirm `lib/library-search.d.mts` sits beside `lib/library-search.mjs` — that is what `lib/openui-spec.d.mts` does for `lib/openui-spec.mjs`.

- [ ] **Step 9: Commit**

```bash
git add course/lib/library-search.mjs course/lib/library-search.d.mts course/lib/library-search.test.mjs course/lib/library.ts course/package.json
git commit -m "feat: synchronous keyword retriever over the library

Mirrors lib/retrieval.ts. 292 short records is a smaller haystack than the
course digest we already score in-process, so: no vector DB, no network, no
added latency. A score floor means an off-topic question gets no library block
at all rather than a padded prompt."
```

---

## Task 5: The `Sources` component

**Files:**
- Modify: `course/lib/openui-spec.mjs`
- Modify: `course/lib/openui-library.tsx`

**Interfaces:**
- Consumes: the `LibraryHit` fields from Task 4 (`title`, `publisher`, `url`, `bucket` label).
- Produces: an OpenUI component named `Sources`, usable inside `Answer([...])`. Task 6 relies on the model being able to emit it.

**Context you need — this is convention #1 and it is the single easiest thing to get wrong:**

`lib/openui-spec.mjs` is the **single source of truth** — schemas, descriptions and prompt copy. It is plain `.mjs` with **no JSX and no React import**, because `scripts/gen-prompt.mjs` runs it in plain Node at build time to bake the system prompt into `content/system-prompt.ts`. `lib/openui-library.tsx` is `"use client"` and supplies *only* the pixels, calling `buildCourseLibrary()` with the real renderers.

**Add the component to BOTH files.** Add it to `Answer`'s union, to the `components` array, and to a `componentGroups` entry. Miss any of those and the model either cannot emit it or cannot render it.

`gen-prompt.mjs` runs inside `prebuild`, so the system prompt regenerates automatically — you do not hand-edit `content/system-prompt.ts` (it says "GENERATED FILE — do not edit" at the top, and it means it).

- [ ] **Step 1: Add the schema to `lib/openui-spec.mjs`**

Inside `buildCourseLibrary`, after the `Comparison` definition and before `FollowUps`, add:

```js
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
```

- [ ] **Step 2: Wire it into `Answer` and the library, in the same file**

Add `Sources.ref` to the `Answer` props union (after `Comparison.ref`):

```js
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
```

Add `Sources` to the `components` array (after `Comparison`):

```js
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
```

Add a `componentGroups` entry after the "Navigation" group:

```js
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
```

Add to `ADDITIONAL_RULES` (append to the array):

```js
  "Sources may only contain sources handed to you in the LIBRARY section, copied exactly. Never invent a source, a URL, or a publisher.",
  "You have not read the library sources. Never quote them, summarise them, or attribute a claim to them. You are pointing at them.",
```

- [ ] **Step 3: Regenerate the prompt and verify it took**

Run: `cd course && node scripts/gen-prompt.mjs`
Expected: `✓ content/system-prompt.ts — NN,NNN chars (~N,NNN tokens)`

Verify the component made it in:
```bash
grep -c "Sources" content/system-prompt.ts
```
Expected: a count of at least 1 (it will be several).

- [ ] **Step 4: Add the renderer to `lib/openui-library.tsx`**

Add this after the `Comparison` renderer and before `FollowUps`. Note: `Library` is imported from `lucide-react` — **add it to the existing lucide import at the top of the file** (the current import is `{ AlertTriangle, ArrowRight, ExternalLink, Info, ShieldAlert }`).

```tsx
const Sources: R<{
  items: { title: string; publisher: string; url: string; bucket: string }[];
}> = ({ props }) => {
  const items = props.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="retro-box bg-card p-3" aria-label="Sources from the library">
      <header className="mb-2 flex items-center gap-2">
        <Library className="size-4 shrink-0" aria-hidden />
        <h3 className="font-head text-[13px] leading-tight">From the library</h3>
      </header>

      <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
        Vetted sources matched to your question. The assistant has not read them — it is
        pointing you at them.
      </p>

      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="retro-box retro-lift flex min-h-11 items-start gap-2 bg-background p-2.5 no-underline"
            >
              <ExternalLink className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[13px] font-medium leading-tight">{s.title}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground">{s.publisher}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {s.bucket}
                  </Badge>
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
```

**Why these classes:** `min-h-11` is the 44px tap target `npm run audit` enforces. `min-w-0` on the flex child stops a long title inflating the track past a 320px viewport — the failure mode that has bitten this project three times. No hex colours; `bg-card`, `bg-background`, `text-muted-foreground` are tokens.

- [ ] **Step 5: Register the renderer, in the same file**

Add `Sources` to the `buildCourseLibrary({...})` call at the bottom (after `Comparison`):

```tsx
export const courseLibrary = buildCourseLibrary({
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
});
```

- [ ] **Step 6: Typecheck and build**

Run: `cd course && npx tsc --noEmit && npm run build`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add course/lib/openui-spec.mjs course/lib/openui-library.tsx course/content/system-prompt.ts
git commit -m "feat: Sources component — point at library sources, never quote them

Added to BOTH openui-spec.mjs (schema, prompt copy) and openui-library.tsx
(RetroUI renderer), per convention. The card says plainly that the assistant
has not read these sources: in pointer mode an inline citation would attribute
a claim to a document nobody opened."
```

---

## Task 6: Wire it into the chat

**Files:**
- Modify: `course/app/api/chat/route.ts` (imports; and the `grounding` / `payload` block at ~lines 152–165)

**Interfaces:**
- Consumes: `searchLibrary` and `formatLibraryGrounding` from `lib/library.ts` (Task 4); the `Sources` component from Task 5.
- Produces: the finished feature. Nothing depends on this.

**Context you need:** This is the **entire** wiring change. `searchLibrary` is synchronous, so there is **no `await` and no `Promise.all`** — an earlier draft of the design had them and they are gone along with the database. Do not reintroduce them.

**Never import `@openuidev/react-lang` here.** `lib/library.ts` does not, and must not start.

- [ ] **Step 1: Add the import**

At the top of `course/app/api/chat/route.ts`, after the `buildGrounding` import:

```ts
import { buildGrounding } from "@/lib/retrieval";
import { searchLibrary, formatLibraryGrounding } from "@/lib/library";
import { MODEL_CASCADE } from "@/lib/models";
```

- [ ] **Step 2: Retrieve from both corpora**

Find this (currently line ~153):

```ts
  const grounding = buildGrounding(lastUser?.content ?? "");
```

Replace with:

```ts
  const question = lastUser?.content ?? "";
  const grounding = buildGrounding(question);

  // Synchronous — 292 records scored in-process. No network, no DB, no added latency.
  // Returns [] for anything that doesn't clear the score floor ("how do I install
  // Claude Code" scores nothing against a research library), and we then send no
  // library block at all rather than pad the prompt with sources the model would
  // feel obliged to mention.
  const libraryHits = searchLibrary(question);
```

- [ ] **Step 3: Add the second system block**

Find this (currently line ~157):

```ts
      { role: "system", content: `${SYSTEM_PROMPT}\n\n# COURSE MATERIAL\n\n${grounding}` },
```

Replace with:

```ts
      {
        role: "system",
        content:
          `${SYSTEM_PROMPT}\n\n# COURSE MATERIAL\n\n${grounding}` +
          (libraryHits.length
            ? `\n\n# LIBRARY: VETTED SOURCES YOU HAVE NOT READ\n\n${formatLibraryGrounding(libraryHits)}`
            : ""),
      },
```

- [ ] **Step 4: Typecheck**

Run: `cd course && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Verify it end to end against the real route**

Start the dev server: `cd course && npm run dev`

In another terminal, ask a question the library *should* answer:

```bash
curl -sN localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"What are the ethics risks of using AI for transcription in our newsroom?"}]}' \
  | grep -o 'Sources(' | head -1
```
Expected: `Sources(` — the model emitted the block.

Now ask one it should **not**:

```bash
curl -sN localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"How do I install Claude Code on my laptop?"}]}' \
  | grep -c 'Sources('
```
Expected: `0` — the score floor held and no library block was sent.

**Then open http://localhost:3000 and actually ask the first question in the chat UI.** Confirm the card renders, the links open, and the "has not read them" line is visible. A curl check proves the wire; only the browser proves the pixels.

- [ ] **Step 6: Commit**

```bash
git add course/app/api/chat/route.ts
git commit -m "feat: wire the library into the chat

One synchronous call and one conditional system block. Off-topic questions
clear no score floor and get no library block at all."
```

---

## Task 7: The gates

**Files:** none created. This task exists because a fresh reviewer should be able to reject the branch on evidence.

**Interfaces:**
- Consumes: everything.
- Produces: a green branch.

- [ ] **Step 1: Run every gate**

```bash
cd course
npm test          # node:test — the original 21, plus 15 (Task 2) and 8 (Task 4)
npx tsc --noEmit
npm run build     # prebuild: gen:samples → gen:content → gen:walkthroughs → gen:prompt
npm run audit     # Playwright: all pages @320px, zero h-scroll, ≥44px tap targets
```

**All four must be green.** `npm run audit` is the mobile/a11y gate. If the `Sources` card overflows at 320px, the offender is almost certainly a flex/grid child missing `min-w-0` — that is the bug that has bitten this project three times, and the renderer in Task 5 already carries the fix.

- [ ] **Step 2: Confirm the honesty invariants hold**

```bash
node -e "
const d = require('./content/library.json');
const n = d.sources.length;
console.log('sources in library.json :', n);
console.log('count field says        :', d.count, d.count === n ? 'OK' : '!! LIES');
console.log('every source has a URL  :', d.sources.every(s => s.url) ? 'OK' : '!! NO');
console.log('with a description      :', d.withDescription);
console.log('title-only              :', d.titleOnly);
console.log('adds up                 :', d.withDescription + d.titleOnly === n ? 'OK' : '!! NO');
"
```

Expected: `OK` on every line, and the numbers are the *true* numbers. **If descriptions failed for 40 sources, the output says 40. It is never rounded up, and no source is missing.**

- [ ] **Step 3: Confirm the two scripts stayed out of the build**

```bash
node -e "const s=require('./package.json').scripts;
console.log('prebuild:', s.prebuild);
console.log('clean:', !/library:(export|index)/.test(s.prebuild) ? 'OK — neither script runs in CI' : '!! a library script leaked into prebuild');"
```
Expected: `OK — neither script runs in CI`.

A Vercel build has no Google cookie jar and must not make 292 network calls.

- [ ] **Step 4: Confirm no new dependency crept in**

```bash
git diff main --stat -- package.json package-lock.json
node -e "console.log(Object.keys(require('./package.json').dependencies).length, 'dependencies')"
```
Expected: `14 dependencies` — unchanged. `package.json` should differ from `main` only in `scripts`.

- [ ] **Step 5: Commit anything outstanding, then request review**

```bash
git status   # expect clean
```

Then use **superpowers:requesting-code-review** for a whole-branch review before merging. The handoff is explicit that on the walkthroughs work *"the reviews caught real bugs the implementers missed every single time."*

---

## Notes for the reviewer

Three things to check that a normal review would miss:

1. **`Sources` exists in both `lib/openui-spec.mjs` and `lib/openui-library.tsx`.** Schema in one, pixels in the other, and `Answer`'s union, the `components` array and `componentGroups` all updated. A component in only one file silently half-works.

2. **Nothing writes a description with an LLM.** `index-library.mjs` uses OpenRouter for **buckets only**. Grep it: the model is never asked what a source *says*. If a future change has an LLM summarise a source it has not read, that is the exact failure this site documents, shipped as a feature.

3. **`searchLibrary` is synchronous and `route.ts` does not `await` it.** If a `Promise.all` has reappeared, someone has re-added a database that this design deleted.
