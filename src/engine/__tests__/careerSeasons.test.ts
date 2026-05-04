import { describe, expect, it } from 'vitest';
import {
  continueCareer,
  createNewGame,
  executeShort,
  getActiveSeasonTheme,
  getCareerSeasonGoal,
  getCareerSeasonTurn,
  getCareerSeasonTurnLimit,
  getCareerUnlocks,
  simulateTurn,
} from '../index';
import { SeededRNG } from '../rng';
import type { GameState } from '../types';

function withCompletedSeason(state: GameState, netWorth = 38_000): GameState {
  const turn = 100;
  const date = new Date(2032, 4, 1);

  return {
    ...state,
    currentTurn: turn,
    currentDate: date,
    cash: netWorth,
    portfolio: {
      [state.stocks[0].id]: {
        stockId: state.stocks[0].id,
        shares: 3,
        avgCost: state.stocks[0].currentPrice,
      },
    },
    watchlist: [state.stocks[0].id],
    netWorthHistory: [
      ...state.netWorthHistory,
      {
        turn,
        date,
        netWorth,
        cash: netWorth,
        portfolioValue: 0,
        shortLiability: 0,
        marginUsed: 0,
      },
    ],
    isGameOver: true,
    finalGrade: 'C',
    finalRank: 'Apprentice Trader',
    leaderboardEntryId: 'lb_finished_run',
  };
}

describe('career seasons', () => {
  it('starts new games with season metadata and the classic first target', () => {
    const state = createNewGame('Season Tester', 'normal', 'balanced');

    expect(state.career.seasonNumber).toBe(1);
    expect(state.career.seasonStartTurn).toBe(0);
    expect(state.career.seasonStartNetWorth).toBe(25_000);
    expect(state.career.activeSeasonThemeId).toBe('opening_bell');
    expect(getCareerSeasonTurn(state)).toBe(0);
    expect(getCareerSeasonGoal(state)).toBe(125_000);
    expect(getCareerSeasonTurnLimit(state)).toBe(100);
    expect(getActiveSeasonTheme(state).title).toBe('Opening Bell');
  });

  it('continues a completed season into a new playable season without wiping the fund', () => {
    const finished = withCompletedSeason(createNewGame('Career Tester', 'normal', 'growth_hunter'));
    const next = continueCareer(finished);

    expect(next.isGameOver).toBe(false);
    expect(next.finalGrade).toBeNull();
    expect(next.finalRank).toBeNull();
    expect(next.leaderboardEntryId).toBeNull();
    expect(next.runId).not.toBe(finished.runId);
    expect(next.career.seasonNumber).toBe(2);
    expect(next.career.seasonStartTurn).toBe(100);
    expect(next.career.seasonStartNetWorth).toBe(38_000);
    expect(next.career.seasons.some((season) => season.completedAtTurn === 100)).toBe(true);
    expect(next.portfolio[finished.stocks[0].id]?.shares).toBe(3);
    expect(next.watchlist).toEqual([finished.stocks[0].id]);
    expect(getCareerSeasonTurn(next)).toBe(0);
    expect(getCareerSeasonGoal(next)).toBeGreaterThan(38_000);
  });

  it('uses season-relative turn limits after continuing a career', () => {
    const continued = continueCareer(withCompletedSeason(createNewGame('Long Run', 'normal', 'balanced')));
    const nextTurn = simulateTurn(continued, new SeededRNG(44));

    expect(nextTurn.currentTurn).toBe(101);
    expect(getCareerSeasonTurn(nextTurn)).toBe(1);
    expect(nextTurn.isGameOver).toBe(false);
  });

  it('awards low-friction career unlocks after completed seasons', () => {
    const continued = continueCareer(withCompletedSeason(createNewGame('Unlock Fund', 'normal', 'macro_surfer')));
    const unlocks = getCareerUnlocks(continued);

    expect(unlocks.map((unlock) => unlock.id)).toContain('expanded_watchlist');
    expect(unlocks[0].title).toMatch(/Watchlist/);
  });

  it('supports challenge modes with immediate player-facing guardrails', () => {
    const state = createNewGame('Challenge Tester', 'normal', 'balanced', 'no_shorts');
    const result = executeShort(state, state.stocks[0].id, 1);

    expect(state.career.challengeMode).toBe('no_shorts');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('challenge_restricted');
  });

  it('starts bear market challenges with the credit crunch theme', () => {
    const state = createNewGame('Bear Tester', 'normal', 'contrarian', 'bear_market');

    expect(state.career.challengeMode).toBe('bear_market');
    expect(getActiveSeasonTheme(state).id).toBe('credit_crunch');
  });
});
