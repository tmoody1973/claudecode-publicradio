# SDD progress — /install page ("Getting in the door")

Plan:   docs/superpowers/plans/2026-07-13-getting-in-the-door.md
Spec:   docs/superpowers/specs/2026-07-13-getting-in-the-door-design.md
Branch: feat/install-page
Merge-base: main @ the civic-media merge

## Pre-flight decisions (binding)
1. ROUTE IS /install, NAV LABEL "Install". NOT /start — `/guide` already exists and is already
   labelled "Start here" (it covers how to use the SITE). Two "Start here" links = a coin toss.
2. EVERY external claim carries a source URL. No claim without a link. The page's premise is
   "go check this yourself", so a dead link is self-defeating. Facts live in ONE file
   (lib/install-facts.mjs) because they WILL rot.
3. THE WINDOWS/GIT FACT IS THE POINT. Without Git installed, the desktop app's local sessions
   silently do nothing and the person gives up — and nothing else on this site ever reaches them.
   It must be impossible to miss.
4. FIX MODULE 1 IN BOTH PLACES. The chat grounds on content/digest.md. A corrected page + a chat
   still saying "three products" is WORSE than either alone — the site contradicts itself.
5. Do NOT assert where Cowork is available (Anthropic's rollout language dates from ~Feb 2026 and
   could not be verified). Say: open the app and look for the tab.
6. Flag the video's error, don't silently rewrite it — same as the course already does for
   "12 mindset shifts" that are actually 9.

## Environment notes (hard-won — do not relearn)
- `npm run audit` NEEDS A LIVE SERVER ON :3000 (`npm start`). A dead server throws
  ERR_CONNECTION_REFUSED and reports PHANTOM failures. This misled me twice.
- The audit's Radix guard (main @ e6df65d) skips aria-hidden/pointer-events:none/opacity:0
  elements. It is PROVEN to still fail on a real 20px button — I verified this myself.
- `node --test <bare-dir>` throws MODULE_NOT_FOUND on Node 26. Use the glob form.
- Flex/grid children need `min-w-0` or they blow past a 320px viewport (3 prior incidents).

## Tasks
- [ ] 1 lib/install-facts.mjs + .d.mts + tests (every claim + its source URL; verify links resolve)
- [ ] 2 fix module 1's "three products" error (m1.json, course.ts, compile-content.mjs, module page)
- [ ] 3 the /install page + 6 section components
- [ ] 4 wire it in (nav, audit PAGES, /guide link, m2 setup) + gates + chat-learned-the-correction

## Minor findings (for the final whole-branch review)
(none yet)
