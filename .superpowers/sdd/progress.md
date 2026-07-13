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
- [x] 3 indexing script — COMPLETE (64b53e3..fcad8ac, review clean after 2 fix rounds)
      FINAL DATA: 292 sources | 198 with a description | 94 title-only | 0 dropped.
      All descriptions verified LIVE against publishers' own og:description (4 spot-checks,
      character-for-character). No LLM ever wrote a description. Buckets: single model
      (nemotron), `classifiedBy` on every record. Max description 300 chars.
      Reviews caught 4 real bugs: (a) 42 records shipped raw HTML entities; (b) the fix
      only decoded one level — 3 publishers double-encode (&amp;amp;), so it now loops to
      a fixpoint; (c) bucket classification had silently split across 2 models at a
      rate-limit boundary; (d) 3 publishers stuff the WHOLE ARTICLE into og:description
      (one was 22,515 chars — would have blown the entire 4k grounding budget alone).
      NOTE FOR TASK 4/5: LibrarySource now also has `classifiedBy: string`.
- [x] 4 retriever — COMPLETE (054bb97..2b7c6e4, review clean after 2 fix rounds)
      74 tests, tsc clean, synchronous, zero imports in library-search.mjs.
      Reviews/verification caught THREE real bugs, none of which fixtures could have found:
        (a) "how do I install Claude Code" leaked, matching "Code for America"/"Code.org"
            -> "code" added to the library stopword list
        (b) SCORE_FLOOR=3 (one title-word match) leaked badly: "how do I OPEN a terminal"
            returned 4 open-data articles; "thank-you NOTE to a donor" returned civic-tech.
            NO floor separates these. Replaced with a document-frequency GATE: a question
            qualifies only if >=2 tokens match the corpus, OR exactly 1 does and it is RARE
            (df <= 5, e.g. "underwriting" = 1 of 292). Validated on 16 real questions.
        (c) One source was a KEYWORD MAGNET — the public-radio-agents repo title enumerates
            half the station vocabulary — and won queries on length alone. Fixed with IDF
            weighting + BM25 length normalisation (b=0.75). SCORE_FLOOR now 2.5.
      Tests now run against the REAL 292-source corpus, not just a 3-source fixture. That
      change is what caught (b) and (c).
- [x] 5 Sources component — COMPLETE (e3398da, review clean; 2 findings folded into T6)
      In BOTH openui-spec.mjs and openui-library.tsx + Answer union + components[] +
      componentGroups + ADDITIONAL_RULES. Generated prompt carries "have NOT read",
      "never quote", "Never invent a source". Rendered for real: a 232-char title wraps
      at 320px with no h-scroll. All gates green (tsc/build/74 tests/audit).
      TWO REVIEW FINDINGS DEFERRED INTO TASK 6 (they belong there):
        (a) CRITICAL-ish: Sources props are FREE STRINGS the model emits. Nothing stops it
            fabricating a plausible source+URL, which would render identically to a vetted
            one. On THIS site that is self-defeating. FIX IN T6: model emits IDs only; the
            renderer resolves them from the real library. An invented id renders nothing.
        (b) Minor a11y: card header is <h3> while the sibling UseCaseCard uses <h4>,
            giving a non-monotonic heading outline. Fix to <h4>.
- [x] 6 wire into the chat — COMPLETE (759360b, acceptance bar met)
      Synchronous searchLibrary + conditional system block. HARDENED: the model emits
      IDS ONLY; the renderer resolves them against a generated slim client index
      (content/library-index.ts, 72KB, no descriptions). A fabricated id renders NOTHING.
      CRITICAL BUG CAUGHT HERE: the feature silently did not fire — 0 Sources blocks in 11
      runs despite 4 real hits every time. FOUR causes, only two of which I predicted:
        1. the prompt led with a prohibition ("Sources ONLY when...") -> positive default
        2. no EXAMPLE showed a Sources block -> added one
        3. OpenUI Lang commits the block list on LINE 1 (`root = Answer([...])`), so
           "END your answer with Sources" is unreachable advice. Moved the instruction to
           root-array composition. One response was truncated mid-Sources at max_tokens
           (raised 1600 -> 2000).
        4. the examples accidentally taught "UseCaseCard shape => no Sources" — every miss
           had the identical root [p1, uc1, guard, follow]. A third example broke it.
      MEASURED ON THE REAL CHAT (5 runs each): ethics/transcription 5/5, AI policy 4/5,
      what stations disclose 5/5, install Claude Code 0/5, context window 0/5.
      ZERO invented ids across ~60 calls.
