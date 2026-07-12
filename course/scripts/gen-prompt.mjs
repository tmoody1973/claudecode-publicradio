/**
 * Bakes the OpenUI Lang system prompt into content/system-prompt.ts at build time.
 *
 * This exists because @openuidev/react-lang calls React.createContext at import
 * time, which doesn't exist in the RSC/server environment — so the chat route can
 * never import it. Here in plain Node it imports fine, so we generate the prompt
 * once and hand the route an ordinary string.
 *
 * Run: node scripts/gen-prompt.mjs   (wired into `npm run build` via prebuild)
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCourseLibrary, PROMPT_OPTIONS } from "../lib/openui-spec.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const library = buildCourseLibrary(); // stub renderers — we only want the prompt
const prompt = library.prompt(PROMPT_OPTIONS);

if (!prompt || prompt.length < 500) {
  throw new Error(`Generated system prompt looks wrong (${prompt?.length ?? 0} chars)`);
}
if (!prompt.includes("Answer")) {
  throw new Error("Generated system prompt is missing the Answer root component");
}

const out = `// GENERATED FILE — do not edit.
// Produced by scripts/gen-prompt.mjs from lib/openui-spec.mjs. Run \`npm run build\`
// (or \`node scripts/gen-prompt.mjs\`) to regenerate after changing the component library.

export const SYSTEM_PROMPT = ${JSON.stringify(prompt)};
`;

writeFileSync(join(__dirname, "..", "content", "system-prompt.ts"), out);

console.log(
  `✓ content/system-prompt.ts — ${prompt.length.toLocaleString()} chars (~${Math.round(
    prompt.length / 4,
  ).toLocaleString()} tokens)`,
);
