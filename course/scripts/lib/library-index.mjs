/**
 * Pure, network-free helpers for turning the raw NotebookLM export into the
 * library the site ships. All the logic worth testing lives here; the network and
 * the LLM live in scripts/index-library.mjs.
 *
 * The messy shape of the real export (measured, 2026-07-12, 292 sources):
 *   - 12 titles are truncated mid-sentence with "..." — og:title repairs them
 *   - 165 titles carry a publisher suffix (" - Poynter", "| Research.com")
 *   - 8 sources have no URL at all
 */

export const NOTEBOOK_URL =
  "https://notebooklm.google.com/notebook/da7c4315-35c1-448b-ae4c-bd65cc2026f4";

/** Already served by the repo-root GitHub Pages site. Verified 200 application/pdf. */
export const PANEL_PDF_URL =
  "https://tmoody1973.github.io/claudecode-publicradio/public-media-ai-panel.pdf";

/** `other` exists so nothing is ever force-fitted into a bucket it does not belong in. */
export const BUCKETS = {
  "newsroom-policy": "Newsroom & editorial AI policy",
  audience: "Audience & personalisation",
  production: "Transcription & production tooling",
  governance: "Ethics & governance frameworks",
  agents: "AI agents in public media",
  other: "Other",
};

export function isValidBucket(slug) {
  return Object.prototype.hasOwnProperty.call(BUCKETS, slug);
}

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  ldquo: '"',
  rdquo: '"',
  hellip: "…",
  eacute: "é",
  uuml: "ü",
  agrave: "à",
  ccedil: "ç",
  deg: "°",
  pound: "£",
  euro: "€",
  trade: "™",
  reg: "®",
  copy: "©",
};

/** Hex (&#x27;), decimal (&#8217;) and a common named set. Unknown entities pass through untouched. */
function decodeEntities(s) {
  return s.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === "#") {
      const isHex = e[1] === "x" || e[1] === "X";
      const codepoint = parseInt(isHex ? e.slice(2) : e.slice(1), isHex ? 16 : 10);
      if (!Number.isInteger(codepoint) || codepoint < 0 || codepoint > 0x10ffff) return m;
      try {
        return String.fromCodePoint(codepoint);
      } catch {
        return m;
      }
    }
    return NAMED_ENTITIES[e] ?? m;
  });
}

/** The export truncates long titles with a literal "...". */
function isTruncated(title) {
  return /\.\.\.\s*$/.test(title) || /…\s*$/.test(title);
}

const SEPARATOR_TOKENS = new Set(["-", "|", "–", "—", "·"]);

/** A bare separator split out by \s+ isn't a word — don't let it pad the count. */
function realWordCount(s) {
  return s.split(/\s+/).filter((w) => w && !SEPARATOR_TOKENS.has(w)).length;
}

/**
 * Strip a trailing " - Publisher" / " | Publisher" / " · Publisher".
 * Only a SHORT trailing segment (≤ 4 words) is a publisher — a long one is prose.
 * A tail with a "/" is a path or repo identifier, never a publisher. A strip is
 * refused if it would leave fewer than 2 real words — that's eating the title, not
 * a suffix (real words = tokens that aren't themselves a bare separator).
 */
function stripPublisherSuffixOnce(title) {
  const m = title.match(/^(.*\S)\s+[-|–—·]\s+([^-|–—·]{2,40})$/);
  if (!m) return title;
  const tail = m[2].trim();
  if (tail.includes("/")) return title; // a repo path or URL fragment, not a publisher
  if (tail.split(/\s+/).length > 4) return title; // that's a subtitle, not a publisher
  const head = m[1].trim();
  if (realWordCount(head) < 2) return title; // never strip a title down to a stub
  return head;
}

/**
 * Double- and triple-suffixed titles ("Title | Documentos - Universidad ...") need
 * more than one pass.
 *
 * ponytail: cap stays at 3, not 5. Swept all 292 real titles at cap 3 vs 5: exactly
 * one differs — "In the Age of AI | FRONTLINE | PBS | Official Site | Documentary
 * Series" — and cap 5 makes it *worse* (eats "FRONTLINE", the actual show name,
 * because nothing but the pass cap was stopping it). No real title needs a 4th
 * pass. Raise this only once a real title needs one AND doesn't collide with a
 * short chain like the FRONTLINE case.
 */
function stripPublisherSuffix(title) {
  let t = title;
  for (let i = 0; i < 3; i++) {
    const next = stripPublisherSuffixOnce(t);
    if (next === t) break;
    t = next;
  }
  return t;
}

/**
 * @param {string} rawTitle  The export's title.
 * @param {string|null} [ogTitle]  og:title, if we fetched one.
 *
 * og:title is trusted ONLY to repair a truncation. Otherwise it is often SEO junk
 * ("Buy Now! …"), and the export's title — which is what Tarik saw when he vetted
 * the source — is the better one.
 */
export function cleanTitle(rawTitle, ogTitle = null) {
  const base = isTruncated(rawTitle) && ogTitle && ogTitle.trim() ? ogTitle : rawTitle;
  let t = decodeEntities(String(base).trim());
  t = t.replace(/^\(PDF\)\s*/i, "");
  t = stripPublisherSuffix(t);
  return t.trim();
}

export function publisherFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const metaRe = (attr, value) =>
  new RegExp(
    `<meta[^>]+${attr}\\s*=\\s*["']${value}["'][^>]*content\\s*=\\s*["']([^"']*)["']|` +
      `<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*${attr}\\s*=\\s*["']${value}["']`,
    "i",
  );

function meta(html, attr, value) {
  const m = html.match(metaRe(attr, value));
  if (!m) return null;
  const raw = (m[1] ?? m[2] ?? "").trim();
  return raw ? decodeEntities(raw) : null;
}

/** Meta tags only. We never parse article bodies — see the spec. */
export function parseOgTags(html) {
  return {
    title: meta(html, "property", "og:title"),
    description:
      meta(html, "property", "og:description") ?? meta(html, "name", "description"),
    siteName: meta(html, "property", "og:site_name"),
  };
}

/**
 * Every one of the 292 sources must end up reachable. A pointer with nowhere to
 * point is a dead end, so the 8 URL-less sources are resolved by hand.
 */
export function resolveUrl(source) {
  if (source.url) return { url: source.url, linkKind: "direct" };
  if (source.title === "public-media-ai-panel.pdf") {
    return { url: PANEL_PDF_URL, linkKind: "direct" };
  }
  // The rest live only inside the notebook — which is public, so that is a real
  // destination. Honestly labelled as a weaker pointer by linkKind: "notebook".
  return { url: NOTEBOOK_URL, linkKind: "notebook" };
}
