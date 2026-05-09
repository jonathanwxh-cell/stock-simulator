import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { buildLossEpilogue } from '../legacyStory';
import { getCareerSeasonGoal } from '../careerSeasons';
import type { GameState, Transaction } from '../types';

// Build a state at an exact net-worth ratio against the season goal by zeroing
// portfolio/shorts/margin and setting cash directly. getNetWorth = cash when
// the other ledgers are empty.
function stateAtRatio(ratio: number, marginCalls = 0): GameState {
  const base = createNewGame('Tester', 'normal');
  const goal = getCareerSeasonGoal(base);
  const targetCash = Math.max(0, goal * ratio);
  const fakeMarginCalls: Transaction[] = Array.from({ length: marginCalls }, (_, i) => ({
    id: `mc_${i}`,
    date: new Date(base.currentDate),
    turn: i + 1,
    stockId: 'aapl',
    type: 'margin_call' as const,
    shares: 5,
    price: 100,
    total: 500,
    fee: 0,
    reason: `AAPL short force-liquidated at $100.00 — equity fell below 30% maintenance on a $500 liability`,
  }));
  return {
    ...base,
    cash: targetCash,
    portfolio: {},
    shortPositions: {},
    marginUsed: 0,
    transactionHistory: fakeMarginCalls,
  };
}

describe('buildLossEpilogue (#30)', () => {
  it('returns bankruptcy variant when net worth ≤ 0', () => {
    const state = stateAtRatio(0);
    const epilogue = buildLossEpilogue(state);
    expect(epilogue.variant).toBe('bankruptcy');
    expect(epilogue.headline).toBe('The Fund Goes Dark');
    expect(epilogue.body.toLowerCase()).toContain('zero');
  });

  it('mentions liquidation count in bankruptcy body when margin calls fired', () => {
    const state = stateAtRatio(0, 3);
    const epilogue = buildLossEpilogue(state);
    expect(epilogue.variant).toBe('bankruptcy');
    expect(epilogue.body).toContain('3 forced liquidations');
    expect(epilogue.marginCallCount).toBe(3);
  });

  it('returns missed_goal variant for 0 < ratio < 0.6', () => {
    const epilogue = buildLossEpilogue(stateAtRatio(0.5));
    expect(epilogue.variant).toBe('missed_goal');
    expect(epilogue.headline).toBe('Out of Turns, Well Short');
    expect(epilogue.body).toContain('50%');
  });

  it('returns missed_goal at the 0.6 boundary minus epsilon', () => {
    const epilogue = buildLossEpilogue(stateAtRatio(0.59));
    expect(epilogue.variant).toBe('missed_goal');
  });

  it('returns barely_missed variant at the 0.6 floor exactly', () => {
    const epilogue = buildLossEpilogue(stateAtRatio(0.6));
    expect(epilogue.variant).toBe('barely_missed');
    expect(epilogue.headline).toBe('The Wall You Almost Scaled');
  });

  it('returns barely_missed for 0.6 ≤ ratio < 1.0', () => {
    const epilogue = buildLossEpilogue(stateAtRatio(0.95));
    expect(epilogue.variant).toBe('barely_missed');
    expect(epilogue.body).toContain('5%');
  });

  it('reports gap-to-goal in dollars for barely_missed variant', () => {
    const state = stateAtRatio(0.8);
    const goal = getCareerSeasonGoal(state);
    const expectedGap = Math.round(goal * 0.2);
    const epilogue = buildLossEpilogue(state);
    expect(epilogue.body).toContain(expectedGap.toLocaleString());
  });

  it('exposes goalRatio and marginCallCount on the result', () => {
    const epilogue = buildLossEpilogue(stateAtRatio(0.7, 2));
    expect(epilogue.goalRatio).toBeCloseTo(0.7, 2);
    expect(epilogue.marginCallCount).toBe(2);
  });

  it('all variants include both body and closer copy', () => {
    for (const ratio of [0, 0.4, 0.8]) {
      const epilogue = buildLossEpilogue(stateAtRatio(ratio));
      expect(epilogue.body.length).toBeGreaterThan(50);
      expect(epilogue.closer.length).toBeGreaterThan(50);
    }
  });
});
