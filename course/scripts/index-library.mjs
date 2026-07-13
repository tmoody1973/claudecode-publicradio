/**
 * Enrich content/library-raw.json into content/library.json — the file the site ships.
 *
 * Fetches META TAGS ONLY. No article bodies, no readability, no PDF parsing. A failed
 * fetch costs a DESCRIPTION, never a SOURCE: that record degrades to title-only and
 * stays in the library. All 292 sources always come out the other side.
 *
 * An LLM assigns BUCKETS (a label — wrong, it is visible and correctable here).
 * An LLM NEVER writes DESCRIPTIONS (a claim — wrong, it is invisible). Descriptions
 * come from the publisher's own og:description or they do not exist.
 *
 * NOT part of prebuild: ~292 network calls inside a Vercel build is a flaky build.
 *
 * Run: npm run library:index
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUCKETS,
  NOTEBOOK_URL,
  cleanTitle,
  publisherFromUrl,
  parseOgTags,
  resolveUrl,
  isValidBucket,
} from "./lib/library-index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTEBOOK_ID = "da7c4315-35c1-448b-ae4c-bd65cc2026f4";
const CONCURRENCY = 6;
const TIMEOUT_MS = 12_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36";

// Empirically benchmarked cascade from lib/models.ts, best first. nemotron is primary
// because the last run showed it does NOT rate-limit; gpt-oss (which did 429 mid-run
// last time) is kept as a fallback for resilience. On a 429 we fall forward to the
// next ":free" model and stay there — cheaper than restarting the whole 292-fetch
// phase to retry a model that's still rate-limited.
const MODEL_CASCADE = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "openrouter/free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];
let modelIndex = 0;

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error(
    "OPENROUTER_API_KEY is not set. Run with: node --env-file=.env.local scripts/index-library.mjs",
  );
}

/** Run `tasks` with a concurrency cap. Order of results matches order of tasks. */
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

/** Meta tags only. Returns null on ANY failure — the source survives, the description does not. */
async function fetchMeta(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return { ok: false, reason: `not html (${ct.split(";")[0] || "unknown"})` };
    // Meta tags live in <head>. Read a slice, not the whole document.
    const html = (await res.text()).slice(0, 200_000);
    return { ok: true, tags: parseOgTags(html) };
  } catch (err) {
    return { ok: false, reason: err.name === "AbortError" ? "timeout" : `network (${err.message})` };
  } finally {
    clearTimeout(timer);
  }
}

const BUCKET_LIST = Object.entries(BUCKETS)
  .map(([slug, label]) => `- ${slug}: ${label}`)
  .join("\n");

/**
 * Classify a batch of sources into buckets. LABELS ONLY — the model is never asked
 * what a source SAYS, only which shelf it belongs on, from metadata it has been given.
 */
