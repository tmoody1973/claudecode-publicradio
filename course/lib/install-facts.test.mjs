import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  CHECKED_ON,
  SOURCES,
  TABS,
  PREREQS,
  MAC_STEPS,
  WINDOWS_STEPS,
  TROUBLE,
} from "./install-facts.mjs";

test("every source is an absolute https URL", () => {
  for (const [key, url] of Object.entries(SOURCES)) {
    assert.ok(url.startsWith("https://"), `${key} is not https: ${url}`);
    assert.doesNotThrow(() => new URL(url), `${key} is not a valid URL: ${url}`);
  }
});

test("every prerequisite cites a source that exists in SOURCES", () => {
  const known = new Set(Object.values(SOURCES));
  for (const p of PREREQS) {
    assert.ok(p.source, `prerequisite "${p.label}" has no source`);
    assert.ok(known.has(p.source), `prerequisite "${p.label}" cites an unknown source`);
  }
});

test("every troubleshooting row cites a source that exists in SOURCES", () => {
  const known = new Set(Object.values(SOURCES));
  for (const t of TROUBLE) {
    assert.ok(known.has(t.source), `"${t.symptom}" cites an unknown source`);
  }
});

test("the three tabs are named, and none of them is described as a separate product", () => {
  assert.deepEqual(TABS.map((t) => t.name), ["Chat", "Cowork", "Claude Code"]);
  const blob = JSON.stringify(TABS).toLowerCase();
  assert.ok(!/three products|separate product|three things/.test(blob));
});

test("the Windows path names Git — without it, local sessions silently fail", () => {
  // This is the single most valuable fact on the page. If it ever drops out, the page
  // stops solving the problem it exists to solve.
  const blob = JSON.stringify(WINDOWS_STEPS).toLowerCase();
  assert.ok(blob.includes("git"), "the Windows steps must tell people to install Git");
});

test("steps are numbered from 1, with no gaps", () => {
  for (const steps of [MAC_STEPS, WINDOWS_STEPS]) {
    steps.forEach((s, i) => assert.equal(s.n, i + 1));
  }
});

test("every step says what you will actually see", () => {
  for (const s of [...MAC_STEPS, ...WINDOWS_STEPS]) {
    assert.ok(s.youWillSee && s.youWillSee.length > 10, `step ${s.n} doesn't say what you'll see`);
  }
});

test("we never assert where Cowork is available", () => {
  // Anthropic's rollout language dates from ~Feb 2026 and could not be verified.
  // The page must say "open the app and look for the tab", never "it's live on X".
  const blob = JSON.stringify({ TABS, PREREQS, TROUBLE }).toLowerCase();
  assert.ok(!/rolling out|rollout|generally available|beta on/.test(blob));
});

test("CHECKED_ON is a real, human-readable date", () => {
  assert.match(CHECKED_ON, /^\d{1,2} \w+ \d{4}$/);
});

// --- The correction also has to reach the chat, not just this page ---------------
// content/course.json is what lib/retrieval.ts grounds the chat with. These pin the
// data half of that fix: module 1's Cowork concept must stay corrected, and the
// conceptsNote that overrides the video's wrong claim must still exist and name the
// video. (The other half — that retrieval.ts actually SENDS conceptsNote to the
// model — is checked by grepping lib/retrieval.ts in the verification step; a data
// fixture can't observe that.)
const COURSE = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "content", "course.json"), "utf8"),
);
const m1 = COURSE.modules.find((m) => m.number === 1);

test("module 1's Cowork concept no longer calls Chat/Cowork/Code three separate things", () => {
  assert.ok(m1, "module 1 not found in content/course.json");
  const blob = JSON.stringify(m1.concepts).toLowerCase();
  assert.ok(!/three separate products|three things/.test(blob));
});

test("module 1 carries a non-empty conceptsNote", () => {
  assert.ok(typeof m1.conceptsNote === "string" && m1.conceptsNote.trim().length > 0);
});

test("module 1's conceptsNote names what the video got wrong", () => {
  assert.match(m1.conceptsNote.toLowerCase(), /video/);
});
