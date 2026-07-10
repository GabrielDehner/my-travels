import type { CountryOption } from '../data/countries.data';

import { filterCountries } from './country-filter.util';

describe('country-filter.util', () => {
  const options: readonly CountryOption[] = [
    { code: 'ES', en: 'Spain', es: 'España' },
    { code: 'US', en: 'United States', es: 'Estados Unidos' },
    { code: 'JP', en: 'Japan', es: 'Japón' },
  ];

  describe('filterCountries', () => {
    it('returns the full list when the query is empty', () => {
      expect(filterCountries(options, '', 'en')).toEqual(options);
    });

    it('returns the full list when the query is only whitespace', () => {
      expect(filterCountries(options, '   ', 'en')).toEqual(options);
    });

    it('returns the full list when the query is null/undefined', () => {
      expect(filterCountries(options, null, 'en')).toEqual(options);
      expect(filterCountries(options, undefined, 'en')).toEqual(options);
    });

    it('matches a substring, case-insensitively, in English', () => {
      expect(filterCountries(options, 'jap', 'en')).toEqual([options[2]!]);
      expect(filterCountries(options, 'JAP', 'en')).toEqual([options[2]!]);
    });

    it('matches against the localized (Spanish) name when lang is "es"', () => {
      expect(filterCountries(options, 'esp', 'es')).toEqual([options[0]!]);
    });

    it('does not match the English name when lang is "es" and only the English name contains it', () => {
      expect(filterCountries(options, 'spain', 'es')).toEqual([]);
    });

    it('returns an empty array when nothing matches', () => {
      expect(filterCountries(options, 'zzzzz', 'en')).toEqual([]);
    });

    it('matches a substring anywhere in the name, not just the start', () => {
      expect(filterCountries(options, 'states', 'en')).toEqual([options[1]!]);
    });
  });
});
