import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { buildPostTurnDigest } from '../postTurnDigest';

describe('post-turn digest', () => {
  it('summarizes performance in plain language after a turn', () => {
    const state = createNewGame('Digest Tester', 'normal');
    state.currentTurn = 1;
    state.netWorthHistory = [
      { turn: 0, date: new Date('2026-01-01'), netWorth: 25_000, cash: 25_000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
      { turn: 1, date: new Date('2026-02-01'), netWorth: 26_000, cash: 26_000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
    ];
    state.marketIndexHistory = [
      { turn: 0, value: 1000, changePct: 0 },
      { turn: 1, value: 1010, changePct: 1 },
    ];

    const digest = buildPostTurnDigest(state);

    expect(digest.headline).toContain('beat');
    expect(digest.stats.map((stat) => stat.label)).toEqual(['You', 'Market', 'Alpha']);
    expect(digest.nextAction.screen).toBe('game');
  });

  it('points players toward portfolio repair when risk is elevated', () => {
    const state = createNewGame('Digest Risk Tester', 'normal');
    const stockId = state.stocks[0].id;
    state.currentTurn = 1;
    state.cash = 100;
    state.portfolio = {
      [stockId]: { stockId, shares: 900, avgCost: state.stocks[0].currentPrice },
    };
    state.shortPositions = {
      [state.stocks[1].id]: { stockId: state.stocks[1].id, shares: 300, entryPrice: state.stocks[1].currentPrice, marginUsed: 20_000 },
    };
    state.marginUsed = 20_000;

    const digest = buildPostTurnDigest(state);

    expect(['warning', 'danger']).toContain(digest.tone);
    expect(digest.nextAction.screen).toBe('portfolio');
    expect(digest.notes.length).toBeGreaterThan(0);
  });

  it('keeps completed runs headed to results even when risk is elevated', () => {
    const state = createNewGame('Digest Finish Tester', 'normal');
    const stockId = state.stocks[0].id;
    state.currentTurn = 120;
    state.isGameOver = true;
    state.cash = 100;
    state.portfolio = {
      [stockId]: { stockId, shares: 900, avgCost: state.stocks[0].currentPrice },
    };
    state.marginUsed = 30_000;

    const digest = buildPostTurnDigest(state);

    expect(digest.nextAction).toEqual({ label: 'View Results', screen: 'game-over' });
  });
});
