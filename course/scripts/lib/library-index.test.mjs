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

test("cleanTitle does not let a repo path be mistaken for a publisher", () => {
  // Real case from the export. The repo identifier is the only useful part of this title.
  assert.equal(
    cleanTitle("GitHub - tmoody1973/gauntlet · GitHub"),
    "GitHub - tmoody1973/gauntlet",
  );
});

test("cleanTitle never strips a title down to a stub", () => {
  // A publisher strip that leaves one or two words has eaten the title, not a suffix.
  assert.equal(cleanTitle("Crate - digcrate.app"), "Crate - digcrate.app");
});

test("cleanTitle strips a double suffix completely", () => {
  assert.equal(
    cleanTitle("Journalistic AI Codes of Ethics | Documentos - Universidad Complutense de Madrid"),
    "Journalistic AI Codes of Ethics",
  );
});

test("cleanTitle strips a publisher off a legitimate two-word title", () => {
  // A 2-word head is a real title, not a stub. Confirmed real cases from the export.
  assert.equal(cleanTitle("GenAI Guidelines | KQED"), "GenAI Guidelines");
  assert.equal(cleanTitle("Public Programs - BetaNYC"), "Public Programs");
  assert.equal(cleanTitle("Local News - Partnership on AI"), "Local News");
});

test("cleanTitle still refuses to reduce a title to a single word", () => {
  // One real word left = the stripper has eaten the title, not a suffix.
  assert.equal(cleanTitle("About - Some Publisher"), "About - Some Publisher");
});

test("cleanTitle strips a chain of four suffixes", () => {
  assert.equal(
    cleanTitle("In the Age of AI | FRONTLINE | PBS | Official Site | Documentary Series"),
    "In the Age of AI | FRONTLINE",
  );
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

test("parseOgTags decodes hex, decimal and named entities", () => {
  const html = `<meta property="og:description" content="NIST AI RMF&#x27;s guide &mdash; the &ldquo;right&rdquo; way&#8230;">`;
  assert.equal(parseOgTags(html).description, 'NIST AI RMF\'s guide — the "right" way…');
});

test("decodeEntities handles double-encoded entities", () => {
  // Real cases: PBS ships "&amp;nbsp;", JournalismAI ships "&amp;amp;". A single pass
  // would leave a literal "&nbsp;" / "&amp;" on the page.
  const html = `<meta property="og:description" content="Jamillah Knowles &amp;amp; Digit &amp;hellip;">`;
  assert.equal(parseOgTags(html).description, "Jamillah Knowles & Digit …");
});

test("decodeEntities leaves an unknown entity alone rather than mangling it", () => {
  const html = `<meta property="og:description" content="A &notarealentity; B">`;
  assert.equal(parseOgTags(html).description, "A &notarealentity; B");
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
