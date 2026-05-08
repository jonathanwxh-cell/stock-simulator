import { describe, expect, it } from 'vitest';
import { createNewGame, executeBuy, executeShort, placeLimitOrder, simulateTurn, toggleWatchlistStock } from '../index';
import { calculateGrade } from '../gameState';
import { getTradeFeedback } from '../tradeFeedback';
import { SeededRNG } from '../rng';
import { unwrap } from './_helpers';

function withPrice(state: ReturnType<typeof createNewGame>, stockId: string, price: number) {
  return {
    ...state,
    stocks: state.stocks.map((stock) =>
      stock.id === stockId ? { ...stock, currentPrice: price } : stock,
    ),
  };
}

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

  it('nets buys against existing short exposure before opening long shares', () => {
    let state = withPrice(createNewGame('Tester', 'normal'), 'aapl', 100);
    state = unwrap(state, (current) => executeShort(current, 'aapl', 10));

    state = unwrap(state, (current) => executeBuy(current, 'aapl', 4));

    expect(state.shortPositions.aapl?.shares).toBe(6);
    expect(state.portfolio.aapl).toBeUndefined();

    state = unwrap(state, (current) => executeBuy(current, 'aapl', 8));

    expect(state.shortPositions.aapl).toBeUndefined();
    expect(state.portfolio.aapl?.shares).toBe(2);
  });

  it('nets Bet Down trades against owned shares before opening shorts', () => {
    let state = withPrice(createNewGame('Tester', 'normal'), 'aapl', 100);
    state = unwrap(state, (current) => executeBuy(current, 'aapl', 10));

    state = unwrap(state, (current) => executeShort(current, 'aapl', 4));

    expect(state.portfolio.aapl?.shares).toBe(6);
    expect(state.shortPositions.aapl).toBeUndefined();

    state = unwrap(state, (current) => executeShort(current, 'aapl', 8));

    expect(state.portfolio.aapl).toBeUndefined();
    expect(state.shortPositions.aapl?.shares).toBe(2);
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

describe('calculateGrade boundaries (#28)', () => {
  // Build a state whose net worth is exactly `ratio × seasonGoal`.
  // Normal difficulty: starting cash $25k, goal multiplier 5 → goal $125k.
  // We adjust `cash` directly since getNetWorth(state) = cash + portfolio_value - shorts.
  function stateAtRatio(ratio: number) {
    const state = createNewGame('Tester', 'normal');
    // Wipe portfolio and shorts so getNetWorth = cash exactly.
    return { ...state, cash: 125_000 * ratio, portfolio: {}, shortPositions: {} };
  }

  it('S grade requires ratio ≥ 2.0', () => {
    expect(calculateGrade(stateAtRatio(2.0))).toBe('S');
    expect(calculateGrade(stateAtRatio(1.99))).toBe('A');
  });

  it('A grade boundary is 1.3', () => {
    expect(calculateGrade(stateAtRatio(1.3))).toBe('A');
    expect(calculateGrade(stateAtRatio(1.29))).toBe('B');
  });

  it('B grade requires meeting the goal exactly', () => {
    expect(calculateGrade(stateAtRatio(1.0))).toBe('B');
    expect(calculateGrade(stateAtRatio(0.99))).toBe('C');
  });

  it('C grade boundary is 0.8', () => {
    expect(calculateGrade(stateAtRatio(0.8))).toBe('C');
    expect(calculateGrade(stateAtRatio(0.79))).toBe('D');
  });

  it('D grade boundary is 0.6, F below', () => {
    expect(calculateGrade(stateAtRatio(0.6))).toBe('D');
    expect(calculateGrade(stateAtRatio(0.59))).toBe('F');
    expect(calculateGrade(stateAtRatio(0.0))).toBe('F');
  });

  it('extremely strong runs still grade S, not above', () => {
    expect(calculateGrade(stateAtRatio(10))).toBe('S');
  });
});
