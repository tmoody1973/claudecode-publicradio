export type LibraryHit = {
  id: number;
  title: string;
  publisher: string;
  url: string;
  bucket: string;
  bucketLabel: string;
  linkKind: "direct" | "notebook";
  description: string | null;
};

export type LibrarySource = {
  id: number;
  title: string;
  publisher: string;
  url: string;
  linkKind: "direct" | "notebook";
  bucket: string;
  bucketLabel: string;
  type: string;
  description: string | null;
  descriptionSource: "og" | "none";
  classifiedBy: string;
};

export const SCORE_FLOOR: number;
export function tokenize(s: string): string[];
export function scoreSource(queryTokens: string[], source: LibrarySource): number;
export function searchSources(sources: LibrarySource[], question: string, k?: number): LibraryHit[];
