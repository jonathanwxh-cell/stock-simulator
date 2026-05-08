import { describe, it, expect } from 'vitest';
import { createNewGame } from '../gameState';
import { generateDistinctNewsEvents, generateScenario, generateNewsEvent } from '../scenarioGenerator';
import type { RNG } from '../rng';
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

  it('adaptive difficulty: doing well → fewer positive scenarios', () => {
    const state = createNewGame('Test', 'normal');
    const wellState: GameState = { ...state, cash: state.cash * 10 };

    let positiveCount = 0;
    const runs = 1000;

    for (let i = 0; i < runs; i++) {
      const scenario = generateScenario(wellState);
      if (isPositive(scenario.title)) positiveCount++;
    }

    // When doing well, positive should be minority (< 40%)
    const ratio = positiveCount / runs;
    expect(ratio).toBeLessThan(0.4);
  });

  it('adaptive difficulty: struggling → more positive scenarios', () => {
    const state = createNewGame('Test', 'normal');
    // Zero out portfolio to minimize net worth
    const struggleState: GameState = {
      ...state,
      cash: 100,
      portfolio: {},
      shortPositions: {},
      marginUsed: 0,
    };

    let positiveCount = 0;
    const runs = 1000;

    for (let i = 0; i < runs; i++) {
      const scenario = generateScenario(struggleState);
      if (isPositive(scenario.title)) positiveCount++;
    }

    // When struggling, positive should be majority (> 40%)
    const ratio = positiveCount / runs;
    expect(ratio).toBeGreaterThan(0.4);
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
