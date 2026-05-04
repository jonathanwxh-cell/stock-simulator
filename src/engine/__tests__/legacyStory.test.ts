import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { buildLegacyEnding, buildLegacyOffers, type LegacyRecord } from '../legacyStory';
import type { GameState } from '../types';

function completeRun(state: GameState, grade: NonNullable<GameState['finalGrade']>, netWorth: number): GameState {
  const date = new Date('2035-06-01');
  return {
    ...state,
    currentTurn: 100,
    currentDate: date,
    cash: netWorth,
    isGameOver: true,
    finalGrade: grade,
    finalRank: 'Legacy Tester',
    runId: 'legacy-test-run',
    netWorthHistory: [
      state.netWorthHistory[0],
      { turn: 100, date, netWorth, cash: netWorth, portfolioValue: 0, shortLiability: 0, marginUsed: state.marginUsed },
    ],
    marketIndexHistory: [
      { turn: 0, value: 1000, changePct: 0 },
      { turn: 100, value: 1120, changePct: 12 },
    ],
  };
}

describe('legacy story director', () => {
  it('classifies high-grade high-risk wins as reckless rocket endings', () => {
    const base = createNewGame('Risky Winner', 'normal', 'growth_hunter');
    const stockId = base.stocks[0].id;
    const state = completeRun({
      ...base,
      marginUsed: 22_000,
      portfolio: {
        [stockId]: { stockId, shares: 900, avgCost: base.stocks[0].currentPrice },
      },
    }, 'A', 140_000);

    const ending = buildLegacyEnding(state);

    expect(ending.id).toBe('reckless_rocket');
    expect(ending.tone).toBe('legend');
    expect(ending.tags).toContain('High Wire');
  });

  it('classifies failing margin-heavy runs as boardroom fire endings', () => {
    const base = createNewGame('Burned Fund', 'normal', 'balanced');
    const stockId = base.stocks[0].id;
    const state = completeRun({
      ...base,
      marginUsed: 35_000,
      shortPositions: {
        [stockId]: { stockId, shares: 500, entryPrice: base.stocks[0].currentPrice, marginUsed: 35_000 },
      },
    }, 'F', 7_500);

    const ending = buildLegacyEnding(state);

    expect(ending.id).toBe('boardroom_fire');
    expect(ending.tone).toBe('collapse');
    expect(ending.tags).toContain('Board Pressure');
  });

  it('generates three sequel offers and rotates away immediate repeats', () => {
    const state = completeRun(createNewGame('Repeat Guard', 'normal', 'macro_surfer'), 'B', 90_000);
    const ending = buildLegacyEnding(state);
    const firstOffers = buildLegacyOffers(state, ending);
    const legacy: LegacyRecord = {
      version: 1,
      fundId: 'fund_repeat_guard',
      endings: [ending],
      chosenPaths: [{ offerId: firstOffers[0].id, endingId: ending.id, chosenAt: '2035-06-01T00:00:00.000Z', seasonNumber: 1 }],
      seenEventIds: [],
    };

    const nextOffers = buildLegacyOffers(state, ending, legacy);

    expect(firstOffers).toHaveLength(3);
    expect(new Set(firstOffers.map((offer) => offer.id)).size).toBe(3);
    expect(nextOffers).toHaveLength(3);
    expect(nextOffers[0].id).not.toBe(firstOffers[0].id);
  });
});