- [x] 7 gates — VERIFIED by the controller directly:
      74 tests pass | tsc clean | build clean | audit: only /cost fails, and it FAILS ON
      MAIN TOO (verified by checkout) — pre-existing, not a regression from this branch.
      Honesty invariants all hold: 292 sources, count truthful, 198 + 94 = 292, every
      source reachable, NO description written by an LLM. 14 deps (unchanged).
      package.json differs from main ONLY in `scripts`.

## Minor findings (for the final whole-branch review to triage)
- T3: `other` bucket is 24% of the library. A reviewer sampled 10 and judged them genuine
  refusals-to-force-fit, not the model giving up — but a human pass over the `other` pile
  would likely reclassify a few into newsroom-policy/governance. Buckets are a correctable
  label in a committed JSON file; this is cheap to fix by hand later.
- T3: the fixpoint entity decoder over-decodes text that legitimately wants to DISPLAY
  "&amp;". Zero of the 292 real sources hit this; three hit the opposite case. Deliberate
  trade, pinned by a test.
- T4 RETRIEVAL QUALITY — the honest read, for the FINAL REVIEW and for Tarik:
  Safety is solid (course questions leak nothing). Relevance is GOOD, NOT GREAT.
    "Do we need an AI policy for our newsroom?"  -> 4/4 relevant. Excellent.
    "Is it ethical to clone a host voice?"       -> all ethics sources, none about voice
                                                    cloning. The library may have none.
    "audience personalisation"                   -> #1 is "City Bureau", a civic-journalism
                                                    org the LLM MIS-BUCKETED as Audience.
  Two separable causes: (1) keyword retrieval has a real semantic ceiling — this is exactly
  the evidence the SPEC named as the trigger for rung 2 (precomputed embeddings in the JSON,
  cosine in-process, STILL no database); (2) some LLM bucket labels are wrong and feed bad
  retrieval — buckets are hand-correctable in a committed JSON file.
  DECISION DEFERRED TO TARIK after the branch is green. Do not climb the ladder unasked.


## FINAL WHOLE-BRANCH REVIEW (opus) + fixes — COMPLETE
Verdict: MERGE. It found what 7 prior reviews missed:
  1. The renderer COMMENT claimed a fabricated id was "structurally unrenderable". FALSE —
     LIBRARY_INDEX holds all 292, so ANY id in 1-292 rendered, including ids never retrieved
     this turn. A RANGE check wearing the costume of a PROVENANCE check. Worse: the system
     prompt's few-shot examples carry REAL resolvable ids (Sources([8,21,17])) on EVERY turn.
     The "zero invented ids" metric was structurally blind to it — a copied example id IS valid.
     FIXED PROPERLY (not by softening the comment): app/api/chat/route.ts now intersects the
     model's emitted Sources ids with the ids actually retrieved this turn, in the existing
     line filter. Verified end-to-end: model emitted Sources([192,109]); retriever had
     returned [192,76,133,109]. A strict subset. 16 new tests pin it.
  2. The prompt ASSERTED "these sources genuinely match" — which the retriever's own comment
     documents as sometimes false — and disarmed the model's relevance check. Copy rewritten
     to be true while keeping a positive default.
  3. FIRING WAS PHRASING-FRAGILE: 3 plausible station questions retrieved 4 good sources each
     and emitted NOTHING, 0/12. Now 5/5 on all six phrasings.
  4. 74KB library index shipped to EVERY visitor of EVERY page via the root layout. Now lazy.
  5. The 7 notebook-only sources rendered as unlabelled links (a spec §4 promise). Now labelled.
  6. Dead exports removed.

## FINAL STATE — verified by the controller directly
90 tests pass | tsc clean | build clean | audit 21/21 pages CLEAN.
CORRECTION: the "/cost fails on main" finding was a STALE-SERVER ARTIFACT. The audit needs a
live server on :3000; a dead/stale process produced phantom failures. With a clean prod server,
ALL 21 pages pass. Nothing is failing.

## OPEN — TARIK'S CALL, do not decide unasked
- RUNG 2 (embeddings)? The final reviewer argued AGAINST it, with evidence: the observed
  failures were COMPLIANCE/PHRASING failures, not RECALL failures — the retriever found 4 good
  sources every time; the model just didn't emit the block. Embeddings would have fixed none of
  them. Those are now fixed. Do not climb the ladder on a hunch.
- `other` bucket = 24%; some labels wrong (City Bureau -> "Audience & personalisation").
  Hand-correctable in committed JSON. Non-blocking: a bucket is a badge, not a claim.
- 94 of 292 sources have no description. NOT stated on any user-visible surface — but no
  surface implies otherwise either, and the spec's own /library page is a declared non-goal.
  The spec contradicts itself here. Worth resolving when/if a /library page lands.
