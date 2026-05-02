import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { buildPerformanceSeries } from '../performanceSeries';

describe('performanceSeries', () => {
  it('normalizes the first visible row to 100 for both player and market', () => {
    const state = createNewGame('Chart', 'normal');
    state.netWorthHistory = [
      { turn: 0, date: new Date(2024, 0, 1), netWorth: 100000, cash: 100000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
      { turn: 1, date: new Date(2024, 1, 1), netWorth: 110000, cash: 95000, portfolioValue: 15000, shortLiability: 0, marginUsed: 0 },
      { turn: 2, date: new Date(2024, 2, 1), netWorth: 121000, cash: 90000, portfolioValue: 31000, shortLiability: 0, marginUsed: 0 },
    ];
    state.marketIndexHistory = [
      { turn: 0, value: 1000, changePct: 0 },
      { turn: 1, value: 1050, changePct: 5 },
      { turn: 2, value: 1102.5, changePct: 5 },
    ];

    const series = buildPerformanceSeries(state, 'all');

    expect(series).toHaveLength(3);
    expect(series[0]?.playerNormalized).toBe(100);
    expect(series[0]?.marketNormalized).toBe(100);
    expect(series[2]?.playerNormalized).toBeCloseTo(121, 2);
    expect(series[2]?.marketNormalized).toBeCloseTo(110.25, 2);
  });

  it('supports 12m, 24m, and all ranges', () => {
    const state = createNewGame('Chart', 'normal');
    state.netWorthHistory = Array.from({ length: 30 }, (_, index) => ({
      turn: index,
      date: new Date(2024, index, 1),
      netWorth: 100000 + (index * 1000),
      cash: 50000,
      portfolioValue: 50000 + (index * 1000),
      shortLiability: 0,
      marginUsed: 0,
    }));
    state.marketIndexHistory = Array.from({ length: 30 }, (_, index) => ({
      turn: index,
      value: 1000 + (index * 10),
      changePct: 1,
    }));

    expect(buildPerformanceSeries(state, '12m')).toHaveLength(12);
    expect(buildPerformanceSeries(state, '24m')).toHaveLength(24);
    expect(buildPerformanceSeries(state, 'all')).toHaveLength(30);
  });

  it('zips net-worth and benchmark histories by shared turn', () => {
    const state = createNewGame('Chart', 'normal');
    state.netWorthHistory = [
      { turn: 0, date: new Date(2024, 0, 1), netWorth: 100000, cash: 100000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
      { turn: 1, date: new Date(2024, 1, 1), netWorth: 101000, cash: 99000, portfolioValue: 2000, shortLiability: 0, marginUsed: 0 },
      { turn: 3, date: new Date(2024, 3, 1), netWorth: 103000, cash: 97000, portfolioValue: 6000, shortLiability: 0, marginUsed: 0 },
    ];
    state.marketIndexHistory = [
      { turn: 0, value: 1000, changePct: 0 },
      { turn: 2, value: 1010, changePct: 1 },
      { turn: 3, value: 1020, changePct: 1 },
    ];

    const series = buildPerformanceSeries(state, 'all');

    expect(series.map((point) => point.turn)).toEqual([0, 3]);
    expect(series[1]).toMatchObject({
      turn: 3,
      netWorth: 103000,
      marketIndex: 1020,
    });
  });
});
