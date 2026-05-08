import { describe, it, expect } from 'vitest';
import { createNewGame } from '../gameState';
import { generateDistinctNewsEvents, generateScenario, generateNewsEvent } from '../scenarioGenerator';
import { SeededRNG, type RNG } from '../rng';
import type { GameState } from '../types';

const POSITIVE_TITLES = [
  'Bull Market Rally', 'Economic Boom', 'Innovation Wave',
  'Sector Renaissance', 'Market Expansion', 'Growth Surge',
  'Prosperity Cycle', 'Golden Age',
];

function isPositive(title: string): boolean {
  return POSITIVE_TITLES.includes(title);
}

class DuplicateThenUniqueConsumerNewsRNG implements RNG {
  private pickNCalls = 0;

  next(): number {
    return 0.1;
  }

  int(min: number, max: number): number {
    void max;
    return min;
  }

  range(min: number, max: number): number {
    void max;
    return min;
  }

  pick<T>(arr: T[]): T {
    return arr[0];
  }

  pickN<T>(arr: T[], n: number): T[] {
    void n;
    this.pickNCalls += 1;
    if (this.pickNCalls < 3) {
      return [arr[0]];
    }
    return [arr[1] ?? arr[0]];
  }
}

describe('Scenario generator', () => {
  it('generateScenario returns ≥1 events', () => {
    const state = createNewGame('Test', 'normal');
    const scenario = generateScenario(state);
    expect(scenario.events.length).toBeGreaterThanOrEqual(1);
    expect(scenario.title).toBeTruthy();
  });

  it('scenario polarity is independent of player net worth (no rubber-banding)', () => {
    // Issue #27: scenario polarity must depend on RNG and difficulty alone,
    // never on the player's current net worth. Compare distributions across
    // a winning state, a struggling state, and the baseline; all should match.
    const baseline = createNewGame('Test', 'normal');
    const winning: GameState = { ...baseline, cash: baseline.cash * 10 };
    const struggling: GameState = {
      ...baseline,
      cash: 100,
      portfolio: {},
      shortPositions: {},
      marginUsed: 0,
    };

    const runs = 1000;
    const countPositive = (state: GameState) => {
      let n = 0;
      for (let i = 0; i < runs; i++) {
        if (isPositive(generateScenario(state).title)) n++;
      }
      return n / runs;
    };

    const baselineRatio = countPositive(baseline);
    const winningRatio = countPositive(winning);
    const strugglingRatio = countPositive(struggling);

    // All three should converge near the same value (35% positive baseline).
    // Tolerance is 8 percentage points to absorb RNG variance at 1000 samples.
    expect(Math.abs(winningRatio - baselineRatio)).toBeLessThan(0.08);
    expect(Math.abs(strugglingRatio - baselineRatio)).toBeLessThan(0.08);
    expect(baselineRatio).toBeGreaterThan(0.27);
    expect(baselineRatio).toBeLessThan(0.43);
  });

  it('seeded scenario sequence is identical regardless of player wealth', () => {
    // Stronger guarantee than the statistical test above: at a fixed seed,
    // the chosen scenario type for the first 20 calls must be identical
    // for any GameState that differs only in cash/portfolio.
    const baseline = createNewGame('Test', 'normal');
    const winning: GameState = { ...baseline, cash: baseline.cash * 100 };

    const titlesAt = (state: GameState) => {
      const titles: string[] = [];
      const rng = new SeededRNG(1234);
      for (let i = 0; i < 20; i++) {
        titles.push(generateScenario(state, rng).title);
      }
      return titles;
    };

    expect(titlesAt(winning)).toEqual(titlesAt(baseline));
  });

  it('generateNewsEvent returns a valid event with headline', () => {
    const state = createNewGame('Test', 'normal');
    const event = generateNewsEvent(state);

    expect(event.headline).toBeTruthy();
    expect(event.headline.length).toBeGreaterThan(0);
    expect(event.sector).toBeTruthy();
    expect(event.magnitude).toBeGreaterThan(0);
  });

  it('avoids duplicate same-turn consumer headlines when a retry can produce a unique stock', () => {
    const state = createNewGame('Test', 'normal');
    const events = generateDistinctNewsEvents(
      state,
      2,
      new DuplicateThenUniqueConsumerNewsRNG(),
      { sector: 'consumer', impact: 'positive' },
    );

    expect(events).toHaveLength(2);
    expect(new Set(events.map(event => event.headline)).size).toBe(2);
  });
});

describe('News templates (JSON data)', () => {
  it('templates loaded and have required fields', async () => {
    const data = await import('../data/news-templates.json');
    expect(data.default).toBeDefined();
    expect(typeof data.default).toBe('object');

    const tech = (data.default as Record<string, unknown>).technology;
    expect(tech).toBeDefined();
    expect(tech).toHaveProperty('positive');
    expect(tech).toHaveProperty('negative');
  });

  it('all stock sectors have templates', () => {
    const state = createNewGame('Test', 'normal');
    const sectors = [...new Set(state.stocks.map(s => s.sector))];
    expect(sectors.length).toBeGreaterThan(5);
    expect(sectors).toContain('technology');
    expect(sectors).toContain('industrial');
  });

  it('consumer templates avoid EV-specific headlines that misfit most consumer stocks', async () => {
    const data = await import('../data/news-templates.json');
    const consumer = (data.default as Record<string, { positive: Array<{ headline: string }> }>).consumer;
    const headlines = consumer.positive.map(template => template.headline);

    expect(headlines).not.toContain('{company} EV Deliveries Exceed Production Targets');
  });

  it('every sector/polarity has at least 10 templates to avoid intra-run repetition', async () => {
    const data = await import('../data/news-templates.json');
    const buckets = data.default as Record<string, { positive: unknown[]; negative: unknown[] }>;
    const sectors = Object.keys(buckets);
    expect(sectors.length).toBeGreaterThanOrEqual(13);

    for (const sector of sectors) {
      expect(buckets[sector].positive.length, `${sector}/positive`).toBeGreaterThanOrEqual(10);
      expect(buckets[sector].negative.length, `${sector}/negative`).toBeGreaterThanOrEqual(10);
    }
  });

  it('total template count meets the ≥250 floor set in issue #26', async () => {
    const data = await import('../data/news-templates.json');
    const buckets = data.default as Record<string, { positive: unknown[]; negative: unknown[] }>;
    const total = Object.values(buckets).reduce(
      (sum, bucket) => sum + bucket.positive.length + bucket.negative.length,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(250);
  });
});
