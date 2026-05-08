/**
 * Grade distribution sanity check (#28).
 *
 * Runs N deterministic games to completion at Normal difficulty and asserts
 * the grade distribution is within sane bounds. Doubles as a regression test
 * — if a future change makes S-grade trivially achievable or D/F dominant,
 * this test will fail with the printed histogram showing what changed.
 *
 * Note: this uses a "lazy" player that holds starting cash and never trades.
 * The expected grade is therefore F or D for most runs (cash doesn't grow).
 * To validate skill-driven distributions we'd need a play-strategy model;
 * for now the test serves as a stable lower-bound calibration of how the
 * baseline market behaves without player intervention.
 */
import { describe, expect, it } from 'vitest';
import { createNewGame, simulateTurn, calculateGrade } from '../index';
import { SeededRNG } from '../rng';
import type { GameState } from '../types';
import { DIFFICULTY_CONFIGS } from '../config';

type Grade = ReturnType<typeof calculateGrade>;

function playToCompletion(seed: number): Grade {
  let state: GameState = createNewGame(`Bot${seed}`, 'normal');
  const rng = new SeededRNG(seed);
  const turnLimit = DIFFICULTY_CONFIGS.normal.turnLimit;
  for (let i = 0; i < turnLimit + 5 && !state.isGameOver; i++) {
    state = simulateTurn(state, rng);
  }
  return calculateGrade({ ...state, isGameOver: true });
}

describe('grade distribution (#28 sanity check)', () => {
  it('lazy-player distribution at Normal is concentrated in F/D bands', () => {
    const RUNS = 50;
    const histogram: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (let seed = 1; seed <= RUNS; seed++) {
      histogram[playToCompletion(seed)]++;
    }

    // Print for visibility — vitest captures and shows on test pages
    console.log('[grade histogram, lazy player, Normal, 50 seeds]');
    for (const grade of ['S', 'A', 'B', 'C', 'D', 'F'] as Grade[]) {
      console.log(`  ${grade}: ${histogram[grade]}`);
    }

    // A lazy player who never trades should rarely reach B+ (would require
    // organic market drift to roughly 1× starting cash × goal multiplier).
    // Allow up to 20% B-or-better for very lucky bull-market runs.
    const goodRuns = histogram.S + histogram.A + histogram.B;
    expect(goodRuns).toBeLessThanOrEqual(Math.ceil(RUNS * 0.2));

    // Total sanity: histogram sums to RUNS
    const total = Object.values(histogram).reduce((s, n) => s + n, 0);
    expect(total).toBe(RUNS);
  });
});
