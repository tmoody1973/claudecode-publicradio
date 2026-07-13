# The curated library, in the chat

## Problem

Tarik curated a public NotebookLM notebook — *"AI in Public Media: A Working Practitioner's
Source Library"* (`da7c4315-35c1-448b-ae4c-bd65cc2026f4`) — **292 human-vetted sources** on AI in
public media: newsroom policies, audience work, transcription tooling, ethics and governance, and
how agents actually land in this ecosystem.

The site's chat knows the 10 course modules and nothing else. Someone asks *"what's our policy
risk if we use AI for transcription?"* and gets a good answer from the course — while 292 vetted
sources on exactly that question sit in a notebook the chat has never heard of.

### What the notebook is actually worth

**The scarce thing is the curation, not the content.** The text of those 292 sources is on the
open web and the models have largely read it. What does not exist anywhere else is a working
public-media practitioner having gone through the field and said *these 292, not the other
thousands.*

That reframing is what makes this cheap. It means the chat does not need to *ingest* the library.
It needs to **know what is in it** and point at the right parts.

### The prior research, settled — do not re-open it

NotebookLM has **no query API**. Not for consumer accounts; and the Enterprise API (Discovery
Engine, Pre-GA) is notebook/source CRUD plus audio overviews — there is no "ask the notebook, get
a grounded answer" method at all. It cannot back a chat. `notebooklm-py` is reverse-engineered
cookie-auth against Google's private endpoints: **fine for a one-off export, a liability as a
production runtime dependency.**

**Export is blessed and it works.** `notebooklm metadata -n <id> --json` returns the source list
in one command. Verified against the live notebook on 2026-07-12.

## Design

### 1. Pointer, not knowledge base

The chat answers from the **course** — unchanged. It then, when relevant, surfaces **2–4 vetted
sources** from the library: title, publisher, bucket, link out.

It never quotes them. It never attributes a claim to them. It has not read them, and it says so.

This is a stronger offer than a fake footnote, not a weaker one: *"four things a public-media
practitioner vetted, go read them"* is exactly what a station person wants and exactly what we can
honestly provide.

**Why this and not full-text RAG.** Full-text ingest requires fetching 292 URLs across 182
domains — 403s, paywalls, PDFs, YouTube. Roughly a fifth of it fails no matter how well the
script is written. The result would be a chat that cites a library it has *partially* read, and
that sounds exactly as confident about the 160 sources it got as it would have about all 292.
That is the failure mode this site exists to warn people about. Pointer mode cannot fail that
way, because it only ever claims *"this is in the library."*

Full-text ingest stays available as a later upgrade for the subset that fetches cleanly. Those
sources would then earn real, quoted citations — visually distinguished from pointers.

### 2. No database

Sized against the real export:

| | |
|---|---|
| Sources | 292 |
| Per record | title, publisher, one-line description, bucket, url |
| Whole corpus | **~18k tokens** |
| The course digest we already keyword-select in-process, with no database | **33k tokens** |

**The entire library is half the size of a thing `lib/retrieval.ts` already handles with a `Map`
and a scoring loop.** pgvector was sized for the *other* product — 5–10k chunks of fetched full
text. At pointer scale it buys nothing and costs a dependency, a `DATABASE_URL` in three Vercel
environments, a schema, and an embedding round-trip on **every chat turn**.

So: a committed JSON file and an in-process scorer. `searchLibrary` is **synchronous** and adds
zero latency to the chat.

The upgrade ladder, if recall proves insufficient:

1. **Keyword** — where we start. No infra, no latency.
2. **Precomputed embeddings in the JSON** — 292 vectors, cosine in-process. Buys semantic recall.
   Still no database; costs one embedding call to vectorise the question.
3. **Neon pgvector** — earns its keep only at full-text scale.

Do not climb a rung without evidence that the current one is failing.

### 3. Two offline scripts

