/**
 * Free OpenRouter models, ranked for THIS job: emit valid OpenUI Lang (a strict,
 * line-oriented DSL) while grounded in a ~15k-token course digest, and obey the
 * public-media guardrail rules.
 *
 * This order is EMPIRICAL, not from spec sheets. `npm run benchmark` runs every
 * model below against the real /api/chat route — real system prompt, real grounding
 * — and validates the output with the actual OpenUI parser (the same code the
 * <Renderer> runs). If the parser can't produce a root node, the answer renders as
 * a blank card, so syntax validity is scored first and hardest.
 *
 * Results, 2026-07-12 (3 prompts each; "rules" = fired the donor-data guardrail
 * Callout when the question touched member data):
 *
 *   MODEL                              VALID LANG  RULES  AVG LATENCY
 *   openai/gpt-oss-120b:free              3/3       3/3      20.5s
 *   nvidia/nemotron-3-super-120b:free     2/3       2/3       9.2s
 *   openrouter/free                       2/3       2/3      13.6s
 *   meta-llama/llama-3.3-70b:free         0/3       0/3        —     (HTTP 429)
 *   qwen/qwen3-next-80b-a3b:free          0/3       0/3        —     (HTTP 429)
 *
 * Two honest caveats:
 *  1. Llama 3.3 and Qwen3-Next scored zero because they were RATE-LIMITED upstream
 *     that day, not because they write bad Lang. Free-tier availability rotates
 *     hour to hour. They stay in the cascade; re-run the benchmark before trusting
 *     this order.
 *  2. Qwen3-Next was my a-priori pick (262k context, no reasoning mode, fast MoE)
 *     and it may well still be the best when reachable. It just could not be
 *     measured, so it does not get to sit at the top on a hunch.
 *
 * The reasoning-model liability is real and observed: Nemotron leaked its chain of
 * thought straight into `content` ("The user wants exactly 'OK'...") even with
 * OpenRouter's `reasoning.exclude` set. That is why the route line-filters the
 * stream — see createLineFilter() in app/api/chat/route.ts.
 */
export type RankedModel = {
  id: string;
  contextLength: number;
  why: string;
  reasoning: boolean;
};

export const MODEL_CASCADE: RankedModel[] = [
  {
    id: "openai/gpt-oss-120b:free",
    contextLength: 131_072,
    reasoning: true,
    why: "Benchmark winner: 3/3 valid OpenUI Lang and 3/3 on the guardrail rules — the only model that never dropped the donor-data warning. Slower (~20s), but a correct slow answer beats a fast broken one, and OpenUI streams so the UI fills in progressively.",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    contextLength: 1_000_000,
    reasoning: true,
    why: "Fastest of the models that actually work (~9s) and 1M context, but went 2/3 — one upstream failure — and it leaks reasoning traces into content, which the route has to filter out.",
  },
  {
    id: "openrouter/free",
    contextLength: 200_000,
    reasoning: true,
    why: "The meta-router. Self-healing when a specific model is rate-limited, which is its whole value here. Went 2/3: one answer malformed a Comparison. Non-deterministic, so you can't tune a prompt against it.",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    contextLength: 262_144,
    reasoning: false,
    why: "Untested — rate-limited (429) on benchmark day. On paper the best fit: 262k context and a NON-reasoning instruct model, so it should emit the DSL cleanly rather than thinking out loud into it. Worth re-benchmarking.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    contextLength: 131_072,
    reasoning: false,
    why: "Untested — also 429 on benchmark day. A dependable non-reasoning instruction follower; kept as the last real model before the router.",
  },
];

export const PRIMARY_MODEL = MODEL_CASCADE[0];
