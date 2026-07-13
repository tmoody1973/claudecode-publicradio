import { test } from "node:test";
import assert from "node:assert/strict";
import { createParser } from "@openuidev/react-lang";
import { createLineFilter } from "./stream-filter.mjs";
import { buildCourseLibrary } from "./openui-spec.mjs";

/** Run a whole model response through the filter, in one go. */
function run(text, allowedIds) {
  const f = createLineFilter(allowedIds);
  return f.push(text) + f.flush();
}

/** Run it the way the route really does: split into ragged chunks, mid-line. */
function runStreamed(text, allowedIds, chunkSize = 7) {
  const f = createLineFilter(allowedIds);
  let out = "";
  for (let i = 0; i < text.length; i += chunkSize) {
    out += f.push(text.slice(i, i + chunkSize));
  }
  return out + f.flush();
}

// ─── the pre-existing behaviour, which must not regress ──────────────────────

test("drops everything before the first root =", () => {
  const out = run(`Sure! Here is your answer:\n\nroot = Answer([p1])\np1 = Paragraph("hi")`, []);
  assert.equal(out, `root = Answer([p1])\np1 = Paragraph("hi")`);
});

test("drops markdown fences", () => {
  const out = run("```openui\nroot = Answer([p1])\np1 = Paragraph(\"hi\")\n```", []);
  assert.equal(out, `root = Answer([p1])\np1 = Paragraph("hi")\n`);
});

test("drops <think> blocks", () => {
  const out = run(
    `<think>\nThe user wants X. I should root = Answer(...)\n</think>\nroot = Answer([p1])\np1 = Paragraph("hi")`,
    [],
  );
  assert.equal(out, `root = Answer([p1])\np1 = Paragraph("hi")`);
});

// ─── provenance: the whole point ─────────────────────────────────────────────

test("keeps ids that were actually retrieved this turn", () => {
  const out = run(`root = Answer([p1, src])\nsrc = Sources([51, 91])\np1 = Paragraph("hi")`, [
    51, 91, 14, 223,
  ]);
  assert.match(out, /^src = Sources\(\[51, 91\]\)$/m);
});

test("strips ids that were NOT retrieved this turn", () => {
  // 8, 21 and 17 are the ids in the system prompt's own few-shot example. They are real,
  // they resolve against LIBRARY_INDEX, and before this filter existed they rendered.
  const out = run(`root = Answer([p1, src])\nsrc = Sources([8, 21, 51])\np1 = Paragraph("hi")`, [
    51, 91, 14, 223,
  ]);
  assert.match(out, /^src = Sources\(\[51\]\)$/m);
  assert.doesNotMatch(out, /\b8\b|\b21\b/);
});

test("drops the whole Sources line when NO id survives", () => {
  const out = run(
    `root = Answer([p1, src, f])\nsrc = Sources([8, 21, 17])\np1 = Paragraph("hi")\nf = FollowUps(["a"])`,
    [51, 91, 14, 223],
  );
  assert.doesNotMatch(out, /Sources/);
  assert.match(out, /^p1 = Paragraph\("hi"\)$/m);
  assert.match(out, /^f = FollowUps/m);
});

test("no library block this turn => every Sources line is dropped", () => {
  // "How do I install Claude Code on my laptop?" retrieves nothing, so the route sends no
  // LIBRARY block — but the few-shot examples are still in the prompt on every turn.
  const out = run(`root = Answer([p1, src])\nsrc = Sources([8, 21, 17])\np1 = Paragraph("hi")`, []);
  assert.doesNotMatch(out, /Sources/);
});

test("a fabricated id that is out of range is stripped too", () => {
  const out = run(`root = Answer([src])\nsrc = Sources([9999, 51])`, [51]);
  assert.match(out, /^src = Sources\(\[51\]\)$/m);
});

test("dedupes repeated ids", () => {
  const out = run(`root = Answer([src])\nsrc = Sources([51, 51, 91])`, [51, 91]);
  assert.match(out, /^src = Sources\(\[51, 91\]\)$/m);
});

test("a Sources call we cannot parse does not render", () => {
  // Cannot prove provenance => must not become a citation.
  const out = run(`root = Answer([src])\nsrc = Sources(ids)\np1 = Paragraph("hi")`, [51]);
  assert.doesNotMatch(out, /Sources/);
  assert.match(out, /^p1 = Paragraph\("hi"\)$/m);
});

test("swallows the continuation lines of a Sources call split across lines", () => {
  const out = run(
    `root = Answer([src, p1])\nsrc = Sources([\n  51,\n  8\n])\np1 = Paragraph("hi")`,
    [51],
  );
  assert.doesNotMatch(out, /Sources|51|\b8\b/);
  assert.equal(out, `root = Answer([src, p1])\np1 = Paragraph("hi")`);
});

test("holds up under a chunked stream that splits mid-line", () => {
  const text = `root = Answer([p1, src, f])\nsrc = Sources([8, 51, 21])\np1 = Paragraph("hi")\nf = FollowUps(["a"])\n`;
  const out = runStreamed(text, [51, 91]);
  assert.match(out, /^src = Sources\(\[51\]\)$/m);
  assert.doesNotMatch(out, /\[8,|, 21\]/);
});

test("a Sources line truncated by a dropped connection does not render", () => {
  const out = run(`root = Answer([p1, src])\np1 = Paragraph("hi")\nsrc = Sources([51, 9`, [51]);
  assert.doesNotMatch(out, /Sources/);
});

// ─── the load-bearing assumption, pinned against the REAL parser ─────────────
//
// Dropping a Sources line leaves `src` referenced in `root = Answer([...])` — line 1,
// already streamed, unrecallable — with no definition. The whole no-buffering design
// rests on that being harmless. Do not take it on trust; assert it.

const parser = createParser(buildCourseLibrary().toJSONSchema(), "Answer");
const blocksOf = (r) => (r.root?.props?.blocks ?? []).map((b) => b.typeName);

test("PARSER: a dangling root reference is dropped cleanly, with no error", () => {
  const r = parser.parse(`root = Answer([p1, src, f])\np1 = Paragraph("hi")\nf = FollowUps(["a"])`);
  assert.deepEqual(r.meta.errors, []);
  assert.deepEqual(r.meta.unresolved, ["src"]);
  assert.deepEqual(blocksOf(r), ["Paragraph", "FollowUps"]);
});

test("PARSER: filtered output of a fully-stripped Sources block still parses", () => {
  const model = `root = Answer([p1, src, f])\nsrc = Sources([8, 21, 17])\np1 = Paragraph("hi")\nf = FollowUps(["a"])`;
  const r = parser.parse(run(model, [51, 91]));
  assert.deepEqual(r.meta.errors, []);
  assert.deepEqual(blocksOf(r), ["Paragraph", "FollowUps"]);
});

test("PARSER: filtered output of a partially-stripped Sources block keeps only real ids", () => {
  const model = `root = Answer([p1, src, f])\nsrc = Sources([8, 51, 17])\np1 = Paragraph("hi")\nf = FollowUps(["a"])`;
  const r = parser.parse(run(model, [51, 91]));
  assert.deepEqual(r.meta.errors, []);
  assert.deepEqual(blocksOf(r), ["Paragraph", "Sources", "FollowUps"]);
  const src = r.root.props.blocks.find((b) => b.typeName === "Sources");
  assert.deepEqual(src.props.ids, [51]);
});
