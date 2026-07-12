# SDD progress — walkthroughs

Plan:   docs/superpowers/plans/2026-07-12-walkthroughs.md
Spec:   docs/superpowers/specs/2026-07-12-walkthroughs-design.md
Branch: feat/walkthroughs
Merge-base: 0fd711d36ff637a4b3d2a0d573366425cf3cf60f

## Pre-flight decisions (binding — supersede the plan text)
1. PERMISSION PROMPTS — REVISED 2026-07-12 (human decision, supersedes original):
   Permission prompts CANNOT be captured headlessly (verified against the real CLI —
   they are an interactive-TTY feature). Requiring a permission TURN would have forced
   fabrication, breaking the never-add rule. RESOLUTION: no permission turn required;
   instead a STEP must warn the prompt is coming. Validator enforces this. Sessions are
   still 100% real recordings.
   RECORDING COMMAND (proven working, produces clean newcomer-representative output):
     claude -p "<prompt>" \
       --append-system-prompt "<neutralizer: ignore PAI/Algorithm output format>" \
       --settings '{"hooks":{}}' \
       --output-format stream-json --verbose --permission-mode default
   (--bare is NOT usable: it never reads OAuth/keychain, so it cannot authenticate.)
2. TERMINAL COLOURS: no hardcoded hex. Add --terminal-bg/-fg/-dim/-chrome/-accent
   to globals.css, identical in both themes (a terminal is theme-invariant).
3. BRANCH: feat/walkthroughs.

## Tasks
- [x] 1 validator + types — COMPLETE (commits 02f7743..cc6027f, review clean)
- [x] 2 synthetic sample data — COMPLETE (commits f45bd5a..3abccf8, review clean, no findings)
- [x] 4 walkthrough section components — COMPLETE (commits 3ca47f8..3f2332a, review clean)
- [x] 3 recorded-session terminal — COMPLETE (commits 159de30..7d132ad, review clean, no findings)
- [ ] 4 walkthrough section components
- [x] 5 walkthroughs + REAL recorded sessions — COMPLETE (867f619..3a1557d, review clean after 1 Important fix)
      4 sessions, 27 real turns, 0 fabricated permission turns. Fixed: moduleNumber
      shadowing bug (walkthroughForModule now prefers flagship; guarded by validateWalkthroughSet).
- [x] 6 walkthrough pages — COMPLETE (e2a4b43..6f3bee4, review clean after 1 Important fix:
      terminal was 1655px vs 705px viewport and 'Next turn' produced NO visible change.
      Now capped at 55vh with scroll-into-view. All turns still in a11y tree.)
- [x] 7 fifty runbooks — COMPLETE (6a41132..dcf187f, review clean; 1 Minor folded into T8:
      all 50 <summary> share the identical a11y name)
- [ ] 8 wire in + audit gate

## Minor findings (for the final whole-branch review to triage)
- T1: no test exercises per-field checks on `verify` entries (check/why/ifWrong) or
  `sampleData.columns` non-empty. Code paths exist but are unexercised. Task 7's
  fixtures could cover them.
- T1 env note: `node --test scripts/lib/` (bare dir) throws MODULE_NOT_FOUND on Node 26.
  Use the glob form `node --test scripts/lib/*.test.mjs`. Applies to Tasks 5/7 too.
- SITEWIDE CONTRAST BUG (found during T3): `text-white` on `bg-destructive` is near-
  invisible in DARK mode — --destructive flips to a light coral (#ff6b6b) while
  --destructive-foreground is dark (#1a1815). T3 fixed it in the terminal by using
  `text-destructive-foreground`. The SAME bug exists in code written earlier:
  components/home/limits.tsx, lib/openui-library.tsx (Callout guardrail, color:'#fff'),
  and the use-case guardrail blocks. DESIGN.md calls WCAG AA a hard requirement.
  → Fix in Task 8 or flag to the final whole-branch review.
- T5: NONE of the 4 real recordings produced a spontaneous Claude mistake/self-correction.
  The implementer correctly REFUSED to fabricate one. Plan wanted >=1 wrong-turn+correction;
  honestly unmet rather than faked. 3 of 4 sessions still carry real friction (median-vs-average
  correction, a mistagged-genre catch, a borderline FCC call). The onboarding (w1) is
  frictionless. Acceptable — but worth telling the user.
