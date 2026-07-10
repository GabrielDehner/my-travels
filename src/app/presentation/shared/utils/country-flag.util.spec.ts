import { countryFlagEmoji } from './country-flag.util';

describe('country-flag.util', () => {
  describe('countryFlagEmoji', () => {
    it('converts "ES" to the Spain flag emoji', () => {
      expect(countryFlagEmoji('ES')).toBe('🇪🇸');
    });

    it('is case-insensitive (lowercase input)', () => {
      expect(countryFlagEmoji('es')).toBe('🇪🇸');
    });

    it('converts "JP" to the Japan flag emoji', () => {
      expect(countryFlagEmoji('JP')).toBe('🇯🇵');
    });

    it('returns "" for an empty string', () => {
      expect(countryFlagEmoji('')).toBe('');
    });

    it('returns "" for null/undefined', () => {
      expect(countryFlagEmoji(null)).toBe('');
      expect(countryFlagEmoji(undefined)).toBe('');
    });

    it('returns "" for an invalid (non 2-letter) code', () => {
      expect(countryFlagEmoji('ESP')).toBe('');
      expect(countryFlagEmoji('E')).toBe('');
      expect(countryFlagEmoji('12')).toBe('');
    });
  });
});
