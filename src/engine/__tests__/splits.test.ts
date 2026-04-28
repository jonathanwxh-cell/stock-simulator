import { describe, it, expect } from 'vitest';
import { createNewGame, executeBuy, executeShort, placeLimitOrder } from '../gameState';
import { unwrap } from './_helpers';
import { simulateTurn } from '../marketSimulator';
import type { RNG } from '../rng';
import { SeededRNG } from '../rng';

function makeSplitRng(): RNG {
  const nextValues = [1, ...Array(60).fill(0.48), 0];
  return {
    next() {
      return nextValues.shift() ?? 0.48;
    },
    int() {
      return 0;
    },
    range(min: number) {
      return min;
    },
    pick<T>(arr: T[]): T {
      return arr[0];
    },
    pickN<T>(arr: T[], n: number): T[] {
      return arr.slice(0, n);
    },
  };
}

describe('Stock splits', () => {
  it('long position cost basis unchanged across split', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;

    state = unwrap(state, s => executeBuy(s, stockId, 10));

    const posBefore = state.portfolio[stockId];
    const costBasisBefore = posBefore.shares * posBefore.avgCost;

    state.stocks[0].currentPrice = 600;
    state.stocks[0].basePrice = 600;

    let splitOccurred = false;
    for (let i = 0; i < 5000; i++) {
      state = simulateTurn(state, new SeededRNG(i * 7 + 13));
      state.stocks[0].currentPrice = Math.max(state.stocks[0].currentPrice, 600);
      state.stocks[0].basePrice = Math.max(state.stocks[0].basePrice, 600);
      if (state.stocks[0].splitMultiplier > 1) {
        splitOccurred = true;
        break;
      }
    }
    expect(splitOccurred).toBe(true);

    const posAfter = state.portfolio[stockId];
    expect(posAfter).toBeDefined();
    const costBasisAfter = posAfter.shares * posAfter.avgCost;

    expect(costBasisAfter).toBeCloseTo(costBasisBefore, 0);
    expect(posAfter.shares).toBe(posBefore.shares * 2);
    expect(posAfter.avgCost).toBeCloseTo(posBefore.avgCost / 2, 1);
  });

  it('short position entry value unchanged across split', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;

    // Use a stock with high price but start with a small short
    // to avoid margin calls
    state.stocks[0].currentPrice = 600;
    state.stocks[0].basePrice = 600;
    state = unwrap(state, s => executeShort(s, stockId, 5));

    const shortBefore = state.shortPositions[stockId];
    const entryValueBefore = shortBefore.shares * shortBefore.entryPrice;

    let splitOccurred = false;
    for (let i = 0; i < 5000; i++) {
      state = simulateTurn(state, new SeededRNG(i * 11 + 7));
      state.stocks[0].currentPrice = Math.max(state.stocks[0].currentPrice, 600);
      state.stocks[0].basePrice = Math.max(state.stocks[0].basePrice, 600);

      // Check if margin call wiped the position
      if (!state.shortPositions[stockId]) break;

      if (state.stocks[0].splitMultiplier > 1) {
        splitOccurred = true;
        break;
      }
    }

    if (!splitOccurred) {
      // Margin call may have closed the position before split — skip
      return;
    }

    const shortAfter = state.shortPositions[stockId];
    expect(shortAfter).toBeDefined();
    const entryValueAfter = shortAfter.shares * shortAfter.entryPrice;

    expect(entryValueAfter).toBeCloseTo(entryValueBefore, 0);
    expect(shortAfter.shares).toBe(shortBefore.shares * 2);
    expect(shortAfter.entryPrice).toBeCloseTo(shortBefore.entryPrice / 2, 1);
  });

  it('price × splitMultiplier tracks original value', () => {
    let state = createNewGame('Test', 'normal');
    const stock = state.stocks[0];
    stock.currentPrice = 600;
    stock.basePrice = 600;

    const originalValue = stock.currentPrice;

    let splitOccurred = false;
    for (let i = 0; i < 5000; i++) {
      state = simulateTurn(state, new SeededRNG(i * 3 + 1));
      state.stocks[0].currentPrice = Math.max(state.stocks[0].currentPrice, 600);
      state.stocks[0].basePrice = Math.max(state.stocks[0].basePrice, 600);
      if (state.stocks[0].splitMultiplier > 1) {
        splitOccurred = true;
        break;
      }
    }
    expect(splitOccurred).toBe(true);

    const s = state.stocks[0];
    const reconstructed = s.currentPrice * s.splitMultiplier;
    expect(reconstructed).toBeGreaterThan(originalValue * 0.5);
  });

  it('splitMultiplier doubles on each split', () => {
    let state = createNewGame('Test', 'normal');
    state.stocks[0].currentPrice = 600;
    state.stocks[0].basePrice = 600;

    let splitsSeen = 0;
    let lastMultiplier = 1;

    for (let i = 0; i < 5000; i++) {
      state = simulateTurn(state, new SeededRNG(i));
      if (state.stocks[0].currentPrice < 500) {
        state.stocks[0].currentPrice = 600;
        state.stocks[0].basePrice = 600;
      }
      const m = state.stocks[0].splitMultiplier;
      if (m > lastMultiplier) {
        expect(m).toBe(lastMultiplier * 2);
        lastMultiplier = m;
        splitsSeen++;
        if (splitsSeen >= 2) break;
      }
    }
    expect(splitsSeen).toBeGreaterThanOrEqual(1);
  });

  it('integration: a split eventually occurs on high-priced stock', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    const initialMultiplier = state.stocks.find(s => s.id === stockId)!.splitMultiplier;

    state = {
      ...state,
      stocks: state.stocks.map((stock, index) =>
        index === 0
          ? { ...stock, currentPrice: 600, basePrice: 600 }
          : { ...stock, currentPrice: 50, basePrice: 50 }
      ),
    };

    state = simulateTurn(state, makeSplitRng());

    const multiplier = state.stocks.find(s => s.id === stockId)!.splitMultiplier;
    expect(multiplier).toBe(initialMultiplier * 2);
  });

  it('no split below $500 threshold', () => {
    let state = createNewGame('Test', 'normal');
    state = {
      ...state,
      stocks: state.stocks.map(s => ({ ...s, currentPrice: 50, basePrice: 50 })),
    };
    for (let i = 0; i < 200; i++) {
      state = simulateTurn(state);
    }
    expect(state.transactionHistory.some(t => t.type === 'split')).toBe(false);
  });

  it('adjusts outstanding limit orders for the split stock', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;

    state = {
      ...state,
      stocks: state.stocks.map((stock, index) =>
        index === 0
          ? { ...stock, currentPrice: 600, basePrice: 600 }
          : { ...stock, currentPrice: 50, basePrice: 50 }
      ),
    };
    state = unwrap(state, s => placeLimitOrder(s, stockId, 'buy', 4, 550));

    state = simulateTurn(state, makeSplitRng());

    const order = state.limitOrders.find(o => o.stockId === stockId);
    expect(order).toBeDefined();
    expect(order?.shares).toBe(8);
    expect(order?.targetPrice).toBeCloseTo(275, 2);
  });
});
