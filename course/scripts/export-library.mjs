/**
 * Snapshot the public NotebookLM notebook's source list into content/library-raw.json.
 *
 * This is a SNAPSHOT, NOT A SYNC. Re-run it by hand when Tarik adds sources.
 *
 * It is deliberately NOT part of `prebuild`: the notebooklm CLI authenticates with a
 * Google cookie jar that does not exist on Vercel, and NotebookLM has no query API we
 * could depend on at runtime anyway. The committed JSON is what the site ships.
 *
 * Run: npm run library:export
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTEBOOK_ID = "da7c4315-35c1-448b-ae4c-bd65cc2026f4";
const CLI = join(homedir(), ".local", "bin", "notebooklm");

let raw;
try {
  raw = execFileSync(CLI, ["--quiet", "metadata", "-n", NOTEBOOK_ID, "--json"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  throw new Error(
    `notebooklm CLI failed. Is it installed and logged in? Try \`notebooklm doctor\` then \`notebooklm login\`.\n${err.message}`,
  );
}

const data = JSON.parse(raw);
if (data.error) throw new Error(`notebooklm returned an error: ${JSON.stringify(data)}`);

const sources = data.sources ?? [];
if (sources.length < 200) {
  throw new Error(
    `Only ${sources.length} sources came back. Expected ~292. Refusing to overwrite the snapshot with a partial export.`,
  );
}

writeFileSync(join(__dirname, "..", "content", "library-raw.json"), JSON.stringify(data, null, 2) + "\n");

const byType = sources.reduce((a, s) => ((a[s.type] = (a[s.type] ?? 0) + 1), a), {});
const noUrl = sources.filter((s) => !s.url).length;

console.log(`✓ content/library-raw.json — ${sources.length} sources`);
console.log(`  by type: ${JSON.stringify(byType)}`);
console.log(`  with no URL: ${noUrl}   (these get hand-mapped in index-library.mjs)`);
