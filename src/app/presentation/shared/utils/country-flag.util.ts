/**
 * Pure ISO 3166-1 alpha-2 → flag emoji conversion. A flag emoji is just two
 * "regional indicator symbol" code points, one per letter (e.g. 'E' + 'S' →
 * 🇪🇸), computed by offsetting each ASCII letter into the Unicode regional
 * indicator block (U+1F1E6..U+1F1FF mirror 'A'..'Z').
 *
 * KNOWN OS LIMITATION: emoji flags do not render as flags on Windows/Chrome
 * (they show as two-letter text instead) — this is an operating-system font
 * limitation, not a bug in this app. The country NAME must always be shown
 * alongside the flag (see `countryName` in `countries.data.ts`) as the
 * reliable, always-legible label.
 */
const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 'A'.codePointAt(0)!;
const ISO2_RE = /^[A-Za-z]{2}$/;

/** Converts an ISO 3166-1 alpha-2 code to its flag emoji. Returns `''` for invalid/empty input. */
export function countryFlagEmoji(iso2: string | undefined | null): string {
  if (!iso2 || !ISO2_RE.test(iso2)) return '';
  const upper = iso2.toUpperCase();
  return [...upper]
    .map((letter) => String.fromCodePoint(letter.codePointAt(0)! + REGIONAL_INDICATOR_OFFSET))
    .join('');
}
