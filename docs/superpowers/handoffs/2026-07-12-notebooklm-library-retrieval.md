# Handoff — index the NotebookLM library into Neon pgvector, wire it into the chat

**One task. Everything below exists so you can start it cold.**

---

## The project, in four sentences

`claude-code-public-media` is a **live, deployed** Next.js 16 site that turns a 6-hour YouTube
course ("Claude Code for Non-Coders" by Nate Herk) into something **public radio / public TV
staff** can actually use. The audience is a 55-year-old membership director who has never opened
a terminal — **not developers**. It has 10 modules, 50 station use cases (each with a guardrail
and a 5–8 step runbook), a glossary, a cost simulator, 4 walkthroughs anchored by **real recorded
Claude Code sessions**, and an **AI chat assistant**.

- **Live:** https://claude-code-public-media.vercel.app
- **Repo:** `/Users/tarikmoody/Documents/Projects/claudecode-publicradio` (GitHub `tmoody1973/claudecode-publicradio`, `main`, pushed & deployed, tree clean)
- **App root:** `course/` — the repo root still serves an older GitHub Pages `index.html`; **don't touch it**

---

## YOUR TASK

Tarik curated a **public NotebookLM notebook** — *"AI in Public Media: A Working Practitioner's
Source Library"* — ~200–300 human-vetted sources on AI in public media (governance, newsroom
policies, audience, transcription, ethics, agents, civic media).

- Notebook ID `da7c4315-35c1-448b-ae4c-bd65cc2026f4`
- https://notebooklm.google.com/notebook/da7c4315-35c1-448b-ae4c-bd65cc2026f4

**Goal:** let the site's chat answer from that library — with citations — alongside the course
content it already knows.

### ⛔ THE RESEARCH IS DONE. DO NOT RE-LITIGATE IT.

**NotebookLM has no usable query API. Do not try to connect to it.**

| | Verified status |
|---|---|
| Consumer / personal-account API | **Does not exist.** |
| NotebookLM **Enterprise** API (Discovery Engine, Pre-GA) | Exists — but is **notebook/source CRUD + audio overviews ONLY. There is no "query the notebook, get a grounded answer" method at all.** It literally cannot back a chat. Also needs a GCP project + ~$9/licence × 15 min. A consumer notebook isn't reachable from it anyway. |
| `notebooklm-py` (unofficial) | Reverse-engineered, **cookie-auth against Google's private endpoints.** Fine for a one-off export; a **liability** as a production runtime dep — any Google deploy 500s the chat. |
| **Export** | ✅ Works. Google Takeout, or a Chrome extension (NotebookLM Sources Exporter). You only need `{title, url}` per source. |

**The reframe that makes this cheap:** NotebookLM is where Tarik **curates** — 200 human-vetted
sources is the expensive part and it's *already done*. **Export the list once; index it
ourselves.** The notebook stays the editorial front door; the site gets its own index.

### The approved architecture

Keep OpenRouter. Keep OpenUI Lang. Keep the model fallback cascade. **Add a second retriever
alongside the course one, backed by Neon pgvector.**

Why it's a small change: **the chat's contract with the model is `SYSTEM_PROMPT + grounding
text`. Grounding is just a string.** Today it comes from 10 course modules. Tomorrow it comes
from two sources. Nothing downstream moves.

---

## THE ONE INTEGRATION POINT

`course/app/api/chat/route.ts` **line 153**:

```ts
const grounding = buildGrounding(lastUser?.content ?? "");
```

becomes:

```ts
const [grounding, hits] = await Promise.all([
  buildGrounding(lastUser?.content ?? ""),   // unchanged — the 10 course modules
  searchLibrary(lastUser?.content ?? ""),    // NEW — the ~200-source library
]);
```

and **line 157**, the system message, gains a second block:

