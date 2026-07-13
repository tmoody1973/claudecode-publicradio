import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tokenize, searchSources, SCORE_FLOOR } from "./library-search.mjs";

/** A tiny fixture standing in for content/library.json. */
const SOURCES = [
  {
    id: 1,
    title: "NPR Ethics Handbook: Artificial Intelligence",
    publisher: "npr.org",
    url: "https://npr.org/ethics",
    bucket: "governance",
    bucketLabel: "Ethics & governance frameworks",
    linkKind: "direct",
    description: "How NPR journalists should disclose and verify AI-assisted work.",
  },
  {
    id: 2,
    title: "Automating transcription in the newsroom",
    publisher: "bbc.co.uk",
    url: "https://bbc.co.uk/transcription",
    bucket: "production",
    bucketLabel: "Transcription & production tooling",
    linkKind: "direct",
    description: "Whisper and its rivals, tested against broadcast audio.",
  },
  {
    id: 3,
    title: "Personalising the public radio homepage",
    publisher: "current.org",
    url: "https://current.org/personalisation",
    bucket: "audience",
    bucketLabel: "Audience & personalisation",
    linkKind: "direct",
    description: "Recommendation systems and member retention.",
  },
];

test("a question matches the source whose title carries its words", () => {
  const hits = searchSources(SOURCES, "how do we handle transcription of broadcast audio?", 4);
  assert.equal(hits[0].id, 2);
});

test("a question matches on the description, not just the title", () => {
  const hits = searchSources(SOURCES, "what should we disclose when journalists use AI?", 4);
  assert.equal(hits[0].id, 1);
});

test("an off-topic question returns NOTHING — the score floor holds", () => {
  // Course mechanics. There is nothing for it in a research library, and sending
  // irrelevant sources invites the model to mention them anyway.
  assert.deepEqual(searchSources(SOURCES, "how do I install Claude Code on my laptop?", 4), []);
});

test("an empty question returns nothing", () => {
  assert.deepEqual(searchSources(SOURCES, "", 4), []);
});

test("results are capped at k", () => {
  const hits = searchSources(SOURCES, "AI transcription ethics personalisation newsroom radio", 2);
  assert.ok(hits.length <= 2);
});

test("the same URL never appears twice in one result set", () => {
  // The notebook genuinely contains 3 URLs filed twice under different titles. We keep
  // both records (never drop a source), but showing a person the same link twice in one
  // Sources block looks broken. Dedupe by URL at retrieval time, keeping the best-scoring.
  const dupes = [
    ...SOURCES,
    {
      id: 4,
      title: "Automating transcription in the newsroom: a case study series",
      publisher: "bbc.co.uk",
      url: "https://bbc.co.uk/transcription", // same URL as id 2
      bucket: "production",
      bucketLabel: "Transcription & production tooling",
      linkKind: "direct",
      description: "Whisper and its rivals, tested against broadcast audio.",
    },
  ];
  const hits = searchSources(dupes, "transcription in the newsroom", 4);
  const urls = hits.map((h) => h.url);
  assert.equal(new Set(urls).size, urls.length, "a URL was returned twice");
});

test("results carry a human-readable bucket label for the UI", () => {
  const hits = searchSources(SOURCES, "transcription", 4);
  assert.equal(hits[0].bucketLabel, "Transcription & production tooling");
});

test("tokenize drops stopwords that carry no signal in THIS corpus", () => {
  // Every source in the library is about AI in public media. Those words discriminate nothing.
  const t = tokenize("What is the AI policy for public media newsrooms?");
  assert.ok(!t.includes("ai"));
  assert.ok(!t.includes("public"));
  assert.ok(!t.includes("media"));
  assert.ok(t.includes("policy"));
  assert.ok(t.includes("newsrooms"));
});

test("SCORE_FLOOR is a positive number", () => {
  assert.ok(SCORE_FLOOR > 0);
});

// --- Real-corpus regression tests -------------------------------------------------
// The 3-source fixture above is exactly why the SCORE_FLOOR-only bug shipped: it's too
// small to have common words. These load the real 292-source library and assert
// against real behaviour.

const REAL = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "content", "library.json"), "utf8"),
).sources;

// Questions a station person would ask that the RESEARCH LIBRARY should answer.
for (const q of [
  "What are the ethics risks of using AI for transcription in our newsroom?",
  "How do other public radio stations use AI for audience personalisation?",
  "Should we let AI write underwriting copy?",
  "Do we need an AI policy for our newsroom?",
  "What do other stations disclose to listeners about AI?",
]) {
  test(`real corpus: the library answers "${q.slice(0, 40)}…"`, () => {
    assert.ok(searchSources(REAL, q, 4).length > 0, "expected at least one source");
  });
}

// Course-mechanics questions. The research library has NOTHING for these, and handing the
// model irrelevant sources only invites it to mention them. These MUST return [].
for (const q of [
  "How do I install Claude Code on my laptop?",
  "What is a terminal and how do I open it?",       // leaked 4 open-data articles before the gate
  "Can you help me write a thank-you note to a donor?", // leaked a civic-engagement article
  "What is a context window?",
  "How do I make a folder on my computer?",
  "What is an AI agent?",                            // a glossary question — the course answers it
]) {
  test(`real corpus: no library block for "${q.slice(0, 40)}…"`, () => {
    assert.deepEqual(searchSources(REAL, q, 4), [], "a course question leaked library sources");
  });
}

test("real corpus: a single RARE token is enough, a single COMMON one is not", () => {
  // "underwriting" is in 1 of 292 sources — specific enough to stand alone.
  assert.ok(searchSources(REAL, "underwriting", 4).length > 0);
  // "open" is in 11 — a common verb, and on its own it means nothing.
  assert.deepEqual(searchSources(REAL, "open", 4), []);
});

test("real corpus: the same URL is never returned twice", () => {
  // 3 URLs are filed twice in the notebook; all 7 notebook-only sources share one URL.
  const hits = searchSources(REAL, "AI ethics governance policy journalism newsroom", 8);
  const urls = hits.map((h) => h.url);
  assert.equal(new Set(urls).size, urls.length);
});

test("real corpus: a long keyword-enumerating title does not outrank a better-matched source", () => {
  // This repo's title lists half the station vocabulary ("public radio stations… development,
  // marketing, underwriting, programming"), so raw keyword overlap used to make it win queries
  // it had no business winning. Length normalisation must demote it.
  const hits = searchSources(REAL, "How do other public radio stations use AI for audience personalisation?", 4);
  assert.ok(hits.length > 0);
  assert.ok(
    !/public-radio-agents/.test(hits[0].title),
    `the keyword magnet ranked #1: ${hits[0].title}`,
  );
});

test("real corpus: the one source that mentions underwriting is still findable", () => {
  // It is the ONLY source in 292 containing the word. Returning it is honest, not a bug.
  const hits = searchSources(REAL, "Should we let AI write underwriting copy?", 4);
  assert.ok(hits.length > 0, "the library's only underwriting source must still surface");
});
