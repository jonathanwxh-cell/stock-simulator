import { describe, expect, it } from 'vitest';
import { createNewGame, simulateTurn } from '../index';
import { SeededRNG } from '../rng';
import {
  advanceMacroEnvironment,
  createInitialMacroEnvironment,
  getMacroBackdrop,
  getMacroStockDrift,
} from '../macroSystem';
import type { MacroEnvironment, Stock } from '../types';

const trends = {
  interestRate: 'stable',
  inflation: 'stable',
  growth: 'stable',
  creditStress: 'stable',
  oilPrice: 'stable',
  sentiment: 'stable',
} as const;

function stockWithTraits(stock: Stock, traits: Stock['traits']): Stock {
  return { ...stock, traits };
}

describe('macroSystem', () => {
  it('creates and advances bounded macro conditions with trend labels', () => {
    const initial = createInitialMacroEnvironment();
    const next = advanceMacroEnvironment(initial, 1, new SeededRNG(42));

    for (const key of ['interestRate', 'inflation', 'growth', 'creditStress', 'oilPrice', 'sentiment'] as const) {
      expect(next[key]).toBeGreaterThanOrEqual(0);
      expect(next[key]).toBeLessThanOrEqual(100);
      expect(['falling', 'stable', 'rising']).toContain(next.trends[key]);
    }
    expect(next.turn).toBe(1);
    expect(getMacroBackdrop(next).headline.length).toBeGreaterThan(0);
  });

  it('rewards growth traits in easy-money expansion and penalizes them in tight inflationary markets', () => {
    const state = createNewGame('Macro', 'normal');
    const baseStock = state.stocks.find((stock) => stock.id === 'nvda') || state.stocks[0];
    const growthStock = stockWithTraits(baseStock, ['growth', 'speculative', 'momentum']);
    const boom: MacroEnvironment = {
      turn: 8,
      interestRate: 22,
      inflation: 25,
      growth: 78,
      creditStress: 20,
      oilPrice: 45,
      sentiment: 82,
      trends,
      narrative: 'Easy money and strong demand favor risk assets.',
    };
    const squeeze: MacroEnvironment = {
      ...boom,
      interestRate: 86,
      inflation: 78,
      growth: 32,
      creditStress: 70,
      sentiment: 24,
      narrative: 'Tight policy and slowing demand punish long-duration risk.',
    };

    expect(getMacroStockDrift(growthStock, boom)).toBeGreaterThan(0);
    expect(getMacroStockDrift(growthStock, squeeze)).toBeLessThan(0);
  });

  it('initializes and advances macro state once per simulated turn', () => {
    const state = createNewGame('Macro Run', 'normal');
    const next = simulateTurn(state, new SeededRNG(7));

    expect(state.macroEnvironment.turn).toBe(0);
    expect(state.macroHistory).toHaveLength(1);
    expect(next.macroEnvironment.turn).toBe(1);
    expect(next.macroHistory).toHaveLength(2);
  });
});
