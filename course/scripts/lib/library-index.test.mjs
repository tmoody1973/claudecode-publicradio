import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUCKETS,
  NOTEBOOK_URL,
  PANEL_PDF_URL,
  cleanTitle,
  publisherFromUrl,
  parseOgTags,
  resolveUrl,
  isValidBucket,
} from "./library-index.mjs";

test("cleanTitle strips a trailing publisher suffix", () => {
  assert.equal(cleanTitle("16 AI Governance Policy Examples - Madison AI"), "16 AI Governance Policy Examples");
  assert.equal(cleanTitle("2026 Best Agentic AI Courses | Research.com"), "2026 Best Agentic AI Courses");
});

test("cleanTitle keeps hyphens that are part of the title", () => {
  // Only a SHORT trailing segment is a publisher. A long one is prose.
  assert.equal(
    cleanTitle("Curating the Curators - a field guide to the people who map civic technology"),
    "Curating the Curators - a field guide to the people who map civic technology",
  );
});

test("cleanTitle prefers og:title when the export truncated the title", () => {
  assert.equal(
    cleanTitle(
      "How BBC Eye built a multi-agent AI system to sift through ten ...",
      "How BBC Eye built a multi-agent AI system to sift through ten thousand documents",
    ),
    "How BBC Eye built a multi-agent AI system to sift through ten thousand documents",
  );
});

test("cleanTitle ignores og:title when the export title is not truncated", () => {
  // og:title is often SEO junk. Only trust it to repair a truncation.
  assert.equal(cleanTitle("A perfectly good title", "Buy Now! A Perfectly Good Title | SEO Spam"), "A perfectly good title");
});

test("cleanTitle strips the (PDF) prefix", () => {
  assert.equal(cleanTitle("(PDF) Ethical guidelines for journalistic use of GenAI"), "Ethical guidelines for journalistic use of GenAI");
});

test("publisherFromUrl drops www and returns the host", () => {
  assert.equal(publisherFromUrl("https://www.poynter.org/a/b"), "poynter.org");
  assert.equal(publisherFromUrl("https://reutersinstitute.politics.ox.ac.uk/x"), "reutersinstitute.politics.ox.ac.uk");
});

test("publisherFromUrl on a bad URL returns empty string, never throws", () => {
  assert.equal(publisherFromUrl("not a url"), "");
});

test("parseOgTags reads og:title, og:description and og:site_name", () => {
  const html = `<html><head>
    <meta property="og:title" content="Real Title" />
    <meta property="og:description" content="A real description." />
    <meta property="og:site_name" content="Poynter" />
  </head></html>`;
  assert.deepEqual(parseOgTags(html), {
    title: "Real Title",
    description: "A real description.",
    siteName: "Poynter",
  });
});

test("parseOgTags falls back to the plain meta description", () => {
  const html = `<meta name="description" content="Fallback description.">`;
  assert.equal(parseOgTags(html).description, "Fallback description.");
});

test("parseOgTags decodes HTML entities", () => {
  const html = `<meta property="og:description" content="Ethics &amp; governance &quot;rules&quot;">`;
  assert.equal(parseOgTags(html).description, 'Ethics & governance "rules"');
});

test("parseOgTags returns nulls when there are no tags", () => {
  assert.deepEqual(parseOgTags("<html><body>nothing</body></html>"), {
    title: null,
    description: null,
    siteName: null,
  });
});

test("resolveUrl passes a real URL straight through", () => {
  assert.deepEqual(resolveUrl({ title: "Whatever", url: "https://npr.org/x" }), {
    url: "https://npr.org/x",
    linkKind: "direct",
  });
});

test("resolveUrl hand-maps the panel PDF to its live GitHub Pages URL", () => {
  assert.deepEqual(resolveUrl({ title: "public-media-ai-panel.pdf" }), {
    url: PANEL_PDF_URL,
    linkKind: "direct",
  });
});

test("resolveUrl sends every other URL-less source to the public notebook", () => {
  assert.deepEqual(resolveUrl({ title: "Orchestrating the Newsroom: The Rise of Agentic AI" }), {
    url: NOTEBOOK_URL,
    linkKind: "notebook",
  });
});

test("the six buckets are exactly the agreed set", () => {
  assert.deepEqual(Object.keys(BUCKETS).sort(), [
    "agents",
    "audience",
    "governance",
    "newsroom-policy",
    "other",
    "production",
  ]);
});

test("isValidBucket rejects anything an LLM might invent", () => {
  assert.equal(isValidBucket("governance"), true);
  assert.equal(isValidBucket("Governance"), false);
  assert.equal(isValidBucket("ethics-and-stuff"), false);
});
