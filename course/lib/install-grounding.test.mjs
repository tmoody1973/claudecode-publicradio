import { test } from "node:test";
import assert from "node:assert/strict";
import { isInstallQuestion, buildInstallGrounding } from "./install-grounding.mjs";

test("an install question is recognised", () => {
  for (const q of [
    "How do I install Claude Code?",
    "how do i get started on windows",
    "do I need a terminal?",
    "which app do I download",
    "do I need to pay for this",
  ]) assert.ok(isInstallQuestion(q), q);
});

test("an ordinary course question is not an install question", () => {
  for (const q of [
    "How do I turn a pledge drive export into a board summary?",
    "What is a context window?",
    "Write me underwriting copy",
  ]) assert.equal(isInstallQuestion(q), false, q);
});

test("the grounding is empty for a non-install question", () => {
  assert.equal(buildInstallGrounding("How do I write underwriting copy?"), "");
});

test("the grounding names the Git-on-Windows trap — the fact people miss", () => {
  const g = buildInstallGrounding("How do I install Claude Code on Windows?");
  assert.match(g, /git/i);
});

test("the grounding forbids inventing install steps", () => {
  const g = buildInstallGrounding("How do I install Claude Code?");
  assert.match(g, /do not invent|never invent/i);
});

test("the grounding carries source links", () => {
  const g = buildInstallGrounding("How do I install Claude Code?");
  assert.match(g, /https:\/\//);
});
