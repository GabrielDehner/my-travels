/**
 * Pure, timezone-safe calendar-grid + range-selection logic for
 * `DateRangePickerComponent`. Kept separate from the component so the core
 * date math is unit-testable without Angular/Ionic — all functions here work
 * exclusively with "YYYY-MM-DD" date-only strings and internal `Date`
 * objects constructed/read via `Date.UTC`/`getUTC*`, never via the local
 * timezone, so a calendar day never rolls backward/forward for a viewer in a
 * non-UTC offset (the exact bug `date-format.util.ts`'s `isDateOnly` already
 * documents for `new Date('YYYY-MM-DD')` + local-timezone formatting).
 */

/** A single day cell in a rendered month grid. */
export interface CalendarDay {
  /** "YYYY-MM-DD" calendar date. */
  readonly date: string;
  /** Day-of-month number (1-31), for display. */
  readonly day: number;
  /** False for the leading/trailing days of adjacent months shown to fill the grid. */
  readonly inCurrentMonth: boolean;
}

/** A closed date range, always with `start <= end` lexically. */
export interface SimpleDateRange {
  readonly start: string;
  readonly end: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Parses a "YYYY-MM-DD" string into a UTC-pinned `Date` (never local time). */
function toUtcDate(dateOnly: string): Date {
  const parts = dateOnly.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, m - 1, d));
}

/** Formats a UTC-pinned `Date` back to "YYYY-MM-DD" (never local time). */
function fromUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** Adds (or subtracts) whole days to a UTC-pinned `Date`, returning a new `Date`. */
function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * Builds a full 6-week (42-day) month grid starting on Sunday, for `month`
 * (1-12) of `year`. Includes leading/trailing days from the adjacent months
 * (marked `inCurrentMonth: false`) so the grid always fills 6 full rows.
 */
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = toUtcDate(`${year}-${pad2(month)}-01`);
  const firstWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday
  const gridStart = addUtcDays(firstOfMonth, -firstWeekday);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = addUtcDays(gridStart, i);
    days.push({
      date: fromUtcDate(cellDate),
      day: cellDate.getUTCDate(),
      inCurrentMonth:
        cellDate.getUTCMonth() === month - 1 && cellDate.getUTCFullYear() === year,
    });
  }
  return days;
}

/** Extracts `{ year, month }` (month 1-12) from a "YYYY-MM-DD" date-only string. */
export function parseYearMonth(dateOnly: string): { year: number; month: number } {
  const parts = dateOnly.split('-').map(Number);
  return { year: parts[0] ?? 1970, month: parts[1] ?? 1 };
}

/** Shifts a `{ year, month }` (month 1-12) by `delta` whole months, rolling over year boundaries. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const zeroBasedIndex = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(zeroBasedIndex / 12);
  const nextMonth = ((zeroBasedIndex % 12) + 12) % 12;
  return { year: nextYear, month: nextMonth + 1 };
}

/** True when `date` falls within the closed range `[start, end]` (order-independent), inclusive. */
export function isInRange(date: string, start: string, end: string): boolean {
  if (!start || !end) return false;
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  return date >= lo && date <= hi;
}

/** Which tap this next click represents in the two-tap range-selection flow. */
export type TapStage = 'start' | 'end';

/**
 * Advances the two-tap range-selection state machine by one tap.
 *
 * - A `'start'`-stage tap (first tap, or the tap right after a completed
 *   range) always starts a brand-new single-day range at `tapped` and moves
 *   to `'end'` stage.
 * - An `'end'`-stage tap (second tap) closes the range: if `tapped` is on or
 *   after the pending start, it becomes the end; if `tapped` is BEFORE the
 *   pending start, `tapped` becomes the new start and the old start becomes
 *   the end (never produces an inverted range). Either way, stage resets to
 *   `'start'` so the very next tap begins a fresh selection.
 *
 * Always returns `start <= end` lexically, including the single-day case
 * (`start === end`).
 */
export function nextTapState(
  pendingStart: string | null,
  stage: TapStage,
  tapped: string,
): { range: SimpleDateRange; nextStage: TapStage } {
  if (stage === 'start' || !pendingStart) {
    return { range: { start: tapped, end: tapped }, nextStage: 'end' };
  }
  if (tapped < pendingStart) {
    return { range: { start: tapped, end: pendingStart }, nextStage: 'start' };
  }
  return { range: { start: pendingStart, end: tapped }, nextStage: 'start' };
}
