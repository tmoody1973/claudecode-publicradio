import raw from "@/content/walkthroughs.json";
import type { RoleSlug } from "@/lib/course";

export type TurnRole = "user" | "assistant" | "tool" | "permission";

export type Turn = {
  n: number;
  role: TurnRole;
  text: string;
  tool?: { name: string; arg: string; result: string };
};

export type RecordedSession = {
  cwd: string;
  turns: Turn[];
  recordedOn: string;
  trimmed: boolean;
  trimNote: string;
};

export type Step = {
  n: number;
  title: string;
  do: string;
  prompt?: string;
  youWillSee: string;
  sessionTurn?: number;
  note?: string;
};

export type SampleData = {
  filename: string;
  description: string;
  rows: number;
  columns: string[];
  downloadPath: string;
  synthetic: true;
};

export type VerifyCheck = { check: string; why: string; ifWrong: string };
export type Trouble = { symptom: string; cause: string; fix: string };

export type Walkthrough = {
  id: string;
  slug: string;
  tier: "onboarding" | "flagship";
  title: string;
  kicker: string;
  roleSlug: RoleSlug | null;
  moduleNumber: number;
  estMinutes: number;
  youWillNeed: string[];
  guardrail: string;
  sampleData?: SampleData;
  steps: Step[];
  session: RecordedSession;
  verify: VerifyCheck[];
  troubleshooting: Trouble[];
};

export const walkthroughs = raw as unknown as Walkthrough[];

export function getWalkthrough(slug: string): Walkthrough | undefined {
  return walkthroughs.find((w) => w.slug === slug);
}

/**
 * The walkthrough that teaches a given module, if one exists.
 *
 * Prefers a flagship: the onboarding walkthrough is also tagged to a module, but it's
 * reachable from the home CTA and the index, and a module page asking "rather be walked
 * through it?" means the job, not the install. Without this, `.find()` returns whichever
 * file sorts first and silently shadows the flagship.
 */
export function walkthroughForModule(moduleNumber: number): Walkthrough | undefined {
  const forModule = walkthroughs.filter((w) => w.moduleNumber === moduleNumber);
  return forModule.find((w) => w.tier === "flagship") ?? forModule[0];
}
