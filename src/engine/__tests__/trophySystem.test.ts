import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame, executeBuy } from '../gameState';
import type { GameState } from '../types';
import {
  TROPHY_DEFINITIONS,
  createEmptyTrophyCase,
  evaluateTrophies,
  loadTrophyCase,
  saveTrophyCase,
  summarizeTrophyCollections,
} from '../trophySystem';

function installLocalStorageMock() {
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
}

function completedSeason(state: GameState, grade: NonNullable<GameState['finalGrade']> = 'S'): GameState {
  return {
    ...state,
    currentTurn: 100,
    isGameOver: true,
    finalGrade: grade,
    finalRank: 'Board Legend',
    netWorthHistory: [
      ...state.netWorthHistory,
      {
        turn: 100,
        date: new Date(2032, 0, 1),
        netWorth: 180_000,
        cash: 180_000,
        portfolioValue: 0,
        shortLiability: 0,
        marginUsed: 0,
      },
    ],
  };
}

describe('trophy system', () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
  });

  it('ships a broad starter trophy set with unique visual keys', () => {
    const ids = new Set(TROPHY_DEFINITIONS.map((trophy) => trophy.id));
    const artKeys = new Set(TROPHY_DEFINITIONS.map((trophy) => trophy.artKey));

    expect(TROPHY_DEFINITIONS.length).toBeGreaterThanOrEqual(32);
    expect(ids.size).toBe(TROPHY_DEFINITIONS.length);
    expect(artKeys.size).toBe(TROPHY_DEFINITIONS.length);
  });

  it('unlocks first-step trophies from normal buying play', () => {
    const state = createNewGame('Trophy Tester', 'normal');
    const buyResult = executeBuy(state, state.stocks[0].id, 1);
    expect(buyResult.ok).toBe(true);
    if (!buyResult.ok) return;

    const result = evaluateTrophies(buyResult.state, createEmptyTrophyCase(), new Date('2026-05-04T12:00:00Z'));

    expect(result.newUnlocks.map((unlock) => unlock.trophyId)).toEqual(
      expect.arrayContaining(['first_trade', 'first_buy']),
    );
    expect(result.trophyCase.unlocked.first_buy?.unlockedTurn).toBe(0);
  });

  it('does not duplicate already unlocked trophies', () => {
    const state = createNewGame('Trophy Tester', 'normal');
    const buyResult = executeBuy(state, state.stocks[0].id, 1);
    expect(buyResult.ok).toBe(true);
    if (!buyResult.ok) return;

    const first = evaluateTrophies(buyResult.state, createEmptyTrophyCase());
    const second = evaluateTrophies(buyResult.state, first.trophyCase);

    expect(first.newUnlocks.length).toBeGreaterThan(0);
    expect(second.newUnlocks).toHaveLength(0);
  });

  it('persists and restores trophy unlocks', () => {
    const state = createNewGame('Persistence Tester', 'normal');
    const result = evaluateTrophies(
      completedSeason(state),
      createEmptyTrophyCase(),
      new Date('2026-05-04T12:00:00Z'),
    );

    saveTrophyCase(result.trophyCase);
    const restored = loadTrophyCase();

    expect(restored.unlocked.s_rank_season?.trophyId).toBe('s_rank_season');
    expect(restored.unlocked.s_rank_season?.unlockedAt).toBe('2026-05-04T12:00:00.000Z');
  });

  it('summarizes collection progress for the Trophy Room', () => {
    const state = createNewGame('Summary Tester', 'normal');
    const result = evaluateTrophies(completedSeason(state), createEmptyTrophyCase());
    const summaries = summarizeTrophyCollections(result.trophyCase);

    expect(summaries.length).toBeGreaterThanOrEqual(5);
    expect(summaries.every((summary) => summary.total > 0)).toBe(true);
    expect(summaries.some((summary) => summary.unlocked > 0)).toBe(true);
  });
});
