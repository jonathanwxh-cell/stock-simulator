import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { getPendingEarningsDecisions } from '../catalystSystem';
import type { CatalystEvent, GameState } from '../types';

function withCatalyst(state: GameState, overrides: Partial<CatalystEvent> & { stockId: string; scheduledTurn: number }): GameState {
  const catalyst: CatalystEvent = {
    id: `catalyst_test_${overrides.stockId}_${overrides.scheduledTurn}`,
    stockId: overrides.stockId,
    type: overrides.type ?? 'earnings',
    volatility: overrides.volatility ?? 'high',
    scheduledTurn: overrides.scheduledTurn,
    scheduledDate: overrides.scheduledDate ?? new Date(state.currentDate),
  };
  return { ...state, catalystCalendar: [...(state.catalystCalendar || []), catalyst] };
}

function withLongPosition(state: GameState, stockId: string, shares: number, avgCost = 100): GameState {
  return {
    ...state,
    portfolio: {
      ...state.portfolio,
      [stockId]: { stockId, shares, avgCost },
    },
  };
}

describe('getPendingEarningsDecisions (#36)', () => {
  it('returns empty when there are no catalysts', () => {
    const state = createNewGame('Tester', 'normal');
    expect(getPendingEarningsDecisions(state)).toEqual([]);
  });

  it('returns empty when no catalysts are scheduled for next turn', () => {
    let state = createNewGame('Tester', 'normal');
    state = withLongPosition(state, 'aapl', 5);
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 3 });
    expect(getPendingEarningsDecisions(state)).toEqual([]);
  });

  it('returns the pending decision when an earnings is scheduled next turn on a held position', () => {
    let state = createNewGame('Tester', 'normal');
    state = withLongPosition(state, 'aapl', 5);
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 1 });

    const decisions = getPendingEarningsDecisions(state);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].stock.id).toBe('aapl');
    expect(decisions[0].position.shares).toBe(5);
    expect(decisions[0].catalyst.type).toBe('earnings');
  });

  it('excludes catalysts on stocks the player does not hold', () => {
    let state = createNewGame('Tester', 'normal');
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 1 });
    expect(getPendingEarningsDecisions(state)).toEqual([]);
  });

  it('excludes non-earnings catalyst types', () => {
    let state = createNewGame('Tester', 'normal');
    state = withLongPosition(state, 'aapl', 5);
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 1, type: 'product_launch' });
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 1, type: 'analyst_day' });
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 1, type: 'guidance' });
    expect(getPendingEarningsDecisions(state)).toEqual([]);
  });

  it('excludes catalysts that have already resolved (scheduledTurn ≤ currentTurn)', () => {
    let state = createNewGame('Tester', 'normal');
    state = withLongPosition(state, 'aapl', 5);
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn });
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn - 1 });
    expect(getPendingEarningsDecisions(state)).toEqual([]);
  });

  it('excludes positions with zero or negative shares', () => {
    let state = createNewGame('Tester', 'normal');
    state = withLongPosition(state, 'aapl', 0);
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 1 });
    expect(getPendingEarningsDecisions(state)).toEqual([]);
  });

  it('returns multiple decisions when several earnings catalysts converge next turn', () => {
    let state = createNewGame('Tester', 'normal');
    state = withLongPosition(state, 'aapl', 5);
    state = withLongPosition(state, 'msft', 3);
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 1 });
    state = withCatalyst(state, { stockId: 'msft', scheduledTurn: state.currentTurn + 1 });

    const decisions = getPendingEarningsDecisions(state);
    expect(decisions).toHaveLength(2);
    expect(new Set(decisions.map((d) => d.stock.id))).toEqual(new Set(['aapl', 'msft']));
  });

  it('handles missing catalystCalendar gracefully', () => {
    const state = createNewGame('Tester', 'normal');
    const stripped: GameState = { ...state, catalystCalendar: undefined as never };
    expect(getPendingEarningsDecisions(stripped)).toEqual([]);
  });

  it('returns the actual stock object from state.stocks (not a stale reference)', () => {
    let state = createNewGame('Tester', 'normal');
    state = withLongPosition(state, 'aapl', 5);
    state = withCatalyst(state, { stockId: 'aapl', scheduledTurn: state.currentTurn + 1 });

    const expectedStock = state.stocks.find((s) => s.id === 'aapl');
    const [decision] = getPendingEarningsDecisions(state);
    expect(decision.stock).toBe(expectedStock);
  });
});
