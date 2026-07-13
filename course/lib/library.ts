import libraryJson from "@/content/library.json";
import { searchSources, type LibraryHit, type LibrarySource } from "@/lib/library-search.mjs";

export type { LibraryHit };

const library = libraryJson as {
  notebookUrl: string;
  snapshotDate: string;
  count: number;
  withDescription: number;
  titleOnly: number;
  sources: LibrarySource[];
};

export const libraryMeta = {
  notebookUrl: library.notebookUrl,
  snapshotDate: library.snapshotDate,
  count: library.count,
  withDescription: library.withDescription,
  titleOnly: library.titleOnly,
};

/**
 * The top vetted sources for a question. SYNCHRONOUS — 292 records scored in-process,
 * no network, no database, no added latency on the chat's critical path.
 *
 * Returns [] when nothing clears the score floor, and the caller must then send NO
 * library block at all.
 */
export function searchLibrary(question: string, k = 4): LibraryHit[] {
  return searchSources(library.sources, question, k);
}

/**
 * The grounding block handed to the model.
 *
 * The wording is load-bearing. The model has NOT read these sources — nobody has. It
 * is POINTING at them. If this block ever implies otherwise, the model will start
 * attributing claims to documents it never saw, which is the exact failure this site
 * exists to warn stations about.
 */
export function formatLibraryGrounding(hits: LibraryHit[]): string {
  if (hits.length === 0) return "";

  const lines = hits.map((h) => {
    const where = h.linkKind === "notebook" ? " [no standalone link — lives in the notebook]" : "";
    const desc = h.description ? `\n  ${h.description}` : "\n  (no description available)";
    return `- title: ${h.title}\n  publisher: ${h.publisher}\n  bucket: ${h.bucketLabel}\n  url: ${h.url}${where}${desc}`;
  });

  return [
    `These sources come from a library of ${libraryMeta.count} sources on AI in public media,`,
    `hand-vetted by Tarik Moody (Radio Milwaukee). They were matched to this question by`,
    `keyword overlap.`,
    ``,
    `YOU HAVE NOT READ THEM. Nobody has read them for you. You may POINT the person at`,
    `them with a Sources block, copying title, publisher, url and bucket EXACTLY as given.`,
    `You must NEVER quote them, summarise what they say, or attribute any claim to them.`,
    `If they are not relevant to your answer, leave the Sources block out entirely.`,
    ``,
    ...lines,
  ].join("\n");
}
