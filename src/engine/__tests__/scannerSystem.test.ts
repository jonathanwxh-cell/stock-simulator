import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { buildResearchBrief, getScannerSignals } from '../scannerSystem';

describe('scannerSystem', () => {
  it('ranks stocks by income, value, momentum, and macro setup signals', () => {
    const state = createNewGame('Scanner', 'normal');
    const incomeStock = state.stocks.find((stock) => stock.traits.includes('income')) || state.stocks[0];
    const growthStock = state.stocks.find((stock) => stock.traits.includes('growth')) || state.stocks[0];

    state.macroEnvironment = {
      turn: 12,
      interestRate: 24,
      inflation: 28,
      growth: 78,
      creditStress: 16,
      oilPrice: 50,
      sentiment: 82,
      trends: {
        interestRate: 'falling',
        inflation: 'falling',
        growth: 'rising',
        creditStress: 'falling',
        oilPrice: 'stable',
        sentiment: 'rising',
      },
      narrative: 'Expansion and easier money favor risk appetite.',
    };
    incomeStock.currentPrice = incomeStock.basePrice * 0.82;
    incomeStock.priceHistory = [
      { turn: 11, price: incomeStock.basePrice },
      { turn: 12, price: incomeStock.currentPrice },
    ];
    growthStock.currentPrice = growthStock.basePrice * 1.09;
    growthStock.priceHistory = [
      { turn: 11, price: growthStock.basePrice },
      { turn: 12, price: growthStock.currentPrice },
    ];

    const signals = getScannerSignals(state, 100);

    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some((signal) => signal.category === 'income' && signal.stockId === incomeStock.id)).toBe(true);
    expect(signals.some((signal) => signal.category === 'macro_tailwind' && signal.stockId === growthStock.id)).toBe(true);
    expect(signals[0].score).toBeGreaterThanOrEqual(signals[signals.length - 1].score);
  });

  it('builds a stock research brief with thesis, macro fit, and risks', () => {
    const state = createNewGame('Research', 'normal');
    const stock = state.stocks.find((entry) => entry.id === 'aapl') || state.stocks[0];

    const brief = buildResearchBrief(state, stock.id);

    expect(brief?.ticker).toBe(stock.ticker);
    expect(brief?.traits.length).toBeGreaterThanOrEqual(2);
    expect(brief?.thesis.length).toBeGreaterThan(0);
    expect(brief?.macroFit.label.length).toBeGreaterThan(0);
    expect(brief?.risks.length).toBeGreaterThan(0);
  });
});
