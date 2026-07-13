/**
 * Synchronous install-facts grounding for the chat. Mirrors lib/library.ts's shape: a
 * cheap gate decides IF the block fires, and when it does, the block is built straight
 * from lib/install-facts.mjs — never retyped by hand, so the two can't drift.
 *
 * WHY THIS EXISTS: lib/retrieval.ts's buildGrounding() only ever sends the 10 course
 * modules. Asked how to install Claude Code, the model filled the gap from its own
 * priors and invented a "Windows firewall exception" step — plausible, confident, and
 * wrong. The real trap (no Git on Windows, local sessions silently do nothing) lived
 * three clicks away on /install and never reached the model. This is how it gets there.
 *
 * Plain .mjs (no JSX, no React) so node:test can test it and the server route can import
 * it directly — same pattern as lib/library-search.mjs / lib/install-facts.mjs. Imports
 * ONLY lib/install-facts.mjs.
 */

import {
  CHECKED_ON,
  PREREQS,
  MAC_STEPS,
  WINDOWS_STEPS,
  TROUBLE,
} from "./install-facts.mjs";

/**
 * Reasonably generous on purpose, per the design this mirrors (lib/library.ts): a false
 * positive here costs a few hundred tokens of grounding the model didn't need. A false
 * negative lets the model invent an install step — the exact defect this file fixes.
 */
const INSTALL_PATTERNS = [
  /\binstall(ing|ation|ed)?\b/i,
  /\bdownload(ing|ed)?\b/i,
  /\bset ?up\b/i,
  /\bget(ting)? started\b/i,
  /\bhow do i start\b/i,
  /\bterminal\b/i,
  /\bmac(os)?\b/i,
  /\bwindows\b/i,
  /\bpc\b/i,
  /\blaptop\b/i,
  /\bsign(ing)? ?in\b/i,
  /\blog ?in\b/i,
  /\bsubscription\b/i,
  /\bplan\b/i,
  /\bpaid\b/i,
  /\bpay\b/i,
  /\bcowork\b/i,
  /\bwhich app\b/i,
  /\bdesktop app\b/i,
  /\bno terminal\b/i,
];

/** True when the question is about getting set up — installing, downloading, signing
 * in, or picking an app/plan — as opposed to an ordinary course question. */
export function isInstallQuestion(question) {
  const q = String(question ?? "");
  return INSTALL_PATTERNS.some((re) => re.test(q));
}

function fmtPrereq(p) {
  return `- ${p.label} — ${p.detail} (source: ${p.source})`;
}

function fmtStep(s) {
  return `  ${s.n}. ${s.do} You will see: ${s.youWillSee}`;
}

function fmtTrouble(t) {
  return `- Symptom: "${t.symptom}" -> Cause: ${t.cause} -> Fix: ${t.fix} (source: ${t.source})`;
}

/**
 * The grounding block for an install question. "" when the question isn't one — the
 * caller must then send no install block at all, same contract as formatLibraryGrounding.
 */
export function buildInstallGrounding(question) {
  if (!isInstallQuestion(question)) return "";

  return [
    `These are the ONLY install facts you have, checked against Anthropic's docs on`,
    `${CHECKED_ON}. Do NOT invent install steps, requirements, or troubleshooting beyond`,
    `what is listed below — never guess a firewall exception, an antivirus prompt, a PATH`,
    `edit, or anything else that merely sounds plausible. If someone asks about getting`,
    `set up and this block does not cover it, say you do not know and point them at the`,
    `/install page rather than filling the gap yourself.`,
    ``,
    `THE FACT PEOPLE MISS: on Windows, Claude Code's local sessions silently do nothing`,
    `unless Git for Windows is installed FIRST. There is no error message — the app just`,
    `looks broken. Always lead with this when Windows comes up.`,
    ``,
    `Chat, Cowork, and Claude Code are three TABS in one app you download once — never`,
    `describe them as separate products or separate downloads.`,
    ``,
    `## Prerequisites`,
    ...PREREQS.map(fmtPrereq),
    ``,
    `## Mac steps`,
    ...MAC_STEPS.map(fmtStep),
    ``,
    `## Windows steps`,
    ...WINDOWS_STEPS.map(fmtStep),
    ``,
    `## Troubleshooting`,
    ...TROUBLE.map(fmtTrouble),
    ``,
    `Full detail lives at the /install page — point people there for anything this block`,
    `doesn't cover.`,
  ].join("\n");
}
