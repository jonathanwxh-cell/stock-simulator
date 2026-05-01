import { describe, expect, it } from 'vitest';
import { rollRegime } from './regimeSystem';
import type { RNG } from './rng';

class FixedIntRng implements RNG {
  private index = 0;
  constructor(private values: number[]) {}
  next(): number { return 0.5; }
  int(_min: number, _max: number): number { return this.values[this.index++] ?? 0; }
  range(min: number, _max: number): number { return min; }
  pick<T>(arr: T[]): T { return arr[0]; }
  pickN<T>(arr: T[], n: number): T[] { return arr.slice(0, n); }
}

describe('regime sector mappings', () => {
  it('maps Rate Hike Pressure to both technology and semiconductors headwinds', () => {
    const regime = rollRegime(1, new FixedIntRng([2, 6]));
    expect(regime.id).toBe('rate_hike');
    expect(regime.sectorEffects.technology).toBeLessThan(1);
    expect(regime.sectorEffects.semiconductors).toBeLessThan(1);
    expect(regime.sectorEffects.financials).toBeGreaterThan(1);
  });

  it('maps Credit Stress to explicit raw defensive and stressed sectors', () => {
    const regime = rollRegime(1, new FixedIntRng([5, 6]));
    expect(regime.id).toBe('credit_stress');
    expect(regime.sectorEffects.financials).toBeLessThan(1);
    expect(regime.sectorEffects.realestate).toBeLessThan(1);
    expect(regime.sectorEffects.consumer).toBeLessThan(1);
    expect(regime.sectorEffects.healthcare).toBeGreaterThan(1);
    expect(regime.sectorEffects.telecom).toBeGreaterThan(1);
  });
});
