import type { Currency } from '../enums/currency';

/**
 * Immutable monetary amount in INTEGER minor units (e.g. cents) to avoid
 * floating-point drift (design §2).
 */
export interface Money {
  readonly amountMinor: number;
  readonly currency: Currency;
}

/** Constructs a Money value object, guarding the integer invariant. */
export function createMoney(amountMinor: number, currency: Currency): Money {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`Money.amountMinor must be an integer, got ${amountMinor}`);
  }
  return { amountMinor, currency };
}
