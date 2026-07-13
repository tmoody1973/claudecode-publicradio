import { test } from "node:test";
import assert from "node:assert/strict";
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
