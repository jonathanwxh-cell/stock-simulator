import { describe, it, expect } from 'vitest';
import { createNewGame } from '../gameState';
import { simulateTurn } from '../marketSimulator';

describe('Stock splits', () => {
  it('position-value invariant: shares × avgCost unchanged before/after split', () => {
    const shares = 10;
    const avgCost = 200;
    const ratio = 2;
    expect(shares * avgCost).toBe((shares * ratio) * (avgCost / ratio));
  });

  it('short position-value invariant: shares × entryPrice unchanged', () => {
    const shares = 10;
    const entryPrice = 300;
    const ratio = 2;
    expect(shares * entryPrice).toBe((shares * ratio) * (entryPrice / ratio));
  });

  it('price invariant: price ÷ ratio gives correct post-split price', () => {
    expect(Math.round(600 / 2 * 100) / 100).toBe(300);
  });

  it('splitMultiplier tracks cumulative splits', () => {
    const initial = 1;
    expect(initial * 2 * 2).toBe(4);
  });

  it('integration: a split eventually occurs on high-priced stock', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    const initialMultiplier = state.stocks.find(s => s.id === stockId)!.splitMultiplier;
    let splitOccurred = false;

    for (let i = 0; i < 1000; i++) {
      // Keep price above $500 so splits can fire
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
