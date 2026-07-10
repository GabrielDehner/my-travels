import { countryName } from '../data/countries.data';

import { countryFlagEmoji } from './country-flag.util';

/**
 * Builds the "flag + localized country name" label shown across the app
 * (destinations list, place detail, Itinerary/Today) for a
 * `Destination.countryCode`. Falls back to the legacy free-text
 * `Destination.country` when no `countryCode` is set (older data), and to
 * `''` when neither is present — callers render nothing in that case.
 */
export function countryDisplayLabel(
  countryCode: string | undefined | null,
  fallbackCountry: string | undefined | null,
  lang: string | undefined | null,
): string {
  const name = countryName(countryCode, lang);
  if (name) {
    const flag = countryFlagEmoji(countryCode);
    return flag ? `${flag} ${name}` : name;
  }
  return fallbackCountry ?? '';
}
