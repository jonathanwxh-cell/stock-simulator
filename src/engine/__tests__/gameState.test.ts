import { describe, expect, it } from 'vitest';
import { createNewGame, executeBuy, placeLimitOrder, simulateTurn } from '../index';
import { SeededRNG } from '../rng';

describe('game state trade invariants', () => {
  it('rejects fractional shares for immediate trades', () => {
    const state = createNewGame('Tester', 'normal');
    const result = executeBuy(state, 'aapl', 1.5);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_shares');
  });

  it('rejects limit orders for unknown stocks before charging fees', () => {
    const state = createNewGame('Tester', 'normal');
    const result = placeLimitOrder(state, 'missing-stock', 'buy', 1, 100);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('stock_not_found');
    expect(state.totalFeesPaid).toBe(0);
    expect(state.transactionHistory).toHaveLength(0);
  });

  it('tracks execution broker fees when limit orders fill', () => {
    const state = createNewGame('Tester', 'normal');
    const placed = placeLimitOrder(state, 'aapl', 'buy', 1, 10_000);

    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const feesAfterPlacement = placed.state.totalFeesPaid;
    const next = simulateTurn(placed.state, new SeededRNG(123));

    expect(next.limitOrders).toHaveLength(0);
    expect(next.portfolio.aapl?.shares).toBe(1);
    expect(next.totalFeesPaid).toBeGreaterThan(feesAfterPlacement);
    expect(next.transactionHistory.some(t => t.type === 'fee' && t.stockId === 'aapl')).toBe(true);
  });
});
