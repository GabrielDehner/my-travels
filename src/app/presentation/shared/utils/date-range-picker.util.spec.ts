import { buildMonthGrid, isInRange, nextTapState, shiftMonth } from './date-range-picker.util';

describe('date-range-picker.util', () => {
  describe('buildMonthGrid', () => {
    it('returns exactly 42 days (6 full weeks)', () => {
      expect(buildMonthGrid(2026, 7).length).toBe(42);
    });

    it('includes every day of the requested month marked inCurrentMonth', () => {
      const grid = buildMonthGrid(2026, 7);
      const julyDays = grid.filter((day) => day.inCurrentMonth);
      expect(julyDays.length).toBe(31);
      expect(julyDays.at(0)?.date).toBe('2026-07-01');
      expect(julyDays.at(-1)?.date).toBe('2026-07-31');
    });

    it('pads leading/trailing days from adjacent months, marked inCurrentMonth: false', () => {
      const grid = buildMonthGrid(2026, 7);
      // 2026-07-01 is a Wednesday, so the grid should start on Sunday 2026-06-28.
      expect(grid.at(0)?.date).toBe('2026-06-28');
      expect(grid.at(0)?.inCurrentMonth).toBe(false);
    });

    it('never shifts a day due to timezone (pure UTC-pinned date math)', () => {
      const grid = buildMonthGrid(2026, 1);
      const jan1 = grid.find((day) => day.date === '2026-01-01');
      expect(jan1?.day).toBe(1);
      expect(jan1?.inCurrentMonth).toBe(true);
    });
  });

  describe('shiftMonth', () => {
    it('moves forward within the same year', () => {
      expect(shiftMonth(2026, 7, 1)).toEqual({ year: 2026, month: 8 });
    });

    it('moves backward within the same year', () => {
      expect(shiftMonth(2026, 7, -1)).toEqual({ year: 2026, month: 6 });
    });

    it('rolls over to the next year past December', () => {
      expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    });

    it('rolls back to the previous year before January', () => {
      expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    });
  });

  describe('isInRange', () => {
    it('is true for the start, end, and any day between', () => {
      expect(isInRange('2026-07-10', '2026-07-10', '2026-07-14')).toBe(true);
      expect(isInRange('2026-07-12', '2026-07-10', '2026-07-14')).toBe(true);
      expect(isInRange('2026-07-14', '2026-07-10', '2026-07-14')).toBe(true);
    });

    it('is false outside the range', () => {
      expect(isInRange('2026-07-09', '2026-07-10', '2026-07-14')).toBe(false);
      expect(isInRange('2026-07-15', '2026-07-10', '2026-07-14')).toBe(false);
    });

    it('handles a start/end passed in reversed order', () => {
      expect(isInRange('2026-07-12', '2026-07-14', '2026-07-10')).toBe(true);
    });

    it('is false when start or end is empty', () => {
      expect(isInRange('2026-07-12', '', '2026-07-14')).toBe(false);
      expect(isInRange('2026-07-12', '2026-07-10', '')).toBe(false);
    });
  });

  describe('nextTapState', () => {
    it('first tap (stage=start) sets a single-day range and moves to end stage', () => {
      const result = nextTapState(null, 'start', '2026-07-10');
      expect(result.range).toEqual({ start: '2026-07-10', end: '2026-07-10' });
      expect(result.nextStage).toBe('end');
    });

    it('second tap after the start builds the range and resets to start stage', () => {
      const result = nextTapState('2026-07-10', 'end', '2026-07-14');
      expect(result.range).toEqual({ start: '2026-07-10', end: '2026-07-14' });
      expect(result.nextStage).toBe('start');
    });

    it('second tap before the pending start swaps so the earlier date becomes start', () => {
      const result = nextTapState('2026-07-14', 'end', '2026-07-10');
      expect(result.range).toEqual({ start: '2026-07-10', end: '2026-07-14' });
      expect(result.nextStage).toBe('start');
    });

    it('second tap on the same day as the pending start yields a single-day range', () => {
      const result = nextTapState('2026-07-10', 'end', '2026-07-10');
      expect(result.range).toEqual({ start: '2026-07-10', end: '2026-07-10' });
      expect(result.nextStage).toBe('start');
    });

    it('a tap in start stage with a stale pendingStart still starts a fresh range', () => {
      // Guards against stage/pendingStart getting out of sync — 'start' stage
      // always wins regardless of what pendingStart still holds.
      const result = nextTapState('2026-01-01', 'start', '2026-07-10');
      expect(result.range).toEqual({ start: '2026-07-10', end: '2026-07-10' });
      expect(result.nextStage).toBe('end');
    });

    it('treats a null pendingStart in end stage as if it were start stage (defensive)', () => {
      const result = nextTapState(null, 'end', '2026-07-10');
      expect(result.range).toEqual({ start: '2026-07-10', end: '2026-07-10' });
      expect(result.nextStage).toBe('end');
    });
  });
});
