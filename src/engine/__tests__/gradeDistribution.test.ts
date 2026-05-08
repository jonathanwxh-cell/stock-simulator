/**
 * Grade distribution sanity check (#28).
 *
 * Runs N deterministic games to completion at Normal difficulty and prints
 * the resulting grade histogram. Doubles as a calibration regression — if a
 * future change makes S-grade trivially achievable or D/F dominant, this
 * test surfaces it.
 *
 * Note: uses a "lazy" player that holds starting cash and never trades, so
 * grades are expected to concentrate in F/D bands (no portfolio growth).
 *
 * **Skipped by default** because each game runs ~100 simulateTurn calls,
 * which is too slow for the standard test loop. Run on demand with:
 *   npx vitest run src/engine/__tests__/gradeDistribution.test.ts
 * (remove the `.skip` below or use the GRADE_HISTOGRAM=1 env var).
 */
import { describe, expect, it } from 'vitest';
import { createNewGame, simulateTurn, calculateGrade } from '../index';
import { SeededRNG } from '../rng';
import type { GameState } from '../types';

type Grade = ReturnType<typeof calculateGrade>;

const RUN_HISTOGRAM = process.env.GRADE_HISTOGRAM === '1';

function playToCompletion(seed: number): Grade {
  let state: GameState = createNewGame(`Bot${seed}`, 'normal');
  const rng = new SeededRNG(seed);
  // Cap iterations defensively; simulateTurn sets isGameOver when the season
  // turn limit is reached so the loop usually exits before this cap.
  for (let i = 0; i < 150 && !state.isGameOver; i++) {
    state = simulateTurn(state, rng);
  }
  return calculateGrade({ ...state, isGameOver: true });
}

const maybeIt = RUN_HISTOGRAM ? it : it.skip;

describe('grade distribution (#28 sanity check)', () => {
  maybeIt('lazy-player distribution at Normal is concentrated in F/D bands', () => {
    const RUNS = 25;
    const histogram: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (let seed = 1; seed <= RUNS; seed++) {
      histogram[playToCompletion(seed)]++;
    }

    console.log('[grade histogram, lazy player, Normal, 25 seeds]');
    for (const grade of ['S', 'A', 'B', 'C', 'D', 'F'] as Grade[]) {
      console.log(`  ${grade}: ${histogram[grade]}`);
    }

    const goodRuns = histogram.S + histogram.A + histogram.B;
    expect(goodRuns).toBeLessThanOrEqual(Math.ceil(RUNS * 0.2));

    const total = Object.values(histogram).reduce((s, n) => s + n, 0);
    expect(total).toBe(RUNS);
  }, 60_000);
});
