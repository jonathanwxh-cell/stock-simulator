import { describe, expect, it } from 'vitest';
import { deriveCompanyTraits, getTraitSummary } from '../companyTraits';
import { cloneInitialStocks } from '../stockData';

describe('companyTraits', () => {
  it('derives stable identities from sector, dividend, volatility, beta, and cap size', () => {
    const traits = deriveCompanyTraits({
      sector: 'technology',
      marketCap: 'mega',
      dividendYield: 0.001,
      volatility: 0.44,
      beta: 1.65,
      basePrice: 900,
    });

    expect(traits).toContain('growth');
    expect(traits).toContain('speculative');
    expect(traits.length).toBeGreaterThanOrEqual(2);
    expect(traits.length).toBeLessThanOrEqual(4);
  });

  it('marks dividend-heavy low-beta businesses as income and defensive', () => {
    const traits = deriveCompanyTraits({
      sector: 'telecom',
      marketCap: 'large',
      dividendYield: 0.055,
      volatility: 0.14,
      beta: 0.62,
      basePrice: 58,
    });

    expect(traits).toEqual(expect.arrayContaining(['income', 'defensive']));
    expect(traits).not.toContain('speculative');
  });

  it('enriches every cloned stock with readable trait metadata', () => {
    const stocks = cloneInitialStocks();
    const apple = stocks.find((stock) => stock.id === 'aapl');

    expect(stocks.every((stock) => stock.traits.length >= 2 && stock.traits.length <= 4)).toBe(true);
    expect(apple?.traits).toContain('growth');
    expect(getTraitSummary(['growth', 'income'])).toContain('Growth');
  });
});
