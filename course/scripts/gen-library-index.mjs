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

// linkKind is carried ONLY for the handful of sources that have no standalone link — they
// live inside the notebook, so their url is the notebook itself. The card has to say so:
// without it, clicking "The Governance of Algorithmic Journalism" dumps you into a
// NotebookLM notebook of 292 sources with no explanation of why. The other ~285 sources
// omit the field entirely rather than carry a redundant "direct" 285 times.
const entries = library.sources.map((s) => ({
  id: s.id,
  title: s.title,
  publisher: s.publisher,
  url: s.url,
  bucketLabel: s.bucketLabel ?? "Other",
  ...(s.linkKind === "notebook" ? { linkKind: "notebook" } : {}),
}));

const notebookOnly = entries.filter((e) => e.linkKind === "notebook").length;

const body = entries.map((e) => `  ${e.id}: ${JSON.stringify(e)},`).join("\n");

const out = `// GENERATED FILE — do not edit.
// Produced by scripts/gen-library-index.mjs from content/library.json. Run
// \`npm run gen:library\` (or \`npm run build\`) to regenerate after the library changes.
//
// Deliberately slim: no descriptions, and linkKind only on the sources that have no
// standalone link — to keep the chunk small. This resolves a model-emitted id to a real
// record. It is NOT a provenance check: it holds all 292 sources and has no idea which
// were retrieved this turn. Provenance is enforced in app/api/chat/route.ts, before the
// id ever reaches the browser (see lib/stream-filter.mjs).
//
// linkKind: "notebook" means the source has no standalone URL — its url is the notebook
// itself, and the card must say so.

export type LibraryIndexEntry = {
  id: number;
  title: string;
  publisher: string;
  url: string;
  bucketLabel: string;
  linkKind?: "notebook";
};

export const LIBRARY_INDEX: Record<number, LibraryIndexEntry> = {
${body}
};
`;

writeFileSync(join(CONTENT, "library-index.ts"), out);

console.log(
  `✓ content/library-index.ts — ${entries.length} sources (${notebookOnly} notebook-only)`,
);
