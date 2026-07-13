/**
 * Generates content/library-index.ts — a slim, plain-data lookup the Sources
 * renderer uses to resolve a model-emitted id to a REAL vetted-source record.
 *
 * Deliberately NOT the full content/library.json: only what the Sources card
 * renders (id, title, publisher, url, bucketLabel) — no descriptions — to keep the
 * client bundle small. Plain data, no JSX, no React import, so it is safe to import
 * from anywhere, including code that must stay clear of @openuidev/react-lang.
 *
 * Run: node scripts/gen-library-index.mjs   (wired into `npm run build` via prebuild)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(__dirname, "..", "content");

const library = JSON.parse(readFileSync(join(CONTENT, "library.json"), "utf8"));

if (!Array.isArray(library.sources) || library.sources.length === 0) {
  throw new Error("content/library.json has no sources — refusing to generate an empty index");
}

const entries = library.sources.map((s) => ({
  id: s.id,
  title: s.title,
  publisher: s.publisher,
  url: s.url,
  bucketLabel: s.bucketLabel ?? "Other",
}));

const body = entries.map((e) => `  ${e.id}: ${JSON.stringify(e)},`).join("\n");

const out = `// GENERATED FILE — do not edit.
// Produced by scripts/gen-library-index.mjs from content/library.json. Run
// \`npm run gen:library\` (or \`npm run build\`) to regenerate after the library changes.
//
// Deliberately slim: id, title, publisher, url, bucketLabel only — no descriptions —
// to keep the client bundle small. This is the ONLY source of truth the Sources
// renderer may use to resolve a model-emitted id to a real record; an id not present
// here did not come from the library and must render nothing.

export type LibraryIndexEntry = {
  id: number;
  title: string;
  publisher: string;
  url: string;
  bucketLabel: string;
};

export const LIBRARY_INDEX: Record<number, LibraryIndexEntry> = {
${body}
};
`;

writeFileSync(join(CONTENT, "library-index.ts"), out);

console.log(`✓ content/library-index.ts — ${entries.length} sources`);