```ts
{
  role: "system",
  content: `${SYSTEM_PROMPT}\n\n# COURSE MATERIAL\n\n${grounding}\n\n# LIBRARY: RESEARCH ON AI IN PUBLIC MEDIA\n\n${hits}`,
},
```

That is the **entire** wiring change. Everything else is the ingest script and one new lib file.

---

## Implementation sketch (~1 focused day; fetching 200 URLs is the messy part)

1. **Export the sources once** → `course/content/library-sources.json` as `[{title, url, type}]`.
   A **snapshot, not a sync.** Re-export when Tarik adds a batch.

2. **`course/scripts/index-library.mjs`** (new)
   - Fetch each URL → text. **This is the swamp.** Expect 403s, paywalls, YouTube links, PDFs.
     Firecrawl skills are available; plain fetch + readability is fine too. **Log and surface
     failures loudly — never silently drop a source.**
   - Chunk ~800 tokens / ~100 overlap → roughly 5–10k chunks.
   - Embed via **OpenRouter** `POST /api/v1/embeddings`, model `openai/text-embedding-3-small` —
     **the same `OPENROUTER_API_KEY` already configured.** 200 sources ≈ **pennies, one time.**
   - Write to Neon:
     ```sql
     create extension if not exists vector;
     create table library_chunks (
       id serial primary key,
       source_url   text not null,
       source_title text not null,
       chunk        text not null,
       embedding    vector(1536)
     );
     create index on library_chunks using hnsw (embedding vector_cosine_ops);
     ```

3. **`course/lib/library.ts`** (new) — `searchLibrary(question: string, k = 6): Promise<string>`.
   Embed the question (one OpenRouter call), then one SQL round-trip:
   `select source_title, source_url, chunk from library_chunks order by embedding <=> $1 limit 6`.
   Use **`@neondatabase/serverless` over HTTP** so it runs in a Vercel function with no pooler.
   Return a formatted block: `[1] "Title" (url)\n<chunk>\n…`

4. **Wire it in** — the one change above.

5. **Citations.** Add a `Citations` component so library-sourced claims carry title + URL, and a
   `SYSTEM_PROMPT` rule telling the model to cite when it uses the library. **See convention #1 —
   you must add it in TWO places.** This is the only UI addition.

6. **Guardrails**
   - Cap library grounding at **~4k tokens** — free models are rate-limited and the context
     already carries a course digest.
   - **Skip the library call entirely** for course-mechanics questions ("how do I install Claude
     Code") — it only burns latency.

### Env vars
- `OPENROUTER_API_KEY` — **already set**: `course/.env.local` (gitignored) *and* Vercel
  Production/Preview/Development.
- `DATABASE_URL` (Neon) — **you must add it**, locally and via `vercel env add`.

### Escape hatch if the ingest turns into a swamp
**Gemini API File Search** (free tier, 1 GB) will happily eat PDFs and awkward files and return
`file_citation` annotations. But it forces *generation* onto Gemini, which means re-validating
OpenUI Lang output and losing the OpenRouter fallback cascade. Use it for **retrieval only**
(ignore its prose, read the citations). It is the escape hatch, **not the plan.**

---

## PROJECT CONVENTIONS — read before writing a line

**Stack:** Next.js 16 App Router · React 19 · TS · Tailwind **v4, CSS-first — there is NO
`tailwind.config.ts`** (tokens live in `course/app/globals.css`) · RetroUI (**Radix** variant).

**Hard rules that will bite you:**

1. **NEVER import `@openuidev/react-lang` in a server route.** It calls `React.createContext` at
   import time, which doesn't exist in the RSC/server runtime. That's why the system prompt is
   **generated at build time** (`scripts/gen-prompt.mjs` → `content/system-prompt.ts`) and the
   route imports a plain string. Component **schemas** live in `lib/openui-spec.mjs` (Node-safe,
   no JSX); **renderers** live in `lib/openui-library.tsx` (`"use client"`). Same schemas, two
   consumers, no drift. **A new `Citations` component must be added to BOTH.**

2. **Wire format:** `openAIMessageFormat` sends `content` as an **array of parts**, not a string.
   `route.ts` has `flattenContent()` for exactly this. (A string-only filter here once caused a
   silent 400 that `curl` couldn't reproduce, because curl sent strings and the browser didn't.)

3. **Reasoning models leak `<think>` traces into `content`** even with `reasoning.exclude` set
   (observed on Nemotron). `route.ts` line-filters the stream. **Don't remove it.**

4. **RetroUI = Radix variant:** `asChild`, **not** `render={}`. Accordion needs
   `type="single" collapsible`. `<Select>` has **no `items` prop**. **There is no `<Text>`
   component.** Sub-components are flat (`CardHeader`, not `Card.Header`).

5. **Grid items default to `min-width: auto`** and will inflate the track past the viewport. Use
   `[&>*]:min-w-0`. **This has bitten this project three times.**

6. **There is deliberately NO `overflow-x: hidden` on html/body.** It hides overflow instead of
   preventing it, and it was masking two real bugs. Don't "fix" its absence.

7. **Never hardcode hex** — use tokens. (Terminal colours are the sole exception and have their
   own `--terminal-*` tokens, identical in both themes.)

8. **`text-white` on `bg-destructive` is a dark-mode contrast failure** (2.78:1). Use
   `text-destructive-foreground`.

**Gates. These FAIL the build; they do not warn. Your new script must join them:**

```bash
cd course
npm test          # node:test — 21/21. No test framework, no new deps.
npx tsc --noEmit
npm run build     # prebuild: gen:samples → gen:content → gen:walkthroughs → gen:prompt
npm run audit     # Playwright: all 21 pages @320px, zero h-scroll, ≥44px tap targets
```

`npm run audit` is the mobile/a11y gate and **must stay green.** Run it before claiming done.

**No new npm dependencies** without a real reason. `@neondatabase/serverless` is a justified
exception here.

**Voice:** plain English for a non-technical station person. Warm, concrete, never hypey.
Translate jargon in the same breath. Guardrails (donor PII, unpublished journalism, FCC
underwriting compliance) go **first** — never buried.

---

## The one cultural thing to absorb

This site's credibility rests on **not overstating.**

It says "**9** mindset shifts" because the source only names 9 — even though the chapter is
titled "12". The cost simulator **refuses** to model the claude.ai web cache TTL because that TTL
isn't publicly documented. The recorded sessions are real, and turns were only ever *removed*,
never added — and when the flagship recording turned out to contain a **real, uncorrected Claude
error** (it claims five donors gave $1,000, ~6% of the total; actually **35 donors, 45%**), we
**left the turn untouched** and wrote a verify check that names it:

> *"Claude sounds exactly as certain when it is wrong as when it is right."*

**Hold that bar.** If the ingest drops 40 of the 200 sources, **say so on the page.** Don't round up.

---

## Reference material — read these, don't re-derive them

| What | Where |
|---|---|
| Spec style/bar this project expects | `docs/superpowers/specs/2026-07-12-walkthroughs-design.md` |
| Plan style expected | `docs/superpowers/plans/2026-07-12-walkthroughs.md` |
| Design system + every RetroUI gotcha | `course/DESIGN.md` |
| **The integration point** | `course/app/api/chat/route.ts` (line 153) |
| The retriever to mirror | `course/lib/retrieval.ts` (`buildGrounding`) |
| Model cascade + empirical benchmark results | `course/lib/models.ts` |
| Mobile/a11y gate | `course/scripts/audit.mjs` |
| Notebook memory (ID, framing, source buckets) | `~/.claude/projects/-Users-tarikmoody-Documents-Projects-claudecode-publicradio/memory/notebooklm-public-media-ai-library.md` |
| Full task notes | Task list, task #7 |

---

## Suggested skills for the next session

1. **`superpowers:brainstorming` — start here.** Real unresolved design questions deserve 10
   minutes of pushback before any code: How do we get the sources out (Takeout vs Chrome
   extension)? What happens to the ~20% of URLs that 403 or are YouTube links? Do library answers
   get their own visual treatment or blend with course answers? Does the chat *decide* when to hit
   the library, or always? **Tarik prefers Socratic dialogue on non-trivial design** (his global
   CLAUDE.md says so explicitly).
2. **`superpowers:writing-plans` → `superpowers:subagent-driven-development`** — the loop that
   shipped the walkthroughs. Fresh subagent per task, two-stage review between tasks, whole-branch
   review at the end. **The reviews caught real bugs the implementers missed every single time.**
   Do not skip them.
3. **`neon-postgres`** — pgvector schema + Neon specifics. A Neon MCP is connected.
4. **`firecrawl-*`** — if plain fetch chokes on the 200 URLs.
5. **Not `notebooklm`.** The skill exists, but see the research conclusion. It won't help here.

**Don't start on `main`.** Branch first (e.g. `feat/library-retrieval`). Tarik approved a feature
branch for the last piece of work and it made the final review markedly cleaner.
