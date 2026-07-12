/**
 * Merges content/walkthroughs/*.json + their sessions into content/walkthroughs.json,
 * validating everything. Fails the build on any violation — a walkthrough that lies
 * to a station person is worse than no walkthrough.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWalkthrough, validateWalkthroughSet } from "./lib/validate-walkthroughs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "content", "walkthroughs");
const PUBLIC = join(__dirname, "..", "public");
const OUT = join(__dirname, "..", "content");

const files = readdirSync(SRC).filter((f) => /^w\d+-.*\.json$/.test(f)).sort();

const walkthroughs = files.map((f) => {
  const w = JSON.parse(readFileSync(join(SRC, f), "utf8"));
  const sessionPath = join(SRC, "sessions", `${w.slug}.json`);
  if (!existsSync(sessionPath)) {
    throw new Error(`${w.id}: no recorded session at content/walkthroughs/sessions/${w.slug}.json`);
  }
  w.session = JSON.parse(readFileSync(sessionPath, "utf8"));
  return w;
});

const sampleFileExists = (p) => existsSync(join(PUBLIC, p.replace(/^\//, "")));

const errors = [
  ...walkthroughs.flatMap((w) => validateWalkthrough(w, { sampleFileExists })),
  ...validateWalkthroughSet(walkthroughs),
];
if (errors.length) {
  console.error("✗ Walkthrough validation failed:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

if (walkthroughs.filter((w) => w.tier === "flagship").length !== 3) {
  throw new Error("Expected exactly 3 flagship walkthroughs");
}

writeFileSync(join(OUT, "walkthroughs.json"), JSON.stringify(walkthroughs, null, 2));
console.log(
  `✓ content/walkthroughs.json — ${walkthroughs.length} walkthroughs, ` +
    `${walkthroughs.reduce((n, w) => n + w.session.turns.length, 0)} recorded turns, ` +
    `${walkthroughs.reduce((n, w) => n + w.steps.length, 0)} steps`,
);
