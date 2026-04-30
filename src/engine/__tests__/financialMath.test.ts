import { describe, expect, it } from 'vitest';
import { isPositiveCurrency, isPositiveWholeNumber, roundCurrency } from '../financialMath';

describe('financial math helpers', () => {
  it('rounds currency to cents without leaking floating point noise', () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
    expect(roundCurrency(10.005)).toBe(10.01);
  });

  it('accepts only positive whole share counts', () => {
    expect(isPositiveWholeNumber(1)).toBe(true);
    expect(isPositiveWholeNumber(0)).toBe(false);
    expect(isPositiveWholeNumber(1.5)).toBe(false);
    expect(isPositiveWholeNumber(Number.NaN)).toBe(false);
  });

  it('accepts only positive finite currency values', () => {
    expect(isPositiveCurrency(0.01)).toBe(true);
    expect(isPositiveCurrency(0)).toBe(false);
    expect(isPositiveCurrency(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
