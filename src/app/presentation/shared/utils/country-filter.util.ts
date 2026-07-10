import { COUNTRIES, type CountryOption } from '../data/countries.data';

/**
 * Pure, case-insensitive substring filter over {@link COUNTRIES} used by the
 * searchable country picker (`app-country-picker`). Matches against the
 * localized name for the given app language ("en" | "es"), so typing "esp"
 * finds "España" in Spanish and "Spain" wouldn't match under "es" — callers
 * pass the currently active app language.
 *
 * An empty/blank query returns the full list (unfiltered), and a query with
 * no matches returns an empty array — the caller renders an empty-state row.
 */
export function filterCountries(
  options: readonly CountryOption[],
  query: string | undefined | null,
  lang: string | undefined | null,
): readonly CountryOption[] {
  const trimmed = (query ?? '').trim().toLowerCase();
  if (!trimmed) return options;

  return options.filter((option) => {
    const name = lang === 'es' ? option.es : option.en;
    return name.toLowerCase().includes(trimmed);
  });
}

/** Convenience overload defaulting to the full {@link COUNTRIES} dataset. */
export function filterAllCountries(
  query: string | undefined | null,
  lang: string | undefined | null,
): readonly CountryOption[] {
  return filterCountries(COUNTRIES, query, lang);
}