async function classifyBatch(batch) {
  const numbered = batch
    .map((s, i) => `${i + 1}. "${s.title}" (${s.publisher})${s.description ? ` — ${s.description.slice(0, 200)}` : ""}`)
    .join("\n");

  for (;;) {
    const model = MODEL_CASCADE[modelIndex];
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://claude-code-public-media.vercel.app",
        "X-Title": "Claude Code for Public Media - library indexing",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              `You file sources into a public-media AI research library. For each numbered source, ` +
              `return ONLY its bucket slug.\n\nBuckets:\n${BUCKET_LIST}\n\n` +
              `Use "other" when none of the five fits — do NOT force-fit.\n` +
              `Reply with exactly ${batch.length} lines, each "N: slug". No prose, no fences.`,
          },
          { role: "user", content: numbered },
        ],
      }),
    });

    if (res.status === 429 && modelIndex < MODEL_CASCADE.length - 1) {
      modelIndex++;
      console.log(`\n  ! ${model} rate-limited — falling back to ${MODEL_CASCADE[modelIndex]}`);
      continue;
    }
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status} (${model}): ${(await res.text()).slice(0, 200)}`);

    const text = (await res.json()).choices?.[0]?.message?.content ?? "";

    const buckets = new Array(batch.length).fill("other");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(\d+)\s*[:.)-]\s*([a-z-]+)\s*$/);
      if (!m) continue;
      const i = Number(m[1]) - 1;
      if (i >= 0 && i < batch.length && isValidBucket(m[2])) buckets[i] = m[2];
    }
    return { buckets, model };
  }
}

// ---------------------------------------------------------------------------

const raw = JSON.parse(readFileSync(join(__dirname, "..", "content", "library-raw.json"), "utf8"));
const input = raw.sources ?? [];
if (input.length < 200) throw new Error(`library-raw.json has only ${input.length} sources. Re-run npm run library:export.`);

console.log(`Indexing ${input.length} sources (meta tags only, concurrency ${CONCURRENCY}, model ${MODEL_CASCADE[0]})…\n`);

const failures = [];

const enriched = await pool(input, CONCURRENCY, async (s, i) => {
  const { url, linkKind } = resolveUrl(s);

  // Sources that point at the notebook have no page of their own to fetch.
  const fetchable = linkKind === "direct" && s.type !== "pdf";
  const meta = fetchable ? await fetchMeta(url) : { ok: false, reason: linkKind === "notebook" ? "no standalone page" : "pdf (no meta tags)" };

  if (!meta.ok) failures.push({ title: s.title.slice(0, 60), url, reason: meta.reason });

  const tags = meta.ok ? meta.tags : { title: null, description: null, siteName: null };
  const description = tags.description?.trim() || null;

  return {
    id: i + 1,
    title: cleanTitle(s.title, tags.title),
    publisher: tags.siteName?.trim() || publisherFromUrl(url) || "—",
    url,
    linkKind,
    bucket: "other", // filled in below
    bucketLabel: BUCKETS.other, // filled in below
    type: s.type,
    description,
    descriptionSource: description ? "og" : "none",
  };
});

// Buckets, in batches of 25.
console.log(`\nClassifying into buckets…`);
for (let i = 0; i < enriched.length; i += 25) {
  const batch = enriched.slice(i, i + 25);
  const { buckets, model } = await classifyBatch(batch);
  batch.forEach((s, j) => {
    s.bucket = buckets[j];
    // Denormalised so lib/library-search.mjs never has to import BUCKETS out of scripts/.
    s.bucketLabel = BUCKETS[buckets[j]];
    // Disclosure, not decoration: if a rate-limit ever splits a run across models
    // again, every record still says — honestly — which one labelled it.
    s.classifiedBy = model;
  });
  process.stdout.write(`  ${Math.min(i + 25, enriched.length)}/${enriched.length}\r`);
}

const withDescription = enriched.filter((s) => s.description).length;

const out = {
  notebookId: NOTEBOOK_ID,
  notebookUrl: NOTEBOOK_URL,
  snapshotDate: new Date().toISOString().slice(0, 10),
  count: enriched.length,
  withDescription,
  titleOnly: enriched.length - withDescription,
  sources: enriched,
};

writeFileSync(join(__dirname, "..", "content", "library.json"), JSON.stringify(out, null, 2) + "\n");

// --- The coverage report. Loud, honest, never rounded up. ---
const byModel = enriched.reduce((a, s) => ((a[s.classifiedBy] = (a[s.classifiedBy] ?? 0) + 1), a), {});
const modelSpread = Object.entries(byModel)
  .map(([m, c]) => `${m.split("/").pop()} (${c})`)
  .join(", ");

console.log(`\n\n✓ content/library.json — ${out.count} sources, ALL of them kept\n`);
console.log(`  classified by: ${modelSpread}`);
console.log(`  with a description : ${withDescription}`);
console.log(`  title-only         : ${out.titleOnly}`);
console.log(`\n  buckets:`);
const byBucket = enriched.reduce((a, s) => ((a[s.bucket] = (a[s.bucket] ?? 0) + 1), a), {});
for (const [slug, label] of Object.entries(BUCKETS)) {
  console.log(`    ${String(byBucket[slug] ?? 0).padStart(4)}  ${slug} — ${label}`);
}
if (failures.length) {
  console.log(`\n  ${failures.length} sources have no description. Every one is still in the library:`);
  for (const f of failures) console.log(`    · [${f.reason}] ${f.title}`);
}
console.log("");
