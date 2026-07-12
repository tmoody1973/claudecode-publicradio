/**
 * Merges the 10 per-module JSON files into:
 *   content/course.json  — the site's data layer
 *   content/digest.md    — compact grounding text for the AI chat system prompt
 *
 * Run: node scripts/compile-content.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRunbook } from "./lib/validate-walkthroughs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "content", "modules");
const OUT = join(__dirname, "..", "content");

const VIDEO_ID = "jdbOVepEtUE";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

// Nine canonical station roles. Agents wrote free-text labels ("Leadership / GM",
// "Leadership / Operations"); everything collapses to one of these.
const ROLES = [
  { slug: "news", label: "News", blurb: "Reporters, producers, editors, news directors" },
  { slug: "membership", label: "Membership & Development", blurb: "Pledge drives, donor stewardship, major gifts" },
  { slug: "music", label: "Music & Programming", blurb: "Music directors, hosts, program directors" },
  { slug: "underwriting", label: "Underwriting", blurb: "Corporate support, sponsor copy, compliance" },
  { slug: "digital", label: "Digital & Audience", blurb: "Web, social, newsletters, podcasts, analytics" },
  { slug: "leadership", label: "Leadership", blurb: "GM, station manager, board reporting" },
  { slug: "traffic", label: "Traffic & Operations", blurb: "Logs, scheduling, spot rotation" },
  { slug: "engineering", label: "Engineering / IT", blurb: "Transmitters, automation, EAS, systems" },
  { slug: "grants", label: "Grants & Compliance", blurb: "CPB reporting, FCC filings, audits" },
];

function roleSlug(raw) {
  const s = raw.toLowerCase();
  if (s.includes("news")) return "news";
  if (s.includes("membership") || s.includes("development")) return "membership";
  if (s.includes("music") || s.includes("programming")) return "music";
  if (s.includes("underwriting") || s.includes("corporate")) return "underwriting";
  if (s.includes("digital") || s.includes("audience")) return "digital";
  if (s.includes("traffic") || s.includes("operations")) return "traffic";
  if (s.includes("engineering") || s.includes("it")) return "engineering";
  if (s.includes("grant") || s.includes("compliance")) return "grants";
  if (s.includes("leadership") || s.includes("gm")) return "leadership";
  throw new Error(`Unmapped role: "${raw}" — add it to roleSlug()`);
}

const files = readdirSync(SRC)
  .filter((f) => /^m\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

const modules = files.map((f) => JSON.parse(readFileSync(join(SRC, f), "utf8")));

if (modules.length !== 10) throw new Error(`Expected 10 modules, got ${modules.length}`);

const chapterCount = modules.reduce((n, m) => n + m.sourceChapters.length, 0);
if (chapterCount !== 35) throw new Error(`Expected 35 chapters, got ${chapterCount}`);

const yt = (t) => `${VIDEO_URL}&t=${Math.max(0, Math.floor(t))}s`;

// --- normalise ---
for (const m of modules) {
  m.slug = `module-${m.number}`;
  m.useCases = m.useCases.map((uc, i) => ({
    ...uc,
    id: `${m.id}-uc${i + 1}`,
    roleSlug: roleSlug(uc.role),
    role: ROLES.find((r) => r.slug === roleSlug(uc.role)).label,
    moduleId: m.id,
    moduleNumber: m.number,
    moduleTitle: m.title,
  }));
  m.concepts = m.concepts.map((c) => ({ ...c, youtube: yt(c.t) }));
  m.keyQuotes = m.keyQuotes.map((q) => ({ ...q, youtube: yt(q.t) }));
  m.sourceChapters = m.sourceChapters.map((c) => ({ ...c, youtube: yt(c.start) }));
}

// --- glossary: dedupe across modules, keep the shortest definition, remember origins ---
const glossaryMap = new Map();
for (const m of modules) {
  for (const g of m.glossary) {
    const key = g.term.trim().toLowerCase();
    const prev = glossaryMap.get(key);
    if (!prev) {
      glossaryMap.set(key, { term: g.term.trim(), definition: g.definition, modules: [m.number] });
    } else {
      if (!prev.modules.includes(m.number)) prev.modules.push(m.number);
      if (g.definition.length < prev.definition.length) prev.definition = g.definition;
    }
  }
}
const glossary = [...glossaryMap.values()].sort((a, b) => a.term.localeCompare(b.term));

const useCases = modules.flatMap((m) => m.useCases);

// --- merge runbooks ---
const RUNBOOKS = join(__dirname, "..", "content", "runbooks");
const runbookErrors = [];

for (const uc of useCases) {
  const p = join(RUNBOOKS, `${uc.id}.json`);
  if (!existsSync(p)) {
    runbookErrors.push(`${uc.id}: missing runbook (content/runbooks/${uc.id}.json)`);
    continue;
  }
  const rb = JSON.parse(readFileSync(p, "utf8"));
  runbookErrors.push(...validateRunbook(rb, uc.id));
  uc.runbook = rb;
}

if (runbookErrors.length) {
  console.error("✗ Runbook validation failed:\n" + runbookErrors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${useCases.length} runbooks merged`);

const roleCounts = Object.fromEntries(
  ROLES.map((r) => [r.slug, useCases.filter((u) => u.roleSlug === r.slug).length]),
);

const course = {
  meta: {
    videoId: VIDEO_ID,
    videoUrl: VIDEO_URL,
    sourceTitle: "Claude Code for Non-Coders (6 Hour Course)",
    sourceAuthor: "Nate Herk",
    sourceChannel: "Nate Herk | AI Automation",
    durationSeconds: 21539,
    chapterCount: 35,
    moduleCount: 10,
    useCaseCount: useCases.length,
    glossaryCount: glossary.length,
  },
  roles: ROLES.map((r) => ({ ...r, useCaseCount: roleCounts[r.slug] })),
  modules,
  glossary,
  useCases,
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "course.json"), JSON.stringify(course, null, 2));

// --- digest for the chat's system prompt: dense, no JSON syntax tax ---
const lines = [];
lines.push(`# Course digest — "${course.meta.sourceTitle}" by ${course.meta.sourceAuthor}`);
lines.push(
  `Translated for public media professionals. ${course.meta.moduleCount} modules, ${course.meta.chapterCount} source chapters, ${course.meta.useCaseCount} station use cases.\n`,
);

for (const m of modules) {
  lines.push(`\n## Module ${m.number}: ${m.title}`);
  lines.push(`${m.kicker} | ~${m.runtimeMin} min of source video`);
  lines.push(`SUMMARY: ${m.plainSummary}`);
  lines.push(`WHY IT MATTERS: ${m.whyItMatters}`);

  lines.push(`CONCEPTS:`);
  for (const c of m.concepts) {
    lines.push(`- ${c.term} [${c.tLabel}]: ${c.plain} FOR A STATION: ${c.stationTranslation}`);
  }

  lines.push(`STATION USE CASES:`);
  for (const uc of m.useCases) {
    lines.push(
      `- [${uc.role}] ${uc.title}. Situation: ${uc.scenario} How Claude helps: ${uc.howClaudeHelps} Saves: ${uc.timeSaved} GUARDRAIL: ${uc.guardrail}`,
    );
  }

  lines.push(`TRY THIS — ${m.tryThis.title}. Setup: ${m.tryThis.setup}`);
  lines.push(`PROMPT: ${m.tryThis.prompt.replace(/\n/g, " ")}`);
  lines.push(`PITFALLS: ${m.pitfalls.join(" | ")}`);

  // module-specific extras the chat should know about
  if (m.mindsetShifts) {
    lines.push(
      `MINDSET SHIFTS (${m.mindsetShifts.length} actually named in the source): ` +
        m.mindsetShifts.map((s) => `${s.n}. ${s.shift} — ${s.stationTake}`).join(" | "),
    );
    if (m.mindsetShiftsNote) lines.push(`NOTE ON THESE: ${m.mindsetShiftsNote}`);
  }
  if (m.pyramid) {
    lines.push(
      `AI SYSTEMS PYRAMID (bottom→top): ` +
        m.pyramid.levels.map((l) => `${l.n}. ${l.name} — ${l.plain} (station: ${l.stationExample})`).join(" | "),
    );
    lines.push(`PYRAMID BIG IDEA: ${m.pyramid.bigIdea}`);
  }
  if (m.levels) {
    lines.push(
      `5 LEVELS OF A SECOND BRAIN: ` +
        m.levels.map((l) => `${l.n}. ${l.name} — ${l.plain} (station: ${l.stationExample}; effort ${l.effort})`).join(" | "),
    );
  }
  if (m.cacheBreakers) {
    lines.push(
      `CACHE BREAKERS: ` +
        m.cacheBreakers
          .map((c) => `${c.action} → ${c.breaksCache ? "BREAKS" : "does NOT break"} cache (${c.why})`)
          .join(" | "),
    );
  }
  if (m.costModel) {
    lines.push(`COST MODEL: ${JSON.stringify(m.costModel)}`);
  }
  if (m.automationBlueprint) {
    const b = m.automationBlueprint;
    lines.push(
      `AUTOMATION BLUEPRINT "${b.name}": trigger=${b.trigger}; steps=${b.steps.join(" → ")}; output=${b.output}; human checkpoint=${b.humanCheckpoint}; setup=${b.estSetupTime}`,
    );
  }
  if (m.skillAnatomy) {
    const s = m.skillAnatomy;
    lines.push(`SKILL ANATOMY: ${s.whatItIs} Lives at: ${s.whereItLives} Loaded when: ${s.whenClaudeLoadsIt}`);
  }
}

lines.push(`\n## Glossary`);
for (const g of glossary) lines.push(`- ${g.term}: ${g.definition}`);

writeFileSync(join(OUT, "digest.md"), lines.join("\n"));

const digestChars = lines.join("\n").length;
console.log(`✓ content/course.json  — ${modules.length} modules, ${useCases.length} use cases, ${glossary.length} glossary terms, ${chapterCount} chapters`);
console.log(`✓ content/digest.md    — ${digestChars.toLocaleString()} chars (~${Math.round(digestChars / 4).toLocaleString()} tokens)`);
console.log(`  role spread: ${ROLES.map((r) => `${r.slug}=${roleCounts[r.slug]}`).join(" ")}`);
