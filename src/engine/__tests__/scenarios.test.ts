import { describe, it, expect } from 'vitest';
import { createNewGame } from '../gameState';
import { generateScenario, generateNewsEvent } from '../scenarioGenerator';
import type { GameState } from '../types';

const POSITIVE_TITLES = [
  'Bull Market Rally', 'Economic Boom', 'Innovation Wave',
  'Sector Renaissance', 'Market Expansion', 'Growth Surge',
  'Prosperity Cycle', 'Golden Age',
];

function isPositive(title: string): boolean {
  return POSITIVE_TITLES.includes(title);
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
    let wellState: GameState = { ...state, cash: state.cash * 10 };

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
    let struggleState: GameState = {
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
});
