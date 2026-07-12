# SDD progress — walkthroughs

Plan:   docs/superpowers/plans/2026-07-12-walkthroughs.md
Spec:   docs/superpowers/specs/2026-07-12-walkthroughs-design.md
Branch: feat/walkthroughs
Merge-base: 0fd711d36ff637a4b3d2a0d573366425cf3cf60f

## Pre-flight decisions (binding — supersede the plan text)
1. PERMISSION PROMPTS: record INTERACTIVELY in a real Claude Code session (default
   permission mode) so prompts genuinely fire. The never-add rule stands: a
   permission turn may only appear in a session if it was really captured.
   Subagents must NOT fabricate one.
2. TERMINAL COLOURS: no hardcoded hex. Add --terminal-bg/-fg/-dim/-chrome/-accent
   to globals.css, identical in both themes (a terminal is theme-invariant).
3. BRANCH: feat/walkthroughs.

## Tasks
- [ ] 1 validator + types
- [ ] 2 synthetic sample data
- [ ] 3 recorded-session terminal
- [ ] 4 walkthrough section components
- [ ] 5 author 4 walkthroughs + RECORD real sessions  <-- long pole, interactive
- [ ] 6 walkthrough pages
- [ ] 7 fifty runbooks
- [ ] 8 wire in + audit gate

## Minor findings (for the final whole-branch review to triage)
