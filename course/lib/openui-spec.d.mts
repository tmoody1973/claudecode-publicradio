import type { Library } from "@openuidev/react-lang";

/** Renderer functions keyed by component name. Omit to build a prompt-only library. */
export function buildCourseLibrary(renderers?: Record<string, unknown>): Library;

export const PREAMBLE: string;
export const ADDITIONAL_RULES: string[];
export const EXAMPLES: string[];
export const PROMPT_OPTIONS: {
  preamble: string;
  additionalRules: string[];
  examples: string[];
};
