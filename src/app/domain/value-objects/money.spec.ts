import { createMoney } from './money';

describe('createMoney', () => {
  it('creates a Money value object with the given integer minor units and currency', () => {
    const money = createMoney(4500, 'JPY');
    expect(money).toEqual({ amountMinor: 4500, currency: 'JPY' });
  });

  it('accepts zero as a valid amount', () => {
    expect(createMoney(0, 'USD')).toEqual({ amountMinor: 0, currency: 'USD' });
  });

  it('accepts negative integers (e.g. a refund)', () => {
    expect(createMoney(-500, 'USD')).toEqual({ amountMinor: -500, currency: 'USD' });
  });

  it('throws when amountMinor is a non-integer (fractional) number', () => {
    expect(() => createMoney(45.5, 'USD')).toThrowError(
      'Money.amountMinor must be an integer, got 45.5',
    );
  });

  it('throws when amountMinor is NaN', () => {
    expect(() => createMoney(Number.NaN, 'USD')).toThrowError();
  });

  it('throws when amountMinor is Infinity', () => {
    expect(() => createMoney(Number.POSITIVE_INFINITY, 'USD')).toThrowError();
  });
});
