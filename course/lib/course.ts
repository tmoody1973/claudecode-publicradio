import raw from "@/content/course.json";

export type RoleSlug =
  | "news"
  | "membership"
  | "music"
  | "underwriting"
  | "digital"
  | "leadership"
  | "traffic"
  | "engineering"
  | "grants";

export type Role = {
  slug: RoleSlug;
  label: string;
  blurb: string;
  useCaseCount: number;
};

export type Concept = {
  term: string;
  plain: string;
  stationTranslation: string;
  tLabel: string;
  t: number;
  youtube: string;
};

export type Runbook = {
  steps: string[];
  verify: string;
  walkthroughSlug?: string;
};

export type UseCase = {
  id: string;
  role: string;
  roleSlug: RoleSlug;
  title: string;
  scenario: string;
  howClaudeHelps: string;
  timeSaved: string;
  guardrail: string;
  moduleId: string;
  moduleNumber: number;
  moduleTitle: string;
  runbook?: Runbook;
};

export type SourceChapter = {
  n: number;
  title: string;
  start: number;
  startLabel: string;
  youtube: string;
};

export type KeyQuote = { quote: string; tLabel: string; t: number; youtube: string };

export type TryThis = { title: string; setup: string; prompt: string };

export type MindsetShift = { n: number; shift: string; plain: string; stationTake: string };

export type PyramidLevel = {
  n: number;
  name: string;
  plain: string;
  stationExample: string;
  trustLevel: string;
};

export type BrainLevel = {
  n: number;
  name: string;
  plain: string;
  stationExample: string;
  effort: string;
  payoff: string;
};

export type CacheBreaker = {
  action: string;
  breaksCache: boolean;
  why: string;
  costImpact: string;
  avoidBy: string;
};

export type CostModel = {
  cachedReadMultiplier: number;
  subscriptionTtlMinutes: number;
  apiTtlMinutes: number;
  subagentTtlMinutes: number;
  notes: string;
};

export type AutomationBlueprint = {
  name: string;
  trigger: string;
  steps: string[];
  output: string;
  humanCheckpoint: string;
  estSetupTime: string;
};

export type SkillAnatomy = {
  whatItIs: string;
  whereItLives: string;
  whenClaudeLoadsIt: string;
  exampleSkillMd: string;
};

export type CourseModule = {
  id: string;
  slug: string;
  number: number;
  title: string;
  kicker: string;
  runtimeMin: number;
  sourceChapters: SourceChapter[];
  plainSummary: string;
  whyItMatters: string;
  concepts: Concept[];
  glossary: { term: string; definition: string }[];
  useCases: UseCase[];
  tryThis: TryThis;
  pitfalls: string[];
  keyQuotes: KeyQuote[];
  // module-specific extras
  mindsetShifts?: MindsetShift[];
  mindsetShiftsNote?: string;
  exampleClaudeMd?: string;
  skillAnatomy?: SkillAnatomy;
  pyramid?: { levels: PyramidLevel[]; bigIdea: string };
  levels?: BrainLevel[];
  automationBlueprint?: AutomationBlueprint;
  cacheBreakers?: CacheBreaker[];
  costModel?: CostModel;
};

export type GlossaryEntry = { term: string; definition: string; modules: number[] };

export type Course = {
  meta: {
    videoId: string;
    videoUrl: string;
    sourceTitle: string;
    sourceAuthor: string;
    sourceChannel: string;
    durationSeconds: number;
    chapterCount: number;
    moduleCount: number;
    useCaseCount: number;
    glossaryCount: number;
  };
  roles: Role[];
  modules: CourseModule[];
  glossary: GlossaryEntry[];
  useCases: UseCase[];
};

export const course = raw as unknown as Course;

export const modules = course.modules;
export const roles = course.roles;
export const glossary = course.glossary;
export const useCases = course.useCases;
export const meta = course.meta;

export function getModule(slug: string): CourseModule | undefined {
  return modules.find((m) => m.slug === slug);
}

export function useCasesForRole(role: RoleSlug | "all"): UseCase[] {
  return role === "all" ? useCases : useCases.filter((u) => u.roleSlug === role);
}

/** Tailwind-safe role colour lookup. Static map — Tailwind can't see `bg-role-${slug}`. */
export const roleColor: Record<RoleSlug, string> = {
  news: "var(--role-news)",
  membership: "var(--role-membership)",
  music: "var(--role-music)",
  underwriting: "var(--role-underwriting)",
  digital: "var(--role-digital)",
  leadership: "var(--role-leadership)",
  traffic: "var(--role-traffic)",
  engineering: "var(--role-engineering)",
  grants: "var(--role-grants)",
};

export function formatRuntime(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
