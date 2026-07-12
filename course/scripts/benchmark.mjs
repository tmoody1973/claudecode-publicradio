/**
 * Ranks the free OpenRouter models on the ONE job they have here: emit valid,
 * renderable OpenUI Lang, grounded in the course, with the guardrail rules obeyed.
 *
 * This hits the real /api/chat route (real system prompt, real grounding, real
 * stream filter), overriding only the model. A model that produces beautiful prose
 * but malformed Lang renders as a blank card — so syntax validity is scored first
 * and hardest.
 *
 * Usage: npm run dev, then: node scripts/benchmark.mjs
 */
import { createParser } from "@openuidev/react-lang";
import { buildCourseLibrary } from "../lib/openui-spec.mjs";

const BASE = process.argv[2] ?? "http://localhost:3000";

// Validate with the REAL parser — the same code the <Renderer> runs. A hand-rolled
// regex validator gets this wrong (it flags words inside quoted strings as undefined
// references, and rejects multi-line arrays the real parser accepts).
const LIBRARY = buildCourseLibrary();
const PARSER = createParser(LIBRARY.toJSONSchema());

const MODELS = [
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openrouter/free",
];

// Components the model is allowed to emit (must match lib/openui-library.tsx).
const COMPONENTS = new Set([
  "Answer", "Paragraph", "Callout", "UseCaseCard",
  "PromptBlock", "Steps", "ModuleRef", "VideoLink", "Comparison", "FollowUps",
]);

const PROMPTS = [
  {
    q: "What is Claude Code, in plain English?",
    // a basic explainer: must be prose + navigation, no guardrail strictly required
    wants: { followUps: true },
  },
  {
    q: "How could our membership team use this on our donor list?",
    // touches donor PII — a guardrail Callout is MANDATORY
    wants: { guardrail: true, useCase: true },
  },
  {
    q: "What's the difference between sub-agents and agent teams?",
    wants: { followUps: true },
  },
];

/** Walk the parsed tree and collect which components actually rendered. */
function collectComponents(node, out = new Set()) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    node.forEach((n) => collectComponents(n, out));
    return out;
  }
  if (node.type === "element" && node.typeName) out.add(node.typeName);
  for (const v of Object.values(node.props ?? {})) collectComponents(v, out);
  return out;
}

/** Is there a real Callout with tone="guardrail" in the tree? */
function hasGuardrailCallout(node) {
  if (!node || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some(hasGuardrailCallout);
  if (node.type === "element" && node.typeName === "Callout" && node.props?.tone === "guardrail") {
    return true;
  }
  return Object.values(node.props ?? {}).some(hasGuardrailCallout);
}

/** Validate with the real OpenUI parser: if it yields a root with no errors, it renders. */
function validate(text) {
  const errors = [];
  const raw = text.trim();

  if (!raw) return { ok: false, errors: ["empty response"], stats: {} };
  if (raw.includes("```")) errors.push("emitted a markdown fence");
  if (/<\/?think|<\/?reasoning/i.test(raw)) errors.push("leaked reasoning trace");

  let result;
  try {
    result = PARSER.parse(raw);
  } catch (e) {
    return { ok: false, errors: [`parser threw: ${String(e).slice(0, 60)}`], stats: {} };
  }

  if (!result.root) errors.push("produced no renderable root");
  if (result.root && result.root.typeName !== "Answer") {
    errors.push(`root is ${result.root.typeName}, not Answer`);
  }
  for (const e of result.meta?.errors ?? []) {
    errors.push(`${e.code}: ${e.component ?? ""} ${e.path ?? ""}`.trim());
  }
  for (const u of result.meta?.unresolved ?? []) {
    errors.push(`unresolved reference: ${u}`);
  }

  const used = collectComponents(result.root);

  return {
    ok: errors.length === 0,
    errors,
    stats: {
      statements: result.meta?.statementCount ?? 0,
      components: [...used],
      hasGuardrail: hasGuardrailCallout(result.root),
      hasUseCase: used.has("UseCaseCard"),
      hasFollowUps: used.has("FollowUps"),
      hasPrompt: used.has("PromptBlock"),
      chars: raw.length,
    },
  };
}

async function ask(model, question) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: question }] }),
    });
  } catch (e) {
    return { text: "", ms: Date.now() - t0, transportError: String(e) };
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let firstTokenMs = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      const t = p.trim();
      if (!t.startsWith("data:")) continue;
      const d = t.slice(5).trim();
      if (d === "[DONE]") continue;
      try {
        const j = JSON.parse(d);
        const piece = j.choices?.[0]?.delta?.content;
        if (piece) {
          if (firstTokenMs === null) firstTokenMs = Date.now() - t0;
          text += piece;
        }
      } catch {}
    }
  }
  return { text, ms: Date.now() - t0, firstTokenMs, modelUsed: res.headers.get("X-Model-Used") };
}

