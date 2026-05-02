import { describe, expect, it } from 'vitest';
import { calculateRisk } from './riskSystem';
import type { GameState, Stock } from './types';

const amd: Stock = {
  id: 'amd',
  ticker: 'AMD',
  name: 'Advanced Micro Devices',
  sector: 'semiconductors',
  description: 'Test stock',
  basePrice: 100,
  currentPrice: 100,
  priceHistory: [{ turn: 0, price: 100 }],
  volatility: 0.04,
  marketCap: 'mega',
  dividendYield: 0,
  beta: 1.2,
  splitMultiplier: 1,
};

function makeState(overrides: Partial<GameState> = {}): GameState {
  const state: GameState = {
    saveSlot: 'auto',
    playerName: 'Tester',
    difficulty: 'normal',
    currentTurn: 0,
    currentDate: new Date(2024, 0, 1),
    cash: 100000,
    portfolio: {},
    shortPositions: {},
    limitOrders: [],
    conditionalOrders: [],
    marginUsed: 0,
    totalFeesPaid: 0,
    totalDividendsReceived: 0,
    transactionHistory: [],
    netWorthHistory: [{ turn: 0, date: new Date(2024, 0, 1), netWorth: 100000, cash: 100000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 }],
    marketIndexHistory: [{ turn: 0, value: 1000, changePct: 0 }],
    currentRegime: null,
    riskHistory: [],
    activeMission: null,
    completedMissions: [],
    lastAdvisorFeedback: [],
    watchlist: [],
    catalystCalendar: [],
    stocks: [amd],
    newsHistory: [],
    currentScenario: null,
    isGameOver: false,
    finalRank: null,
    finalGrade: null,
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date(2024, 0, 1),
  };
  return { ...state, ...overrides };
}

describe('calculateRisk', () => {
  it('keeps cash-only portfolios low with no warnings', () => {
    const risk = calculateRisk(makeState());
    expect(risk.level).toBe('low');
    expect(risk.totalScore).toBeLessThanOrEqual(5);
    expect(risk.warnings).toHaveLength(0);
  });

  it('keeps a small starter position low', () => {
    const risk = calculateRisk(makeState({
      cash: 95000,
      portfolio: { amd: { stockId: 'amd', shares: 50, avgCost: 100 } },
    }));
    expect(risk.level).toBe('low');
    expect(risk.totalScore).toBeLessThanOrEqual(5);
    expect(risk.warnings).toHaveLength(0);
  });

  it('raises risk for a 40% concentrated long position', () => {
    const risk = calculateRisk(makeState({
      cash: 60000,
      portfolio: { amd: { stockId: 'amd', shares: 400, avgCost: 100 } },
    }));
    expect(risk.totalScore).toBeGreaterThanOrEqual(40);
    expect(risk.level).toBe('medium');
    expect(risk.warnings).toContain('Single-stock concentration is above 25% of net worth.');
  });

  it('escalates a 50% concentrated long position to high', () => {
    const risk = calculateRisk(makeState({
      cash: 50000,
      portfolio: { amd: { stockId: 'amd', shares: 500, avgCost: 100 } },
    }));
    expect(risk.totalScore).toBeGreaterThanOrEqual(70);
    expect(risk.level).toBe('high');
  });

  it('escalates a 70% concentrated long position to extreme', () => {
    const risk = calculateRisk(makeState({
      cash: 30000,
      portfolio: { amd: { stockId: 'amd', shares: 700, avgCost: 100 } },
    }));
    expect(risk.totalScore).toBeGreaterThanOrEqual(75);
    expect(risk.level).toBe('extreme');
  });

  it('warns on sector concentration when invested exposure is meaningful', () => {
    const risk = calculateRisk(makeState({
      cash: 70000,
      portfolio: { amd: { stockId: 'amd', shares: 300, avgCost: 100 } },
    }));
    expect(risk.totalScore).toBeGreaterThanOrEqual(30);
    expect(risk.warnings).toContain('One sector is more than 50% of invested exposure.');
  });

  it('raises risk for short exposure above 20% of net worth', () => {
    const risk = calculateRisk(makeState({
      cash: 100000,
      shortPositions: { amd: { stockId: 'amd', shares: 250, entryPrice: 100, marginUsed: 12500 } },
      marginUsed: 12500,
    }));
    expect(risk.totalScore).toBeGreaterThanOrEqual(55);
    expect(risk.level).toBe('high');
    expect(risk.warnings).toContain('Short exposure is above 20% of net worth.');
  });

  it('escalates short exposure above 50% of net worth to extreme', () => {
    const risk = calculateRisk(makeState({
      cash: 100000,
      shortPositions: { amd: { stockId: 'amd', shares: 400, entryPrice: 100, marginUsed: 20000 } },
      marginUsed: 20000,
    }));
    expect(risk.totalScore).toBeGreaterThanOrEqual(80);
    expect(risk.level).toBe('extreme');
  });

  it('raises risk for drawdowns above 10%', () => {
    const risk = calculateRisk(makeState({
      cash: 80000,
      netWorthHistory: [{ turn: 0, date: new Date(2024, 0, 1), netWorth: 100000, cash: 100000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 }],
    }));
    expect(risk.totalScore).toBeGreaterThanOrEqual(35);
    expect(risk.warnings).toContain('Drawdown exceeds 10%.');
  });
});
