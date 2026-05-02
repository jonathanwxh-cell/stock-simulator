import { describe, expect, it } from 'vitest';
import { unwrap } from './_helpers';
import { buildRebalancePreview } from '../rebalancing';
import { createNewGame, executeBuy, executeShort } from '../gameState';
import type { AllocationTarget, GameState } from '../types';

function withPrice(state: ReturnType<typeof createNewGame>, stockId: string, price: number): GameState {
  return {
    ...state,
    stocks: state.stocks.map((stock) =>
      stock.id === stockId ? { ...stock, currentPrice: price, basePrice: price } : stock,
    ),
  };
}

describe('rebalancing', () => {
  it('orders trades as sell, cover, buy, then short', () => {
    let state = createNewGame('Rebalance', 'normal');
    state = withPrice(state, 'aapl', 100);
    state = withPrice(state, 'tsla', 100);
    state = withPrice(state, 'msft', 100);
    state = withPrice(state, 'goog', 100);
    state = unwrap(state, (current) => executeBuy(current, 'aapl', 10));
    state = unwrap(state, (current) => executeShort(current, 'tsla', 5));

    const targets: AllocationTarget[] = [
      { id: 'aapl', weight: 0 },
      { id: 'tsla', weight: 0 },
      { id: 'msft', weight: 10 },
      { id: 'goog', weight: -10 },
      { id: 'cash', weight: 100 },
    ];

    const preview = buildRebalancePreview(state, 'stock', targets);

    expect(preview.trades.map((trade) => trade.type)).toEqual(['sell', 'cover', 'buy', 'short']);
  });

  it('rejects targets that do not include cash or sum to 100%', () => {
    const state = createNewGame('Rebalance', 'normal');

    const preview = buildRebalancePreview(state, 'stock', [
      { id: 'aapl', weight: 60 },
      { id: 'msft', weight: 30 },
    ]);

    expect(preview.trades).toHaveLength(0);
    expect(preview.warnings.some((warning) => warning.includes('cash'))).toBe(true);
    expect(preview.warnings.some((warning) => warning.includes('100%'))).toBe(true);
  });

  it('rejects a negative cash target', () => {
    const state = createNewGame('Rebalance', 'normal');

    const preview = buildRebalancePreview(state, 'stock', [
      { id: 'aapl', weight: 120 },
      { id: 'cash', weight: -20 },
    ]);

    expect(preview.trades).toHaveLength(0);
    expect(preview.warnings.some((warning) => warning.includes('negative'))).toBe(true);
  });

  it('adds a rounding warning when a target cannot buy a whole share', () => {
    let state = createNewGame('Rebalance', 'normal');
    state = withPrice(state, 'nvda', 20_000);

    const preview = buildRebalancePreview(state, 'stock', [
      { id: 'nvda', weight: 5 },
      { id: 'cash', weight: 95 },
    ]);

    expect(preview.warnings.some((warning) => warning.toLowerCase().includes('round'))).toBe(true);
  });

  it('picks the deterministic sector proxy by cap, volatility, then ticker', () => {
    const state = createNewGame('Rebalance', 'normal');
    const nextState: GameState = {
      ...state,
      stocks: state.stocks.map((stock, index) => {
        if (index === 0) return { ...stock, id: 'tech_alpha', ticker: 'TALP', sector: 'technology' as const, marketCap: 'mega' as const, volatility: 0.4, currentPrice: 100, basePrice: 100 };
        if (index === 1) return { ...stock, id: 'tech_beta', ticker: 'TBET', sector: 'technology' as const, marketCap: 'mega' as const, volatility: 0.2, currentPrice: 100, basePrice: 100 };
        if (index === 2) return { ...stock, id: 'tech_gamma', ticker: 'TGAM', sector: 'technology' as const, marketCap: 'large' as const, volatility: 0.1, currentPrice: 100, basePrice: 100 };
        return stock;
      }),
    };

    const preview = buildRebalancePreview(nextState, 'sector', [
      { id: 'technology', weight: 10 },
      { id: 'cash', weight: 90 },
    ]);

    expect(preview.trades[0]).toMatchObject({
      stockId: 'tech_beta',
      type: 'buy',
    });
  });
});
