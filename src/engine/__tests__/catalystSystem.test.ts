import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import type { RNG } from '../rng';
import { ensureUpcomingCatalysts, resolveDueCatalysts } from '../catalystSystem';

function makeDeterministicRng(): RNG {
  const values = [0.02, 0.33, 0.61, 0.14, 0.78, 0.47, 0.25, 0.89, 0.41, 0.56];
  let index = 0;
  const nextValue = () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };

  return {
    next() {
      return nextValue();
    },
    int(min: number, max: number) {
      return min + Math.floor(nextValue() * (max - min + 1));
    },
    range(min: number, max: number) {
      return min + nextValue() * (max - min);
    },
    pick<T>(arr: T[]) {
      return arr[Math.floor(nextValue() * arr.length)] ?? arr[0];
    },
    pickN<T>(arr: T[], n: number) {
      return arr.slice(0, n);
    },
  };
}

describe('catalystSystem', () => {
  it('ensures a rolling queue of unique future catalysts', () => {
    const state = createNewGame('Catalyst QA', 'normal');

    const catalysts = ensureUpcomingCatalysts(state, [], makeDeterministicRng(), 6);

    expect(catalysts).toHaveLength(6);
    expect(catalysts.every((event) => event.scheduledTurn > state.currentTurn)).toBe(true);
    expect(new Set(catalysts.map((event) => `${event.stockId}:${event.scheduledTurn}`)).size).toBe(catalysts.length);
  });

  it('resolves due catalysts into tagged news and removes them from the upcoming queue', () => {
    const state = createNewGame('Catalyst QA', 'normal');
    const stock = state.stocks.find((entry) => entry.sector === 'healthcare') || state.stocks[0];

    state.currentTurn = 3;
    state.currentDate = new Date(2024, 3, 1);
    state.catalystCalendar = [
      {
        id: 'due_1',
        stockId: stock.id,
        type: 'earnings',
        volatility: 'high',
        scheduledTurn: 3,
        scheduledDate: new Date(2024, 3, 1),
      },
      {
        id: 'future_1',
        stockId: state.stocks[1].id,
        type: 'guidance',
        volatility: 'medium',
        scheduledTurn: 5,
        scheduledDate: new Date(2024, 5, 1),
      },
    ];

    const resolution = resolveDueCatalysts(state, makeDeterministicRng());

    expect(resolution.resolvedEvents).toHaveLength(1);
    expect(resolution.resolvedEvents[0].source).toBe('catalyst');
    expect(resolution.resolvedEvents[0].turn).toBe(3);
    expect(resolution.resolvedEvents[0].affectedStocks).toContain(stock.id);
    expect(resolution.remainingCatalysts).toHaveLength(1);
    expect(resolution.remainingCatalysts[0].id).toBe('future_1');
  });

  it('tops the calendar back up after catalysts have been resolved', () => {
    const state = createNewGame('Catalyst QA', 'normal');
    state.currentTurn = 6;
    state.currentDate = new Date(2024, 6, 1);

    const existing = [
      {
        id: 'future_2',
        stockId: state.stocks[2].id,
        type: 'product_launch' as const,
        volatility: 'medium' as const,
        scheduledTurn: 8,
        scheduledDate: new Date(2024, 8, 1),
      },
    ];

    const catalysts = ensureUpcomingCatalysts(state, existing, makeDeterministicRng(), 5);

    expect(catalysts).toHaveLength(5);
    expect(catalysts.some((event) => event.id === 'future_2')).toBe(true);
  });
});
