/**
 * Immutable ISO-date range with the invariant `start <= end` (design §2).
 * Always construct via `createDateRange` so the invariant is enforced.
 */
export interface DateRange {
  readonly start: string;
  readonly end: string;
}

/** Constructs a DateRange, throwing if `start` is after `end`. */
export function createDateRange(start: string, end: string): DateRange {
  if (new Date(start).getTime() > new Date(end).getTime()) {
    throw new Error(`DateRange invariant violated: start (${start}) must be <= end (${end})`);
  }
  return { start, end };
}

/** Type guard checking whether a candidate range satisfies the invariant. */
export function isValidDateRange(range: DateRange): boolean {
  return new Date(range.start).getTime() <= new Date(range.end).getTime();
}
