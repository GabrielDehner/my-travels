import type { Currency } from '../../domain/enums/currency';
import { createMoney, type Money } from '../../domain/value-objects/money';

/**
 * Seeded, in-memory approximate-to-USD rate table (MVP — design §5).
 *
 * The app is offline-first with no backend (design §11), so there is no
 * live FX feed to call. These rates are a fixed MVP seed, NOT refreshed at
 * runtime; `approxUsd` on an Expense is therefore always an approximation,
 * never a precise conversion. Revisit only if/when a backend (v2) can
 * supply a real, periodically-refreshed rate table.
 */
const APPROX_USD_RATE: Readonly<Record<Currency, number>> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  CNY: 0.14,
  AUD: 0.66,
  CAD: 0.73,
  CHF: 1.12,
  MXN: 0.055,
  BRL: 0.18,
  ARS: 0.001,
  CLP: 0.0011,
  COP: 0.00025,
  PEN: 0.27,
  INR: 0.012,
  THB: 0.028,
  VND: 0.00004,
  KRW: 0.00072,
  SGD: 0.74,
  NZD: 0.6,
};

/** Converts a `Money` amount into an approximate `Money` in USD (integer minor units). */
export function convertToApproxUsd(money: Money): Money {
  const rate = APPROX_USD_RATE[money.currency];
  const amountUsdMinor = Math.round(money.amountMinor * rate);
  return createMoney(amountUsdMinor, 'USD');
}
