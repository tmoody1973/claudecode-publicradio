export type LineFilter = {
  /** Feed a raw chunk from the model. Returns the cleaned, complete lines it unlocked. */
  push(chunk: string): string;
  /** Flush the trailing partial line at end of stream. */
  flush(): string;
};

/**
 * @param allowedIds The library ids actually retrieved this turn. Empty => no Sources
 *                   block may render.
 */
export function createLineFilter(allowedIds?: Iterable<number>): LineFilter;
