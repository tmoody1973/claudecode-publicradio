import libraryJson from "@/content/library.json";
import { searchSources, type LibraryHit, type LibrarySource } from "@/lib/library-search.mjs";

export type { LibraryHit };

const library = libraryJson as {
  notebookUrl: string;
  count: number;
  sources: LibrarySource[];
};

export const libraryMeta = {
  notebookUrl: library.notebookUrl,
  count: library.count,
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
 * The wording is load-bearing, in two directions.
 *
 * It must not UNDERSELL: if it hedges, the model drops the block and the feature never
 * fires, on exactly the station questions the library is best at. The default is to point.
 *
 * It must not OVERSELL either. The earlier draft told the model "this section only appears
 * when the sources genuinely match the question, so you do not need to second-guess it".
 * That was not true, and lib/library-search.mjs's own comment says so: the qualification
 * gate leaks — "how much does Claude cost per month?" retrieves an article about Kaiser
 * nurses. Asserting the match is genuine ALSO disarmed the model's own relevance check,
 * which is the design's second line of defence. So: say what the matcher actually is
 * (keyword overlap, crude), keep the positive default, and hand the judgement back.
 *
 * And the model has NOT read these sources — nobody has. It is POINTING at them. If this
 * block ever implies otherwise, the model starts attributing claims to documents it never
 * saw, which is the exact failure this site exists to warn stations about.
 */
export function formatLibraryGrounding(hits: LibraryHit[]): string {
  if (hits.length === 0) return "";

  const lines = hits.map((h) => {
    const where = h.linkKind === "notebook" ? " [no standalone link — lives in the notebook]" : "";
    const desc = h.description ? `\n  ${h.description}` : "\n  (no description available)";
    return `- id: ${h.id}\n  title: ${h.title}\n  publisher: ${h.publisher}\n  bucket: ${h.bucketLabel}\n  url: ${h.url}${where}${desc}`;
  });

  return [
    `These sources come from a library of ${libraryMeta.count} sources on AI in public media,`,
    `hand-vetted by Tarik Moody (Radio Milwaukee). A keyword matcher picked them for this`,
    `question. It is crude — it matches words, it does not understand the question — so it`,
    `is usually right and occasionally silly.`,
    ``,
    `USUALLY RIGHT, so POINT the person at them. That is the default. Put a Sources block in`,
    `the \`root = Answer([...])\` array on your very first line, second-to-last, right before`,
    `FollowUps — \`root = Answer([p1, p2, src, follow])\` — then write \`src = Sources([...])\``,
    `immediately, on line two, before the prose. Hoisting still renders it in the right`,
    `place, and defining it early is how you avoid losing it if the answer runs long.`,
    ``,
    `OCCASIONALLY SILLY, so you are the check. Read the titles below against the answer you`,
    `actually wrote. If a source has nothing to do with it, leave that id out. If NONE of`,
    `them do, leave the whole Sources block out. Do not point someone at a source because it`,
    `was offered to you — point at it because it is about what they asked.`,
    ``,
    `The COURSE MATERIAL above may already answer the question on its own. That is not a`,
    `reason to drop these. The course teaches the person what to do; these sources are where`,
    `they go to see what real newsrooms and stations actually did. Pointing at them ADDS to a`,
    `complete answer — it never replaces one. So a confident, course-grounded answer on a`,
    `topic these sources are about still ends with Sources.`,
    ``,
    `YOU HAVE NOT READ THEM. Nobody has read them for you. Emit ONLY the numeric id of each`,
    `source EXACTLY as given below — never a title, publisher, or url. An id you were not`,
    `given below will not render. You must NEVER quote them, summarise what they say, or`,
    `attribute any claim to them. You are pointing, not citing.`,
    ``,
    ...lines,
  ].join("\n");
}
