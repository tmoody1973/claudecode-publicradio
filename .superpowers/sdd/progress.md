# SDD progress — library retrieval

(The previous ledger for `feat/walkthroughs` is superseded — that branch is merged;
its record lives in git history.)

Plan:   docs/superpowers/plans/2026-07-12-library-retrieval.md
Spec:   docs/superpowers/specs/2026-07-12-library-retrieval-design.md
Branch: feat/library-retrieval
Merge-base: 5c509b2 (the plan commit; branch started from c39635f on main)

## Pre-flight decisions (binding)
1. NO DATABASE. The spec deleted Neon/pgvector — 292 pointer-sized records (~18k tokens)
   is a SMALLER haystack than the course digest lib/retrieval.ts already scores in-process.
   searchLibrary is SYNCHRONOUS. If a `Promise.all` or an `await searchLibrary` appears in
   route.ts, someone has re-added the database.
2. NO NEW NPM DEPENDENCIES. Zero. (`@neondatabase/serverless` was withdrawn with the DB.)
   Baseline: 14 deps. package.json may differ from main ONLY in `scripts`.
3. POINTER, NOT KNOWLEDGE BASE. The chat has NOT read the library sources. It points at
   them. No quoting, no summarising, no attributing a claim to them, no inline [N] markers.
4. AN LLM ASSIGNS BUCKETS (a correctable label). AN LLM NEVER WRITES DESCRIPTIONS (an
   uncheckable claim). Descriptions come from the publisher's own og:description or they
   do not exist. A failed fetch => description: null, descriptionSource: "none".
5. NEVER SILENTLY DROP A SOURCE. All 292 survive into library.json. Coverage is reported
   loudly and never rounded up.
6. STOPWORD LISTS ARE DELIBERATELY NOT SHARED with lib/retrieval.ts. The corpora need
   different lists: retrieval.ts stops "claude"/"code"/"station"; the library must ALSO
   stop "ai"/"artificial"/"intelligence"/"public"/"media" — those appear across most of
   292 sources about AI in public media and discriminate nothing. Sharing one list would
   degrade both. This is a stated spec relationship, not an oversight.
7. bucketLabel is DENORMALISED into every library.json record so lib/library-search.mjs
   (app code) never imports BUCKETS out of scripts/ (build tooling). App code must not
   depend on the scripts directory.

## Environment notes (carried over from the walkthroughs run — still true)
- `node --test scripts/lib/` (bare dir) throws MODULE_NOT_FOUND on Node 26.
  Use the GLOB form: `node --test scripts/lib/*.test.mjs lib/*.test.mjs`.
- `text-white` on `bg-destructive` is a dark-mode contrast failure (2.78:1).
  Use `text-destructive-foreground`.
- Flex/grid children need `min-w-0` or they inflate the track past a 320px viewport.
  This has bitten the project three times.

## Tasks
- [x] 1 export the notebook — COMPLETE (commits dad0584..deaabad, review clean)
      292 sources verified in the artifact. NOTE: the implementer rewrote `prebuild`
      (out of scope — the plan had misquoted it); I reverted it byte-identical to main
      and corrected the plan. package.json now differs from main ONLY by library:export.
- [x] 2 pure indexing helpers + tests — COMPLETE (commits e560eac..0a182ff, review clean after 2 fix rounds)
      43 tests. Reviews caught TWO real bugs that fixtures missed, both by running the
      helpers over the real 292 titles:
        (a) "GitHub - tmoody1973/gauntlet · GitHub" cleaned to just "GitHub" (repo name eaten)
        (b) the fix then OVERSHOT, blocking 13 legitimate strips ("GenAI Guidelines | KQED")
      Final: · is a separator; a tail with "/" is never a publisher; a strip may not leave
      <2 REAL words (separator tokens don't count); loop cap 3 (NOT 5 — the fixer proved
      empirically that 5 strips "In the Age of AI | FRONTLINE" down to "In the Age of AI").
      Verified independently: 173/292 titles cleaned, 292/292 reachable, 285 direct / 7 notebook.
- [ ] 3 indexing script (scripts/index-library.mjs, content/library.json)
- [ ] 4 retriever + tests (lib/library-search.mjs/.d.mts, lib/library.ts)
- [ ] 5 Sources component (openui-spec.mjs + openui-library.tsx)
- [ ] 6 wire into the chat (app/api/chat/route.ts)
- [ ] 7 gates (test, tsc, build, audit + honesty invariants)

## Minor findings (for the final whole-branch review to triage)
(none yet)
