import {
  classifyDateRange,
  daysBetweenInclusive,
  formatHumanDate,
  isDateOnly,
  isTodayOrLater,
  todayDateOnly,
} from './date-format.util';

describe('date-format.util', () => {
  describe('isDateOnly', () => {
    it('recognizes a bare "YYYY-MM-DD" string', () => {
      expect(isDateOnly('2026-07-10')).toBe(true);
    });

    it('rejects a date-time string', () => {
      expect(isDateOnly('2026-07-10T14:30')).toBe(false);
      expect(isDateOnly('2026-07-10T00:00:00.000Z')).toBe(false);
    });
  });

  describe('formatHumanDate', () => {
    it('formats a date-only string on the SAME calendar day regardless of the caller timezone', () => {
      // Regression: new Date('2026-07-10') is UTC midnight. Formatting it in
      // a UTC-behind local timezone without pinning to UTC would roll the
      // day back to "9 jul" / "Jul 9". Asserting against the UTC-formatted
      // date proves the util never applies a local-timezone shift for a
      // date-only value.
      const result = formatHumanDate('2026-07-10', 'es');
      expect(result).toBe(
        new Intl.DateTimeFormat('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date('2026-07-10')),
      );
      expect(result).toContain('10');
      expect(result).not.toContain(' 9 ');
    });

    it('formats en-US the same way, pinned to UTC', () => {
      const result = formatHumanDate('2026-01-01', 'en');
      expect(result).toBe(
        new Intl.DateTimeFormat('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date('2026-01-01')),
      );
    });

    it('returns the original value unchanged when it does not parse as a date', () => {
      expect(formatHumanDate('not-a-date', 'en')).toBe('not-a-date');
    });

    it('keeps local-timezone formatting for a full date-time value (a real instant, not a calendar date)', () => {
      const iso = '2026-07-10T14:30:00.000Z';
      const result = formatHumanDate(iso, 'en');
      expect(result).toBe(
        new Intl.DateTimeFormat('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(new Date(iso)),
      );
    });
  });

  describe('daysBetweenInclusive', () => {
    it('returns 1 for a single-day range (start === end)', () => {
      expect(daysBetweenInclusive('2026-07-10', '2026-07-10')).toBe(1);
    });

    it('returns the inclusive day count for a multi-day range', () => {
      expect(daysBetweenInclusive('2026-07-10', '2026-07-12')).toBe(3);
    });
  });

  describe('todayDateOnly', () => {
    it('returns today as a local "YYYY-MM-DD" string matching Date getters (not the UTC day)', () => {
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate(),
      ).padStart(2, '0')}`;
      expect(todayDateOnly()).toBe(expected);
    });
  });

  describe('classifyDateRange', () => {
    const today = todayDateOnly();
    const parts = today.split('-').map(Number);
    const y = parts[0] ?? 0;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    const shiftDays = (days: number): string => {
      const date = new Date(y, m - 1, d + days);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
    };
    const yesterday = shiftDays(-1);
    const tomorrow = shiftDays(1);

    it('classifies a trip ending today as "ongoing", not "past" (the reported bug)', () => {
      expect(classifyDateRange(yesterday, today)).toBe('ongoing');
    });

    it('classifies a single-day trip starting and ending today as "ongoing"', () => {
      expect(classifyDateRange(today, today)).toBe('ongoing');
    });

    it('classifies a trip that fully ended before today as "past"', () => {
      expect(classifyDateRange(shiftDays(-3), yesterday)).toBe('past');
    });

    it('classifies a trip starting after today as "upcoming"', () => {
      expect(classifyDateRange(tomorrow, shiftDays(3))).toBe('upcoming');
    });

    it('classifies a trip spanning today (start before, end after) as "ongoing"', () => {
      expect(classifyDateRange(yesterday, tomorrow)).toBe('ongoing');
    });
  });

  describe('isTodayOrLater', () => {
    const today = todayDateOnly();
    const parts = today.split('-').map(Number);
    const y = parts[0] ?? 0;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    const shiftDays = (days: number): string => {
      const date = new Date(y, m - 1, d + days);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
    };

    it('keeps a date-only value dated today (the "Coming up" midnight boundary bug)', () => {
      // Regression: `new Date(today).getTime() >= Date.now()` is false for
      // almost the entire day (midnight-UTC-of-today is far behind "now" in
      // any negative-UTC timezone), which silently dropped same-day items
      // from Today's "Coming up" list. Must compare calendar days instead.
      expect(isTodayOrLater(today)).toBe(true);
    });

    it('keeps a date-only value dated in the future', () => {
      expect(isTodayOrLater(shiftDays(1))).toBe(true);
    });

    it('drops a date-only value dated in the past', () => {
      expect(isTodayOrLater(shiftDays(-1))).toBe(false);
    });

    it('keeps a full date-time value that is still in the future', () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      expect(isTodayOrLater(future)).toBe(true);
    });

    it('drops a full date-time value that already passed', () => {
      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(isTodayOrLater(past)).toBe(false);
    });
  });
});
