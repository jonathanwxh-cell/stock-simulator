import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { buildGuidedMarketCoach, buildStockCoach } from '../marketCoach';
import type { GameState } from '../types';

function cloneState(state: GameState): GameState {
  return {
    ...state,
    currentDate: new Date(state.currentDate),
    netWorthHistory: state.netWorthHistory.map((entry) => ({ ...entry, date: new Date(entry.date) })),
    marketIndexHistory: state.marketIndexHistory.map((entry) => ({ ...entry })),
    catalystCalendar: state.catalystCalendar.map((entry) => ({ ...entry, scheduledDate: new Date(entry.scheduledDate) })),
    transactionHistory: state.transactionHistory.map((entry) => ({ ...entry, date: new Date(entry.date) })),
  };
}

describe('market coach', () => {
  it('gives new players a first move without asking for a journal', () => {
    const state = createNewGame('Coach Tester', 'normal');
    const coach = buildGuidedMarketCoach(state);

    expect(coach.hero.title).toBe('Make one clear move');
    expect(coach.hero.body).toContain('Buy Now');
    expect(coach.hero.action?.screen).toBe('stock-market');
    expect(coach.tips.map((tip) => tip.title)).toContain('Star a few tickers');
  });

  it('summarizes the latest turn against the market benchmark', () => {
    const state = cloneState(createNewGame('Coach Tester', 'normal'));
    state.currentTurn = 1;
    state.netWorthHistory = [
      { turn: 0, date: new Date('2026-01-01'), netWorth: 100000, cash: 100000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
      { turn: 1, date: new Date('2026-02-01'), netWorth: 103000, cash: 103000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
    ];
    state.marketIndexHistory = [
      { turn: 0, value: 1000, changePct: 0 },
      { turn: 1, value: 1010, changePct: 1 },
    ];

    const coach = buildGuidedMarketCoach(state);

    expect(coach.recap?.title).toBe('You beat the market last turn');
    expect(coach.recap?.body).toContain('+3.0%');
    expect(coach.recap?.body).toContain('market +1.0%');
  });

  it('prioritizes urgent risk over ordinary discovery tips', () => {
    const state = cloneState(createNewGame('Coach Tester', 'normal'));
    state.cash = 100000;
    state.shortPositions = {
      amd: { stockId: 'amd', shares: 400, entryPrice: 100, marginUsed: 20000 },
    };
    state.marginUsed = 20000;

    const coach = buildGuidedMarketCoach(state);

    expect(coach.hero.tone).toBe('danger');
    expect(coach.hero.title).toBe('Risk needs attention');
    expect(coach.hero.action?.screen).toBe('portfolio');
  });

  it('explains stock detail decisions with catalyst context', () => {
    const state = cloneState(createNewGame('Coach Tester', 'normal'));
    state.currentTurn = 4;
    state.catalystCalendar = [{
      id: 'cat_aapl',
      stockId: 'aapl',
      type: 'earnings',
      volatility: 'high',
      scheduledTurn: 5,
      scheduledDate: new Date('2026-06-01'),
    }];

    const stock = state.stocks.find((entry) => entry.id === 'aapl')!;
    const coach = buildStockCoach(state, 'aapl');

    expect(coach.title).toBe(`${stock.ticker} has earnings next turn`);
    expect(coach.body).toContain('Plan Ahead');
    expect(coach.callouts.map((callout) => callout.label)).toContain('Catalyst');
  });
});