console.log(`Benchmarking ${MODELS.length} free models × ${PROMPTS.length} prompts against ${BASE}\n`);

const table = [];

for (const model of MODELS) {
  const runs = [];
  for (const p of PROMPTS) {
    const { text, ms, firstTokenMs, transportError } = await ask(model, p.q);

    // The route swaps in a fallback answer when the model itself failed; detect that
    // so a rate-limited model doesn't score as a valid emitter.
    const fellBack =
      /Callout\("warning", "(That answer came back empty|Every free model is busy|The connection dropped)/.test(text);

    const v = validate(text);
    const missing = [];
    if (p.wants.guardrail && !v.stats.hasGuardrail) missing.push("guardrail Callout");
    if (p.wants.useCase && !v.stats.hasUseCase) missing.push("UseCaseCard");
    if (p.wants.followUps && !v.stats.hasFollowUps) missing.push("FollowUps");

    runs.push({
      q: p.q,
      ok: v.ok && !fellBack && missing.length === 0,
      validLang: v.ok && !fellBack,
      fellBack,
      transportError,
      errors: v.errors.slice(0, 3),
      missing,
      ms,
      firstTokenMs,
      stats: v.stats,
    });

    const badge = fellBack
      ? "FAILED (upstream)"
      : !v.ok
        ? "INVALID LANG"
        : missing.length
          ? `valid, missing: ${missing.join(", ")}`
          : "PASS";
    console.log(
      `  ${model.padEnd(42)} ${String(ms).padStart(6)}ms  ${badge}` +
        (v.errors.length ? `\n      └─ ${v.errors.slice(0, 2).join("; ")}` : ""),
    );
  }

  const passes = runs.filter((r) => r.ok).length;
  const validLang = runs.filter((r) => r.validLang).length;
  const avgMs = Math.round(runs.reduce((s, r) => s + r.ms, 0) / runs.length);
  const guardrailWhenNeeded = runs.find((r) => r.q.includes("donor"))?.stats.hasGuardrail ?? false;

  table.push({ model, passes, validLang, avgMs, guardrailWhenNeeded, runs });
  console.log("");
}

// rank: valid Lang first (a broken DSL renders as nothing), then full passes, then speed
table.sort((a, b) => b.validLang - a.validLang || b.passes - a.passes || a.avgMs - b.avgMs);

console.log("\n" + "=".repeat(92));
console.log("RANKING — valid OpenUI Lang first (malformed Lang renders as a blank card), then");
console.log("          rule compliance (guardrail on donor questions), then latency.");
console.log("=".repeat(92));
console.log(
  "RANK  MODEL".padEnd(52) + "VALID LANG  RULES  GUARDRAIL  AVG LATENCY",
);
console.log("-".repeat(92));
table.forEach((r, i) => {
  console.log(
    `${String(i + 1).padEnd(6)}${r.model.padEnd(46)}` +
      `${r.validLang}/3`.padEnd(12) +
      `${r.passes}/3`.padEnd(7) +
      `${r.guardrailWhenNeeded ? "yes" : "NO "}`.padEnd(11) +
      `${r.avgMs}ms`,
  );
});
console.log("=".repeat(92));
const winner = table[0];
console.log(`\nWinner: ${winner.model}`);
console.log(`Set it as MODEL_CASCADE[0] in lib/models.ts.\n`);
