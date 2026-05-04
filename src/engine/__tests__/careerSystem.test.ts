import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import {
  CAREER_ARCHETYPES,
  advanceCareerState,
  createCareerState,
  getCareerLeague,
} from '../careerSystem';
import type { GameState, NetWorthSnapshot } from '../types';

function withNetWorth(state: GameState, values: number[]): GameState {
  const snapshots: NetWorthSnapshot[] = values.map((netWorth, index) => ({
    turn: index,
    date: new Date(2024, index, 1),
    netWorth,
    cash: netWorth,
    portfolioValue: 0,
    shortLiability: 0,
    marginUsed: 0,
  }));

  return {
    ...state,
    currentTurn: values.length - 1,
    currentDate: new Date(2024, values.length - 1, 1),
    cash: values[values.length - 1],
    netWorthHistory: snapshots,
    marketIndexHistory: values.map((_, index) => ({
      turn: index,
      value: 1000 + index * 8,
      changePct: index === 0 ? 0 : 0.8,
    })),
  };
}

describe('fund career system', () => {
  it('defines low-friction fund archetypes for new runs', () => {
    expect(Object.keys(CAREER_ARCHETYPES)).toEqual([
      'balanced',
      'growth_hunter',
      'dividend_baron',
      'macro_surfer',
      'contrarian',
      'short_shark',
    ]);

    const career = createCareerState('growth_hunter', 100_000);

    expect(career.style).toBe('growth_hunter');
    expect(career.archetypeLabel).toBe('Growth Hunter');
    expect(career.rivalFunds).toHaveLength(5);
    expect(career.nextBoardReviewTurn).toBe(3);
    expect(career.boardReviews).toHaveLength(0);
  });

  it('stores the selected archetype on new game state', () => {
    const state = createNewGame('Codex Fund', 'normal', 'contrarian');

    expect(state.career.style).toBe('contrarian');
    expect(state.career.archetypeLabel).toBe('Contrarian');
    expect(state.career.rivalFunds[0].netWorth).toBeGreaterThan(0);
  });

  it('updates rival funds deterministically as turns advance', () => {
    const start = createNewGame('League Tester', 'normal', 'macro_surfer');
    const turnOne = withNetWorth(start, [100_000, 104_000]);

    const career = advanceCareerState(start, turnOne);

    expect(career.rivalFunds.some((rival, index) => rival.netWorth !== start.career.rivalFunds[index].netWorth)).toBe(true);
    expect(career.rivalFunds.every((rival) => Number.isFinite(rival.returnPct))).toBe(true);
    expect(career.boardReviews).toHaveLength(0);
  });

  it('creates a board review and fresh objective every quarter without duplicates', () => {
    const start = createNewGame('Board Tester', 'normal', 'dividend_baron');
    const quarter = withNetWorth(start, [100_000, 101_000, 103_000, 107_000]);

    const career = advanceCareerState(start, quarter);
    const repeated = advanceCareerState({ ...quarter, career }, { ...quarter, career });

    expect(career.boardReviews).toHaveLength(1);
    expect(career.boardReviews[0].turn).toBe(3);
    expect(career.boardReviews[0].headline.length).toBeGreaterThan(0);
    expect(career.currentObjective).not.toBeNull();
    expect(career.nextBoardReviewTurn).toBe(6);
    expect(repeated.boardReviews).toHaveLength(1);
  });

  it('builds a league table that includes the player fund', () => {
    const state = withNetWorth(createNewGame('Top Fund', 'normal', 'short_shark'), [100_000, 120_000]);
    const career = advanceCareerState(state, state);
    const league = getCareerLeague({ ...state, career });

    expect(league[0].name).toBe('Top Fund');
    expect(league.some((entry) => entry.isPlayer && entry.style === 'short_shark')).toBe(true);
  });
});
