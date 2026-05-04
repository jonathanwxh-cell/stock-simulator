import { describe, expect, it } from 'vitest';
import { createNewGame, executeBuy, executeShort, placeLimitOrder, simulateTurn, toggleWatchlistStock } from '../index';
import { getTradeFeedback } from '../tradeFeedback';
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

  it('stores short positions separately from long holdings', () => {
    const state = createNewGame('Tester', 'normal');
    const result = executeShort(state, 'tsla', 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.portfolio.tsla).toBeUndefined();
    expect(result.state.shortPositions.tsla?.shares).toBe(1);
    expect(result.state.transactionHistory.filter(t => t.type === 'short')).toHaveLength(1);
  });

  it('uses beginner-facing copy for Bet Down trade feedback', () => {
    const state = createNewGame('Tester', 'normal');
    const feedback = getTradeFeedback(state, 'tsla', 1, 'short');

    expect(feedback).not.toBeNull();
    expect(feedback?.headline).toContain('Bet Down');
    expect(feedback?.details.map((detail) => detail.label)).toContain('Cash reserved');
    expect(feedback?.details.map((detail) => detail.label)).toContain('Bet Down exposure');
    expect(feedback?.positionLabel).toContain('Bet Down');
  });

  it('uses net-worth basis for first-buy sector exposure preview', () => {
    const state = createNewGame('Tester', 'normal');
    const feedback = getTradeFeedback(state, 'aapl', 1, 'buy');

    expect(feedback).not.toBeNull();
    expect(feedback?.sectorExposureBefore).toBe(0);
    expect(feedback?.sectorExposureAfter).toBeGreaterThan(0);
    expect(feedback?.sectorExposureAfter).toBeLessThan(1);
  });

  it('toggles watchlist membership without duplicates', () => {
    const state = createNewGame('Tester', 'normal');

    const added = toggleWatchlistStock(state, 'aapl');
    const removed = toggleWatchlistStock(added, 'aapl');

    expect(added.watchlist).toEqual(['aapl']);
    expect(toggleWatchlistStock(added, 'aapl').watchlist).toEqual([]);
    expect(removed.watchlist).toEqual([]);
  });
});
