import { COUNTRIES, countryName, findCountry } from './countries.data';

describe('countries.data', () => {
  describe('findCountry', () => {
    it('finds Spain by its ISO alpha-2 code', () => {
      expect(findCountry('ES')?.en).toBe('Spain');
      expect(findCountry('ES')?.es).toBe('España');
    });

    it('is case-insensitive', () => {
      expect(findCountry('es')?.en).toBe('Spain');
    });

    it('returns undefined for an unknown code', () => {
      expect(findCountry('ZZ')).toBeUndefined();
    });

    it('returns undefined for empty/null/undefined', () => {
      expect(findCountry('')).toBeUndefined();
      expect(findCountry(null)).toBeUndefined();
      expect(findCountry(undefined)).toBeUndefined();
    });
  });

  describe('countryName', () => {
    it('resolves the Spanish name when lang is "es"', () => {
      expect(countryName('ES', 'es')).toBe('España');
    });

    it('resolves the English name when lang is "en" or unset', () => {
      expect(countryName('ES', 'en')).toBe('Spain');
      expect(countryName('ES', null)).toBe('Spain');
    });

    it('returns "" for an unknown code', () => {
      expect(countryName('ZZ', 'en')).toBe('');
    });
  });

  it('has unique, uppercase ISO alpha-2 codes with non-empty bilingual names', () => {
    const codes = new Set<string>();
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(codes.has(country.code)).toBe(false);
      codes.add(country.code);
      expect(country.en.length).toBeGreaterThan(0);
      expect(country.es.length).toBeGreaterThan(0);
    }
    expect(COUNTRIES.length).toBeGreaterThan(150);
  });
});
