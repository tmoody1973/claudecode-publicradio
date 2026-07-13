/**
 * Keyword scoring over the curated library. Deliberately the same shape as
 * lib/retrieval.ts — tokenize, score, take the top few — because 292 short records
 * (~18k tokens all in) is a SMALLER haystack than the course digest that file already
 * handles in-process. No vector DB. See the spec for the upgrade ladder if recall
 * ever measurably suffers.
 *
 * Plain .mjs (with a .d.mts alongside) so node:test can test it without adding a
 * TypeScript test runner. Same pattern as lib/openui-spec.mjs.
 *
 * ponytail: keyword overlap, not embeddings. Climb a rung only on evidence.
 *
 * NB: this file imports NOTHING. In particular it must never reach into scripts/ for
 * the BUCKETS table — app code depending on build tooling inverts the dependency and
 * drags a script into the server bundle. content/library.json carries bucketLabel on
 * every record precisely so this file doesn't need it.
 */

/**
 * NOTE: deliberately NOT shared with lib/retrieval.ts. The two corpora need different
 * stoplists. retrieval.ts stops "claude"/"code"/"station" because every module is about
 * them. The library must ALSO stop "ai"/"artificial"/"intelligence"/"public"/"media" —
 * those appear across a large fraction of 292 sources about AI in public media and
 * discriminate nothing. Sharing one list would degrade both.
 */
const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "i", "you", "we", "they", "it", "he", "she", "my", "our", "your", "their", "its",
  "to", "of", "in", "on", "for", "with", "at", "by", "from", "as", "about", "into", "over",
  "can", "could", "should", "would", "will", "may", "might", "must", "shall",
  "what", "how", "why", "when", "where", "who", "which",
  "not", "no", "so", "up", "out", "just", "me", "use", "using", "get", "make", "want",
  // Domain stopwords: true of nearly every source in THIS library.
  "ai", "artificial", "intelligence", "public", "media", "station", "claude",
  // "code" collides with course-mechanics questions ("install Claude Code") against
  // unrelated titles that happen to say "Code.org" / "Code for America" / "Claude Code
  // for Public Radio" — same reason retrieval.ts stops it for the course corpus.
  "code",
]);

export function tokenize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/**
 * Below this, we send NO library block at all. "How do I install Claude Code" scores
 * nothing against a research library and must get nothing — handing the model
 * irrelevant sources only invites it to mention them.
 *
 * 3 = one solid hit (a single title match, or a description+publisher pair). Below
 * that we're scoring incidental overlap, not a real match — reject it.
 */
export const SCORE_FLOOR = 3;

/**
 * Qualification gate (runs BEFORE scoring, decides IF we search at all).
 *
 * SCORE_FLOOR alone can't tell a discriminating term from a noise term: one title
 * match scores 3 whether the word is "underwriting" (1 of 292 docs) or "open" (11 of
 * 292) — a common verb that leaked open-data articles into "what is a terminal and how
 * do I open it?". Gate on document frequency instead: a question qualifies only if at
 * least 2 distinct query tokens appear anywhere in the corpus, or exactly 1 does and
 * it's rare enough (<= RARE_DF sources) to be specific on its own.
 *
 * KNOWN LIMITATION (not fixed here): "how much does Claude cost per month?" still
 * qualifies — "cost" and "month" each coincidentally appear in exactly 1 source, so two
 * *distinct* rare tokens clear the >=2 branch even though neither is a real match. This
 * degrades safely: the model is instructed to omit the Sources block when the returned
 * sources aren't relevant to its answer. That's the designed second line of defence.
 */
export const RARE_DF = 5;

const cache = new WeakMap();
const dfCache = new WeakMap();

/** Document frequency: token -> number of sources whose title+description+bucketLabel
 * contain it. Computed once per sources array, not per query. */
function docFrequencies(sources) {
  let df = dfCache.get(sources);
  if (!df) {
    df = new Map();
    for (const source of sources) {
      const tokens = new Set([
        ...tokenize(source.title),
        ...tokenize(source.description ?? ""),
        ...tokenize(source.bucketLabel ?? ""),
      ]);
      for (const t of tokens) df.set(t, (df.get(t) ?? 0) + 1);
    }
    dfCache.set(sources, df);
  }
  return df;
}

function qualifies(sources, queryTokens) {
  const df = docFrequencies(sources);
  const present = [...new Set(queryTokens)].filter((t) => df.has(t));
  if (present.length >= 2) return true;
  if (present.length === 1) return df.get(present[0]) <= RARE_DF;
  return false;
}

/** Precompute per-source token sets once per array. */
function fields(source) {
  let f = cache.get(source);
  if (!f) {
    f = {
      title: new Set(tokenize(source.title)),
      description: new Set(tokenize(source.description ?? "")),
      bucket: new Set(tokenize(source.bucketLabel ?? "")),
      publisher: new Set(tokenize(source.publisher)),
    };
    f.all = new Set([...f.title, ...f.description, ...f.bucket, ...f.publisher]);
    cache.set(source, f);
  }
  return f;
}

export function scoreSource(queryTokens, source) {
  const f = fields(source);
  let s = 0;
  for (const q of queryTokens) {
    if (f.title.has(q)) s += 3;
    else if (f.description.has(q)) s += 2;
    else if (f.bucket.has(q)) s += 2;
    else if (f.publisher.has(q)) s += 1;
    else {
      // cheap stem-ish partial: "transcribing" should still reach "transcription"
      for (const w of f.all) {
        if (w.length > 3 && q.length > 3 && (w.startsWith(q) || q.startsWith(w))) {
          s += 1;
          break;
        }
      }
    }
  }
  return s;
}

/**
 * @returns the top k sources scoring at or above SCORE_FLOOR, best first. [] if none.
 *
 * Deduped by URL. The notebook genuinely files 3 URLs twice under different titles; we
 * keep both records (a source is never dropped from the library) but a person must never
 * be handed the same link twice in one Sources block. Best-scoring title wins.
 */
export function searchSources(sources, question, k = 4) {
  const q = tokenize(question);
  if (q.length === 0) return [];
  if (!qualifies(sources, q)) return [];

  const seen = new Set();

  return sources
    .map((source) => ({ source, s: scoreSource(q, source) }))
    .filter((r) => r.s >= SCORE_FLOOR)
    .sort((a, b) => b.s - a.s || a.source.id - b.source.id)
    .filter(({ source }) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    })
    .slice(0, k)
    .map(({ source }) => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      bucket: source.bucket,
      bucketLabel: source.bucketLabel ?? "Other",
      linkKind: source.linkKind,
      description: source.description ?? null,
    }));
}
