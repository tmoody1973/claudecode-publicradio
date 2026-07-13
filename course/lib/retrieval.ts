import { modules, glossary, meta, type CourseModule } from "@/lib/course";

/**
 * The full course digest is ~33k tokens. Sending that on every turn is slow and
 * eats the free-tier rate limit for no benefit, so: always send a compact index
 * of all 10 modules, then attach the *full* text of only the modules the question
 * is actually about.
 *
 * ponytail: keyword overlap, not embeddings. 10 documents does not need a vector
 * DB — swap this out only if recall measurably suffers.
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "i", "you", "we", "they", "it", "he", "she", "my", "our", "your", "their", "its",
  "to", "of", "in", "on", "for", "with", "at", "by", "from", "as", "about", "into", "over",
  "can", "could", "should", "would", "will", "may", "might", "must", "shall",
  "what", "how", "why", "when", "where", "who", "which",
  "not", "no", "so", "up", "out", "just", "me", "use", "using", "get", "make", "want",
  "claude", "code", "station", "public", "media",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Everything in a module that a query could plausibly match against. */
function moduleHaystack(m: CourseModule): string {
  return [
    m.title,
    m.kicker,
    m.plainSummary,
    m.whyItMatters,
    ...m.sourceChapters.map((c) => c.title),
    ...m.concepts.map((c) => `${c.term} ${c.plain} ${c.stationTranslation}`),
    ...m.glossary.map((g) => `${g.term} ${g.definition}`),
    ...m.useCases.map((u) => `${u.role} ${u.title} ${u.scenario} ${u.howClaudeHelps}`),
    ...m.pitfalls,
  ].join(" ");
}

const HAYSTACKS = new Map(modules.map((m) => [m.id, tokenize(moduleHaystack(m))]));

function score(query: string[], m: CourseModule): number {
  const hay = HAYSTACKS.get(m.id)!;
  const counts = new Map<string, number>();
  for (const w of hay) counts.set(w, (counts.get(w) ?? 0) + 1);
  let s = 0;
  for (const q of query) {
    const exact = counts.get(q) ?? 0;
    if (exact) {
      s += 3 + Math.min(exact, 5);
      continue;
    }
    // cheap stem-ish partial: "caching" should still hit "cache"
    for (const [w, n] of counts) {
      if (w.startsWith(q) || q.startsWith(w)) {
        s += 1 + Math.min(n, 2);
        break;
      }
    }
  }
  return s;
}

/** Compact one-liner per module. Always sent, so the model knows the whole map. */
function moduleIndex(): string {
  return modules
    .map(
      (m) =>
        `${m.number}. ${m.title} — ${m.plainSummary} [concepts: ${m.concepts
          .map((c) => c.term)
          .join(", ")}]`,
    )
    .join("\n");
}

