import { describe, it, expect } from 'vitest';
import { SeededRNG, MathRandomRNG } from '../rng';
import { createNewGame } from '../gameState';
import { simulateTurn } from '../marketSimulator';

describe('SeededRNG', () => {
  it('same seed produces identical sequence', () => {
    const a = new SeededRNG(12345);
    const b = new SeededRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = new SeededRNG(1);
    const b = new SeededRNG(2);
    const results = Array.from({ length: 10 }, () => a.next() === b.next());
    expect(results.some(same => !same)).toBe(true);
  });

  it('int() is inclusive on both ends', () => {
    const rng = new SeededRNG(42);
    const values = new Set<number>();
    for (let i = 0; i < 500; i++) {
      values.add(rng.int(1, 5));
    }
    expect(values.has(1)).toBe(true);
    expect(values.has(5)).toBe(true);
    expect(values.has(0)).toBe(false);
    expect(values.has(6)).toBe(false);
  });

  it('pick() returns elements from the array', () => {
    const rng = new SeededRNG(99);
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('pickN() returns n distinct elements', () => {
    const rng = new SeededRNG(77);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const picked = rng.pickN(arr, 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    for (const v of picked) {
      expect(arr).toContain(v);
    }
  });

  it('getSeed() and getCallCount() work', () => {
    const rng = new SeededRNG(42);
    expect(rng.getSeed()).toBe(42);
    expect(rng.getCallCount()).toBe(0);
    rng.next();
    rng.next();
    rng.next();
    expect(rng.getCallCount()).toBe(3);
  });
});

describe('simulateTurn with seeded RNG', () => {
  it('same seed → identical state across two runs', () => {
    const base = createNewGame('ReproTest', 'normal');

    const run1 = simulateTurn(
      { ...structuredClone(base), stocks: structuredClone(base.stocks) },
      new SeededRNG(54321),
    );
    const run2 = simulateTurn(
      { ...structuredClone(base), stocks: structuredClone(base.stocks) },
      new SeededRNG(54321),
    );

    // Same price movements
    expect(run1.stocks.map(s => s.currentPrice)).toEqual(run2.stocks.map(s => s.currentPrice));
    // Same news count
    expect(run1.newsHistory.length).toEqual(run2.newsHistory.length);
    // Same scenario (or both null)
    expect(run1.currentScenario?.title ?? null).toEqual(run2.currentScenario?.title ?? null);
    // Same net worth
    expect(run1.netWorthHistory[0].netWorth).toEqual(run2.netWorthHistory[0].netWorth);
  });

  it('different seeds → different state', () => {
    const base = createNewGame('DiffTest', 'normal');

    const run1 = simulateTurn(
      { ...structuredClone(base), stocks: structuredClone(base.stocks) },
      new SeededRNG(111),
    );
    const run2 = simulateTurn(
      { ...structuredClone(base), stocks: structuredClone(base.stocks) },
      new SeededRNG(999),
    );

    // Prices should differ (astronomically unlikely to be identical)
    const prices1 = run1.stocks.map(s => s.currentPrice).join(',');
    const prices2 = run2.stocks.map(s => s.currentPrice).join(',');
    expect(prices1).not.toBe(prices2);
  });

  it('MathRandomRNG still works (production default)', () => {
    const base = createNewGame('ProdTest', 'normal');
    const result = simulateTurn(base, new MathRandomRNG());
    expect(result.currentTurn).toBe(1);
    expect(result.stocks.length).toBeGreaterThan(0);
  });
});
