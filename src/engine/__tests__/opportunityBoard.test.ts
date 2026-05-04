import { describe, expect, it } from 'vitest';
import { createNewGame, executeBuy } from '../gameState';
import { buildOpportunityBoard } from '../opportunityBoard';
import type { GameState } from '../types';

function cloneState(state: GameState): GameState {
  return {
    ...state,
    currentDate: new Date(state.currentDate),
    portfolio: { ...state.portfolio },
    shortPositions: { ...state.shortPositions },
    limitOrders: state.limitOrders.map((order) => ({ ...order })),
    conditionalOrders: state.conditionalOrders?.map((order) => ({ ...order })),
    transactionHistory: state.transactionHistory.map((entry) => ({ ...entry, date: new Date(entry.date) })),
    netWorthHistory: state.netWorthHistory.map((entry) => ({ ...entry, date: new Date(entry.date) })),
    marketIndexHistory: state.marketIndexHistory.map((entry) => ({ ...entry })),
    riskHistory: state.riskHistory.map((entry) => ({ ...entry, warnings: [...entry.warnings] })),
    catalystCalendar: state.catalystCalendar.map((entry) => ({ ...entry, scheduledDate: new Date(entry.scheduledDate) })),
    watchlist: [...state.watchlist],
  };
}

describe('opportunity board', () => {
  it('gives brand-new players a single clear first move', () => {
    const state = createNewGame('Opportunity Tester', 'normal');

    const board = buildOpportunityBoard(state);

    expect(board[0].id).toBe('first-trade');
    expect(board[0].title).toContain('first');
    expect(board[0].action).toEqual({ label: 'Open Market', screen: 'stock-market' });
  });

  it('prioritizes risk reduction over ordinary discovery cards', () => {
    const state = cloneState(createNewGame('Risk Tester', 'normal'));
    const stockId = state.stocks[0].id;
    state.cash = 100_000;
    state.shortPositions = {
      [stockId]: { stockId, shares: 600, entryPrice: 100, marginUsed: 35_000 },
    };
    state.marginUsed = 35_000;

    const board = buildOpportunityBoard(state);

    expect(board[0].id).toBe('risk-reset');
    expect(board[0].tone).toBe('danger');
    expect(board[0].action?.screen).toBe('portfolio');
  });

  it('surfaces the active mission with progress and a low-friction route', () => {
    const state = cloneState(createNewGame('Mission Tester', 'normal'));
    state.activeMission = {
      id: 'mission_diversify_test',
      title: 'Diversify Across Sectors',
      description: 'Hold exposure to at least 3 sectors.',
      type: 'diversification',
      startTurn: 1,
      endTurn: 6,
      rewardCash: 750,
      status: 'active',
      progress: 1,
      target: 3,
    };

    const board = buildOpportunityBoard(state);
    const missionCard = board.find((card) => card.id === 'mission-focus');

    expect(missionCard?.progress?.value).toBe(33);
    expect(missionCard?.action?.screen).toBe('stock-market');
  });

  it('stays compact and avoids duplicate card ids', () => {
    const state = createNewGame('Compact Tester', 'normal');
    const buyResult = executeBuy(state, state.stocks[0].id, 1);
    expect(buyResult.ok).toBe(true);
    if (!buyResult.ok) return;

    const board = buildOpportunityBoard(buyResult.state, 3);
    const ids = new Set(board.map((card) => card.id));

    expect(board.length).toBeLessThanOrEqual(3);
    expect(ids.size).toBe(board.length);
  });
});