/** The full detail for one module. */
function moduleDetail(m: CourseModule): string {
  const parts: string[] = [];
  parts.push(`### MODULE ${m.number}: ${m.title}`);
  parts.push(`${m.plainSummary}`);
  parts.push(`WHY IT MATTERS: ${m.whyItMatters}`);

  parts.push(`CONCEPTS:`);
  for (const c of m.concepts) {
    parts.push(
      `- ${c.term} (video ${c.tLabel}, t=${c.t}s): ${c.plain} | For a station: ${c.stationTranslation}`,
    );
  }
  if (m.conceptsNote) {
    parts.push(
      `IMPORTANT CORRECTION TO THE CONCEPTS ABOVE — the source video is out of date here. Use the corrected version and do NOT repeat the video's version: ${m.conceptsNote}`,
    );
  }

  parts.push(`STATION USE CASES:`);
  for (const u of m.useCases) {
    parts.push(
      `- [role=${u.roleSlug}] "${u.title}" — Situation: ${u.scenario} Claude helps: ${u.howClaudeHelps} Saves: ${u.timeSaved} GUARDRAIL: ${u.guardrail}`,
    );
  }

  parts.push(`TRY THIS (${m.tryThis.title}). Setup: ${m.tryThis.setup}`);
  parts.push(`READY-MADE PROMPT: ${m.tryThis.prompt.replace(/\s+/g, " ").trim()}`);
  parts.push(`PITFALLS: ${m.pitfalls.join(" | ")}`);

  if (m.mindsetShifts) {
    parts.push(
      `MINDSET SHIFTS actually named in the source (${m.mindsetShifts.length}): ` +
        m.mindsetShifts.map((s) => `${s.n}) ${s.shift}: ${s.stationTake}`).join(" | "),
    );
    if (m.mindsetShiftsNote) parts.push(`IMPORTANT CAVEAT: ${m.mindsetShiftsNote}`);
  }
  if (m.pyramid) {
    parts.push(
      `AI SYSTEMS PYRAMID (bottom to top): ` +
        m.pyramid.levels
          .map((l) => `${l.n}) ${l.name}: ${l.plain} Station: ${l.stationExample}`)
          .join(" | ") +
        ` BIG IDEA: ${m.pyramid.bigIdea}`,
    );
  }
  if (m.levels) {
    parts.push(
      `5 LEVELS OF A SECOND BRAIN: ` +
        m.levels
          .map((l) => `${l.n}) ${l.name}: ${l.plain} Station: ${l.stationExample} (effort: ${l.effort})`)
          .join(" | "),
    );
  }
  if (m.cacheBreakers) {
    parts.push(
      `WHAT BREAKS THE PROMPT CACHE: ` +
        m.cacheBreakers
          .map((c) => `"${c.action}" → ${c.breaksCache ? "BREAKS" : "does NOT break"} (${c.why}; avoid by: ${c.avoidBy})`)
          .join(" | "),
    );
  }
  if (m.costModel) {
    parts.push(`COST FACTS: ${JSON.stringify(m.costModel)}`);
  }
  if (m.automationBlueprint) {
    const b = m.automationBlueprint;
    parts.push(
      `AUTOMATION BLUEPRINT "${b.name}": trigger=${b.trigger}; steps=${b.steps.join(" → ")}; output=${b.output}; human checkpoint=${b.humanCheckpoint}; setup time=${b.estSetupTime}`,
    );
  }
  if (m.skillAnatomy) {
    parts.push(
      `SKILL ANATOMY: ${m.skillAnatomy.whatItIs} Lives at: ${m.skillAnatomy.whereItLives} Loaded when: ${m.skillAnatomy.whenClaudeLoadsIt}`,
    );
  }
  if (m.exampleClaudeMd) {
    parts.push(`EXAMPLE STATION CLAUDE.md:\n${m.exampleClaudeMd}`);
  }
  return parts.join("\n");
}

const GLOSSARY = glossary.map((g) => `- ${g.term}: ${g.definition}`).join("\n");

/**
 * Build the grounding block for a question.
 * Always: the 10-module index + full glossary.
 * Plus: full detail for the top-N scoring modules.
 */
export function buildGrounding(question: string, topN = 3): string {
  const q = tokenize(question);

  const ranked = modules
    .map((m) => ({ m, s: score(q, m) }))
    .sort((a, b) => b.s - a.s);

  // If nothing scores, the question is probably general — give them modules 1 and 2.
  const picked = ranked[0].s === 0 ? [modules[0], modules[1]] : ranked.slice(0, topN).map((r) => r.m);

  return [
    `## The course, at a glance`,
    `Source: "${meta.sourceTitle}" by ${meta.sourceAuthor} — a ${Math.round(
      meta.durationSeconds / 3600,
    )}-hour video, ${meta.chapterCount} chapters, reorganised here into ${meta.moduleCount} modules with ${meta.useCaseCount} public media use cases.`,
    ``,
    moduleIndex(),
    ``,
    `## Detail on the modules most relevant to this question`,
    ...picked.map(moduleDetail),
    ``,
    `## Glossary`,
    GLOSSARY,
  ].join("\n");
}
