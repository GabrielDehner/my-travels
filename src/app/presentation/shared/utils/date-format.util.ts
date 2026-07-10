/** Maps an app language code to an `Intl` locale for date formatting. */
const LOCALE_BY_LANG: Record<string, string> = { en: 'en-US', es: 'es-ES' };

const DEFAULT_LOCALE = 'en-US';

/** Resolves the `Intl` locale to use for a given app language code (falls back to `en-US`). */
export function resolveDateLocale(lang: string | undefined | null): string {
  if (!lang) return DEFAULT_LOCALE;
  return LOCALE_BY_LANG[lang] ?? DEFAULT_LOCALE;
}

/** Matches a bare calendar date with no time component, e.g. "2026-07-10". */
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `value` is a date-only "YYYY-MM-DD" string (no time/offset).
 * These represent a CALENDAR DATE, not an instant — `new Date(value)` parses
 * them as UTC midnight, so formatting them in the browser's local timezone
 * can roll the displayed day backward (e.g. UTC-3 shows "9 jul" for a
 * "2026-07-10" value). Callers MUST format date-only values pinned to UTC
 * so the displayed calendar date always matches what the user picked.
 */
export function isDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value);
}

/**
 * Formats an ISO date(-time) string as a short, human-friendly localized
 * date (e.g. "Jul 10, 2026" in `en`, "10 jul 2026" in `es`), per the
 * governing "simple for non-technical users" principle — never show a raw
 * ISO string to a traveler. Date-only values are formatted pinned to UTC so
 * the calendar day never shifts due to the viewer's local timezone (see
 * `isDateOnly`); full date-times keep local-timezone formatting since they
 * represent a real instant (e.g. a flight's departure clock time). Returns
 * the original value unchanged if it does not parse as a valid date.
 */
export function formatHumanDate(iso: string, lang: string | undefined | null): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(resolveDateLocale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(isDateOnly(iso) ? { timeZone: 'UTC' } : {}),
  }).format(date);
}

/**
 * Today's calendar date as a local "YYYY-MM-DD" string — i.e. the day the
 * user actually sees on their device clock, NOT `new Date().toISOString()`
 * (which reads the UTC day and can be off-by-one near midnight in any
 * non-UTC timezone).
 */
export function todayDateOnly(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Extracts the "YYYY-MM-DD" calendar-date key from a date-only or date-time ISO string. */
function dateOnlyKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Lifecycle classification of a `[startIso, endIso]` calendar-date range against local "today". */
export type DateRangeStatus = 'past' | 'ongoing' | 'upcoming';

/**
 * Classifies a date range as `past` / `ongoing` / `upcoming` by comparing
 * CALENDAR DATES against local "today" (via `todayDateOnly`) — never by
 * comparing full timestamps/instants against `Date.now()`. A trip whose end
 * date is today is `ongoing`, not `past`; a single-day trip today is
 * `ongoing` for its entire calendar day, not just until the current instant.
 * `startIso`/`endIso` may be date-only or date-time ISO strings — only the
 * leading "YYYY-MM-DD" is compared. Plain string comparison is correct here
 * because "YYYY-MM-DD" sorts lexically in calendar order.
 */
export function classifyDateRange(startIso: string, endIso: string): DateRangeStatus {
  const today = todayDateOnly();
  const start = dateOnlyKey(startIso);
  const end = dateOnlyKey(endIso);
  if (today < start) return 'upcoming';
  if (today > end) return 'past';
  return 'ongoing';
}

/**
 * True when `iso` represents "today or later", used to filter upcoming-item
 * lists (e.g. Today's "Coming up" timeline). Date-only values (destination
 * arrival, hotel check-in/out — from `<ion-input type="date">`) are compared
 * as CALENDAR DATES against local "today" via `todayDateOnly()`, matching
 * `classifyDateRange`'s trip-status logic — never via `getTime() >=
 * Date.now()`, which is wrong for date-only values even without a timezone
 * bug: midnight-UTC-of-today is `< Date.now()` for nearly the whole day, so
 * a same-day item would incorrectly read as already past. Full date-time
 * values (transport `departAt`/`arriveAt` — from `<ion-input
 * type="datetime-local">`) represent a real instant/wall-clock time and
 * correctly keep an instant comparison against `Date.now()`.
 */
export function isTodayOrLater(iso: string): boolean {
  if (isDateOnly(iso)) return iso >= todayDateOnly();
  return new Date(iso).getTime() >= Date.now();
}

/** Inclusive day count between two ISO dates (minimum 1). */
export function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

/**
 * Formats a date range for display: a single human date when start and end
 * fall on the same day, otherwise "start - end", optionally appended with a
 * "· N days" style duration suffix via `durationLabel`.
 */
export function formatDateRange(
  startIso: string,
  endIso: string,
  lang: string | undefined | null,
  durationLabel?: (days: number) => string,
): string {
  const startDay = startIso.slice(0, 10);
  const endDay = endIso.slice(0, 10);
  const startLabel = formatHumanDate(startIso, lang);
  const base = startDay === endDay ? startLabel : `${startLabel} - ${formatHumanDate(endIso, lang)}`;
  if (!durationLabel) return base;
  return `${base} · ${durationLabel(daysBetweenInclusive(startIso, endIso))}`;
}
