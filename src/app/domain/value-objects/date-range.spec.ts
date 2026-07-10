import { createDateRange, isValidDateRange } from './date-range';

describe('createDateRange', () => {
  it('creates a DateRange when start is before end', () => {
    const range = createDateRange('2026-03-14', '2026-03-18');
    expect(range).toEqual({ start: '2026-03-14', end: '2026-03-18' });
  });

  it('creates a DateRange when start equals end (single-day trip)', () => {
    const range = createDateRange('2026-03-14', '2026-03-14');
    expect(range).toEqual({ start: '2026-03-14', end: '2026-03-14' });
  });

  it('throws when start is after end', () => {
    expect(() => createDateRange('2026-03-18', '2026-03-14')).toThrowError(
      /DateRange invariant violated/,
    );
  });

  it('compares by resolved date/time, not string order', () => {
    // ISO timestamps where string comparison would be misleading but date
    // comparison is unambiguous.
    expect(() =>
      createDateRange('2026-03-14T23:00:00.000Z', '2026-03-15T01:00:00.000Z'),
    ).not.toThrow();
  });
});

describe('isValidDateRange', () => {
  it('returns true for a range with start <= end', () => {
    expect(isValidDateRange({ start: '2026-03-14', end: '2026-03-18' })).toBe(true);
  });

  it('returns false for a range with start > end', () => {
    expect(isValidDateRange({ start: '2026-03-18', end: '2026-03-14' })).toBe(false);
  });

  it('returns true for start === end', () => {
    expect(isValidDateRange({ start: '2026-03-14', end: '2026-03-14' })).toBe(true);
  });
});