Both are run **locally, by hand, occasionally**. Neither joins the `prebuild` chain — the export
needs cookie auth that does not exist on Vercel, and a network fetch inside a build is a flaky
build. Their output is committed.

**`scripts/export-library.mjs`** — shells out to `notebooklm --quiet metadata -n da7c4315 --json`,
writes `content/library-raw.json`. A **snapshot, not a sync.** Re-run it when Tarik adds sources.

**`scripts/index-library.mjs`** — enriches raw → `content/library.json`.

Per source:

| Field | Source |
|---|---|
| `title` | `og:title`, falling back to the export's title |
| `publisher` | `og:site_name`, falling back to the domain |
| `description` | `og:description` — **absent if the fetch fails; never invented** |
| `bucket` | LLM classification into one of the five buckets |
| `url` | the export's url; hand-mapped for the eight that lack one |
| `descriptionSource` | `"og" \| "none"` |

It fetches **meta tags only**. No article bodies, no readability, no PDF parsing, no YouTube
special-casing. A 403 costs a *description*, not a *source*: that record degrades to title-only
and stays in the library.

It prints a coverage report and **fails loudly rather than dropping anything silently.**

#### Why one shallow fetch is worth it

The export gives us `{type, title, url}` and nothing else. Its titles are Google-result-shaped:

- **12 of 292 are truncated mid-sentence** — *"How BBC Eye built a multi-agent AI system to sift through ten ..."*
- **165 of 292 carry a publisher suffix** — *" - Poynter"*, *"| Research.com"*

One meta-tag fetch repairs all three problems at once: `og:title` restores the truncated ones,
`og:site_name` gives a clean publisher field (a display field *and* a retrieval signal), and
`og:description` roughly triples the matchable surface per record.

`og:description` also survives the paywalls that would defeat a full-text fetch — publishers put
that tag there precisely so their paywalled articles look right when shared.

The 20 PDFs have no meta tags and will land title-only. Their titles are descriptive; this is
acceptable.

#### The line on LLM use

**An LLM assigns buckets. An LLM never writes descriptions.**

A bucket is a *label*: wrong, it is visible and correctable in a committed JSON file. A
description is a *claim*: an LLM writing "what this source says" from its title alone produces a
confident sentence about a document it has not read. That is the exact failure this site
documents. It is not going into the data layer.

### 4. The eight sources with no URL

The export has eight sources with no url. A pointer with nowhere to point is a dead end, so each
one is resolved:

| Source | Resolution |
|---|---|
| `public-media-ai-panel.pdf` | Hand-mapped to its real GitHub Pages URL — the repo root already serves it |
| 5 × long-form research reports (*Orchestrating the Newsroom*, *The Governance of Algorithmic Journalism*, *The Agentic Turn in Civic Technology*, *The Digital Integration of AI in PSM*, *AI Ethics and Governance Frameworks*) | Point at the **public notebook**, labelled *"read this in the notebook — no standalone link"* |
| `how-llms-work-guide-for-public-radio.md` | Same |
| `AI Data Analystv2.pdf` | Same |

The notebook is public, so this is a real, working destination — a weaker pointer than a direct
link, and honestly labelled as one. **All 292 sources stay in the library and all 292 are
reachable.**

### 5. Retrieval

`lib/library.ts` — `searchLibrary(question: string, k = 4): LibraryHit[]`

Reuses the `tokenize` / `STOP` / `score` shape from `lib/retrieval.ts`, so it reads as *the thing
we already do, applied to a second corpus*. Haystack per source: title + publisher + description +
bucket.

**A score floor.** Below it, `searchLibrary` returns `[]` and **no library block is sent at all.**
*"How do I install Claude Code"* scores nothing against a research library and gets nothing —
the model is never handed irrelevant sources to feel obliged to mention.

No LLM router deciding whether to hit the library. Scoring 292 records in-process is free; there
is no call to save. The only cost is prompt tokens, and the floor already governs that.

Library grounding is capped at ~4k tokens.

