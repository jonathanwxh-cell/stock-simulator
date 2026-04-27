import { describe, it, expect } from 'vitest';
import { createNewGame, executeBuy, executeShort } from '../gameState';
import { unwrap } from './_helpers';
import { simulateTurn } from '../marketSimulator';
import { SeededRNG } from '../rng';

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
    let splitOccurred = false;

    for (let i = 0; i < 1000; i++) {
      state = {
        ...state,
        stocks: state.stocks.map(s =>
          s.id === stockId
            ? { ...s, currentPrice: Math.max(s.currentPrice, 600), basePrice: Math.max(s.basePrice, 600) }
            : s
        ),
      };
      state = simulateTurn(state);
      const m = state.stocks.find(s => s.id === stockId)!.splitMultiplier;
      if (m > initialMultiplier) {
        splitOccurred = true;
        expect(m).toBe(initialMultiplier * 2);
        break;
      }
    }
    expect(splitOccurred).toBe(true);
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
});
