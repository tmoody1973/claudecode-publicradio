// NB: never import @openuidev/react-lang here. It calls React.createContext at
// import time, which does not exist in the server runtime. The system prompt is
// generated from the same component library at build time by scripts/gen-prompt.mjs.
import { SYSTEM_PROMPT } from "@/content/system-prompt";
import { buildGrounding } from "@/lib/retrieval";
import { searchLibrary, formatLibraryGrounding } from "@/lib/library";
import { createLineFilter } from "@/lib/stream-filter.mjs";
import { MODEL_CASCADE } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

/**
 * The OpenAI wire format allows `content` to be a plain string OR an array of
 * content parts — and openAIMessageFormat (what the chat client sends) uses the
 * array form. Accept both, or every real browser request gets filtered to nothing.
 */
function flattenContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        const text = (part as { text?: unknown } | null)?.text;
        return typeof text === "string" ? text : "";
      })
      .join("");
  }
  return "";
}

const sse = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;
const contentChunk = (text: string) =>
  sse({ choices: [{ delta: { content: text }, index: 0 }] });

/** A friendly OpenUI Lang answer, used when the model can't be reached at all. */
function fallbackAnswer(title: string, body: string, hint: string): string {
  const esc = (s: string) => s.replace(/"/g, "'");
  return [
    `root = Answer([c1, p1, f1])`,
    `c1 = Callout("warning", "${esc(title)}", "${esc(body)}")`,
    `p1 = Paragraph("${esc(hint)}")`,
    `f1 = FollowUps(["Take me to the modules", "What is Claude Code?", "Show me use cases for my role"])`,
  ].join("\n");
}

function streamOf(text: string): Response {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(contentChunk(text)));
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return streamOf(
      fallbackAnswer(
        "The assistant is not switched on yet",
        "This site needs an OPENROUTER_API_KEY environment variable to answer questions. Everything else on the site works without it — all ten modules, the fifty use cases, and the glossary are right here.",
        "Ask whoever deployed this to add a free OpenRouter key. In the meantime, browse the modules — the whole course is there.",
      ),
    );
  }

  let body: { messages?: ChatMessage[]; model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request body" }, { status: 400 });
  }

  // Optional model override, used by scripts/benchmark.mjs. Whitelisted against the
  // cascade so a caller can never steer this at a paid model on someone else's key.
  // When set, we test ONLY that model — a fallback would silently rescue a failure
  // and the benchmark would score the wrong thing.
  const requested = MODEL_CASCADE.find((m) => m.id === body.model);
  const cascade = requested ? [requested] : MODEL_CASCADE;

  const messages = (body.messages ?? [])
    .map((m) => ({ role: m?.role, content: flattenContent(m?.content) }))
    .filter((m): m is ChatMessage => Boolean(m.role) && m.content.trim().length > 0);

  if (messages.length === 0) {
    return Response.json({ error: "No messages provided" }, { status: 400 });
  }

  // Cap history — free models are rate-limited and we already send a big grounding block.
  const history = messages.slice(-8);
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const question = lastUser?.content ?? "";
  const grounding = buildGrounding(question);

  // Synchronous — 292 records scored in-process. No network, no DB, no added latency.
  // Returns [] for anything that doesn't clear the score floor ("how do I install
  // Claude Code" scores nothing against a research library), and we then send no
  // library block at all rather than pad the prompt with sources the model would
  // feel obliged to mention.
  const libraryHits = searchLibrary(question);

  const payload = {
    messages: [
      {
        role: "system",
        content:
          `${SYSTEM_PROMPT}\n\n# COURSE MATERIAL\n\n${grounding}` +
          (libraryHits.length
            ? `\n\n# LIBRARY: VETTED SOURCES YOU HAVE NOT READ\n\n${formatLibraryGrounding(libraryHits)}`
            : ""),
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 0.4,
    // 1600 truncated real answers mid-`Sources([...` — a long UseCaseCard plus a PromptBlock
    // eats the budget before the tail of the answer lands. Sources is defined early now, but
    // the headroom stops any tail block (FollowUps included) from being cut off.
    max_tokens: 2000,
    // Suppress thinking tokens where the model supports it — they corrupt the DSL.
    reasoning: { exclude: true },
  };

  const errors: string[] = [];

  for (const model of cascade) {
    let upstream: Response;
    try {
      upstream = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://claudecode-publicradio.vercel.app",
          "X-Title": "Claude Code for Public Media",
        },
        body: JSON.stringify({ ...payload, model: model.id }),
      });
    } catch (err) {
      errors.push(`${model.id}: network error (${err instanceof Error ? err.message : "unknown"})`);
      continue;
    }

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      errors.push(`${model.id}: HTTP ${upstream.status} ${detail.slice(0, 160)}`);
      continue; // rate-limited or down — try the next model down the cascade
    }

    // The ONLY place that knows which library ids the model was actually handed this turn.
    // The filter strips every other id out of any Sources block the model emits — including
    // the real, resolvable ids sitting in the system prompt's own few-shot examples, which
    // a weak free model will happily copy. See lib/stream-filter.mjs.
    const filter = createLineFilter(libraryHits.map((h) => h.id));
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let sawContent = false;
    let sseBuffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const events = sseBuffer.split("\n");
            sseBuffer = events.pop() ?? "";

            for (const line of events) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const data = t.slice(5).trim();
              if (data === "[DONE]") continue;

              let parsed: {
                choices?: { delta?: { content?: string | null } }[];
              };
              try {
                parsed = JSON.parse(data);
              } catch {
                continue; // OpenRouter sends `: OPENROUTER PROCESSING` keepalives
              }

              // NB: we deliberately never read delta.reasoning — it stays server-side.
              const piece = parsed.choices?.[0]?.delta?.content;
              if (typeof piece !== "string" || piece.length === 0) continue;

              const cleaned = filter.push(piece);
              if (cleaned) {
                sawContent = true;
                controller.enqueue(encoder.encode(contentChunk(cleaned)));
              }
            }
          }

          const tail = filter.flush();
          if (tail) {
            sawContent = true;
            controller.enqueue(encoder.encode(contentChunk(tail)));
          }

          if (!sawContent) {
            controller.enqueue(
              encoder.encode(
                contentChunk(
                  fallbackAnswer(
                    "That answer came back empty",
                    "The free model returned nothing usable. Free models on OpenRouter are rate-limited and rotate, so this happens occasionally.",
                    "Try asking again — it usually works on the second attempt.",
                  ),
                ),
              ),
            );
          }
        } catch {
          controller.enqueue(
            encoder.encode(
              contentChunk(
                fallbackAnswer(
                  "The connection dropped",
                  "The stream from the model was cut off partway through.",
                  "Ask again and it should come back.",
                ),
              ),
            ),
          );
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Model-Used": model.id,
      },
    });
  }

  // Every model in the cascade failed.
  return streamOf(
    fallbackAnswer(
      "Every free model is busy right now",
      "All the free models this site can reach are rate-limited or unavailable. That is the trade-off for running on a free tier — it costs nothing, and sometimes it makes you wait.",
      "Give it a minute and ask again. The modules and use cases below work regardless.",
    ),
  );
}