### 6. The `Sources` component

Added to **both** `lib/openui-spec.mjs` (Node-safe schema) **and** `lib/openui-library.tsx`
(`"use client"` renderer). This is convention #1 and it is not optional — `gen-prompt.mjs` reads
the spec, so the system prompt updates itself from the schema.

Renders below the answer, as its own bounded card:

```
┌─ From the library ─────────────────────────────┐
│ Vetted sources matched to your question. The   │
│ assistant has not read them.                    │
│                                                 │
│  → NPR Ethics Handbook: AI                     │
│    npr.org · Ethics & governance                │
│  → Automating transcription in the newsroom     │
│    bbc.co.uk · Transcription & production       │
└─────────────────────────────────────────────────┘
```

A `SYSTEM_PROMPT` rule instructs the model to emit `Sources(...)` when library sources are
supplied, and **never** to claim it has read them.

### 7. The wiring

`app/api/chat/route.ts`, line 153 — one synchronous call, no `await`, no `Promise.all`:

```ts
const grounding = buildGrounding(lastUser?.content ?? "");
const hits = searchLibrary(lastUser?.content ?? "");
```

and line 157, conditionally:

```ts
{
  role: "system",
  content:
    `${SYSTEM_PROMPT}\n\n# COURSE MATERIAL\n\n${grounding}` +
    (hits.length
      ? `\n\n# LIBRARY: VETTED SOURCES (you have NOT read these — point, never quote)\n\n${formatHits(hits)}`
      : ""),
}
```

That is the entire wiring change.

### 8. Verification

| Gate | Bar |
|---|---|
| `npm test` | node:test. Existing 21 stay green; new cases for `searchLibrary` — a known question hits its expected source, and an off-topic question returns `[]` |
| `npx tsc --noEmit` | clean |
| `npm run build` | prebuild chain unchanged; `gen:prompt` picks up `Sources` from the spec |
| `npm run audit` | Playwright, all pages @320px, zero h-scroll, ≥44px tap targets. **The `Sources` card and its links must clear this.** |

`index-library.mjs` reports coverage on every run: how many sources have descriptions, how many
are title-only, how many fetches failed and why. **The count is never rounded up.**

## Non-goals

- **Full-text ingest.** Explicitly deferred. It is the upgrade, not the plan.
- **Neon / pgvector / any database.** Not needed at this corpus size. Rung 3 of the ladder.
- **Publishing the 5 research reports as site pages.** A good idea and a *different feature* — it
  would give them first-class URLs on Tarik's own domain and make the site more valuable than the
  notebook it points at. Left on the table.
- **A `/library` browse page.** Not needed to make the chat useful.
- **Inline `[1]` citations.** In pointer mode they would attribute claims to sources nobody read.
  They become honest only after full-text ingest.
- **Any live connection to NotebookLM at runtime.** The export is a snapshot. Nothing on the
  request path ever talks to Google.

## Risks

**Keyword recall is the real weakness.** *"Will this get our newsroom sued?"* will not match a
source titled *"Legal exposure in automated content."* The bucket field and the `og:description`
blurb widen the surface considerably, but this is a genuine limit. Mitigation is rung 2 of the
ladder — precomputed embeddings, still no database — and it should be taken **only on evidence**,
not on suspicion.

**The snapshot drifts.** Sources Tarik adds to the notebook do not appear on the site until
`export-library.mjs` is re-run and the JSON is committed. This is a deliberate trade for having no
runtime dependency on a reverse-engineered API. The library page and the spec both say the
snapshot date.

**`og:description` quality varies.** Some are marketing copy rather than a summary. They are still
the publisher's own words about their own document, which is a floor we can defend — unlike an
LLM's guess.

**`notebooklm-py` can break.** It is reverse-engineered and Google can change the endpoints. If it
does, the export falls back to Google Takeout or the Chrome extension. **Nothing on the site
breaks** — the JSON is committed. This is precisely why it is not a runtime dependency.
