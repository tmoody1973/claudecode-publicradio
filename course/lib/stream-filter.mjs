/**
 * The line filter that sits between the model's stream and the browser.
 *
 * Two jobs:
 *
 * 1. KEEP THE DSL CLEAN. Reasoning models leak `<think>` blocks and every model loves
 *    a markdown fence. Either one corrupts a line-oriented DSL. So: drop fences, drop
 *    `<think>` blocks, drop everything before the first `root =`.
 *
 * 2. ENFORCE PROVENANCE ON `Sources([...])`. This is the load-bearing one.
 *
 *    The model is handed library ids in the LIBRARY grounding block and told to emit
 *    only those. Telling is not enforcing. The system prompt's few-shot examples contain
 *    real, resolvable ids (`Sources([8, 21, 17])`) and are present on EVERY turn — so a
 *    weak free model that copies an example emits ids that would resolve against
 *    LIBRARY_INDEX and render as "vetted sources matched to your question", on a turn
 *    where those sources were never retrieved. The renderer cannot catch this: it holds
 *    all 292 sources and has no idea which four were retrieved.
 *
 *    This filter does. `allowedIds` is exactly the set the route retrieved THIS TURN.
 *    Any id outside it is stripped. If nothing survives, the whole Sources line is
 *    dropped. If no library block was sent at all, `allowedIds` is empty and every
 *    Sources line is dropped.
 *
 *    Dropping the line leaves the identifier referenced in `root = Answer([...])` — which
 *    was already streamed as line 1 and cannot be recalled — with no definition. That is
 *    SAFE, and verified, not assumed: the OpenUI Lang parser resolves the root array
 *    against the definitions it actually received, omits an identifier it never saw, and
 *    reports it in `meta.unresolved` with NO error. See the "dangling root reference"
 *    tests in stream-filter.test.mjs, which pin that behaviour against the real parser.
 *    This is also just the ordinary streaming case: every identifier in root is unresolved
 *    for the moment between root arriving and its definition arriving.
 *
 *    So there is no need to buffer the root line to rewrite it — which would mean holding
 *    back the whole answer until the Sources decision was known, and would kill streaming
 *    for every answer that puts Sources last.
 *
 * Plain .mjs (with a .d.mts alongside) so node:test can test it without a TypeScript test
 * runner, and so the chat route can import it without dragging React anywhere near the
 * server. This file imports NOTHING.
 */

/** `src = Sources([8, 21, 17])` — the whole call on one line, which is what models emit. */
const SOURCES_LINE = /^\s*([A-Za-z_$][\w$]*)\s*=\s*Sources\s*\(\s*\[([^\]]*)\]\s*\)\s*$/;

/** Any line that starts defining a Sources block, well-formed or not. */
const SOURCES_OPEN = /^\s*[A-Za-z_$][\w$]*\s*=\s*Sources\s*\(/;

/**
 * @param {Iterable<number>} [allowedIds]  The library ids actually retrieved this turn.
 *                                         Empty/omitted => no Sources block may render.
 */
export function createLineFilter(allowedIds = []) {
  const allowed = new Set(allowedIds);
  let buffer = "";
  let started = false;
  let inThink = false;
  // A Sources call we could not parse on one line. Swallow its continuation lines rather
  // than leak `21, 17])` into the stream as a garbage statement.
  let inBadSources = false;

  const clean = (line) => {
    const t = line.trim();

    if (inBadSources) {
      if (t.includes(")")) inBadSources = false;
      return null;
    }

    if (/^<\/?(think|thinking|reasoning)>/i.test(t)) {
      inThink = /^<(think|thinking|reasoning)>/i.test(t);
      return null;
    }
    if (inThink) return null;
    if (/^```/.test(t)) return null;
    if (!started) {
      if (/^root\s*=/.test(t)) started = true;
      else return null; // preamble prose — bin it
    }

    const m = SOURCES_LINE.exec(t);
    if (m) {
      const [, name, inner] = m;
      const kept = inner
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && allowed.has(n));
      // Dedupe — a model that repeats an id would otherwise render the same card twice.
      const ids = [...new Set(kept)];
      return ids.length ? `${name} = Sources([${ids.join(", ")}])` : null;
    }

    if (SOURCES_OPEN.test(t)) {
      // Sources, but not in a shape we can verify. We cannot prove provenance, so it does
      // not render. Never render a citation we cannot vouch for.
      inBadSources = !t.includes(")");
      return null;
    }

    return line;
  };

  return {
    /** @param {string} chunk @returns {string} */
    push(chunk) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // last piece may be a partial line
      const out = [];
      for (const l of lines) {
        const c = clean(l);
        if (c !== null) out.push(c);
      }
      return out.length ? out.join("\n") + "\n" : "";
    },
    /** @returns {string} */
    flush() {
      if (!buffer) return "";
      const c = clean(buffer);
      buffer = "";
      return c ?? "";
    },
  };
}
