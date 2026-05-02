import { describe, expect, it } from 'vitest';
import { generateAdvisorFeedback } from './advisorSystem';
import { getLatestTurnPerformance } from './turnPerformance';
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

function makeState(netWorth: number, marketChange: number): GameState {
  return {
    saveSlot: 'auto',
    playerName: 'Tester',
    difficulty: 'normal',
    currentTurn: 1,
    currentDate: new Date(2024, 1, 1),
    cash: netWorth,
    portfolio: {},
    shortPositions: {},
    limitOrders: [],
    conditionalOrders: [],
    marginUsed: 0,
    totalFeesPaid: 0,
    totalDividendsReceived: 0,
    transactionHistory: [],
    netWorthHistory: [
      { turn: 0, date: new Date(2024, 0, 1), netWorth: 100000, cash: 100000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
      { turn: 1, date: new Date(2024, 1, 1), netWorth, cash: netWorth, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
    ],
    marketIndexHistory: [
      { turn: 0, value: 1000, changePct: 0 },
      { turn: 1, value: 1000 * (1 + marketChange / 100), changePct: marketChange },
    ],
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
    updatedAt: new Date(2024, 1, 1),
  };
}

describe('turn performance', () => {
  it('uses the same positive alpha that advisor feedback uses', () => {
    const prevState = makeState(100000, 0);
    const nextState = makeState(103100, 1.8);
    const perf = getLatestTurnPerformance(nextState);
    const notes = generateAdvisorFeedback(prevState, nextState);

    expect(perf.playerMovePct).toBeCloseTo(3.1, 1);
    expect(perf.marketMovePct).toBeCloseTo(1.8, 1);
    expect(perf.turnAlphaPct).toBeCloseTo(1.3, 1);
    expect(notes.some(note => note.headline === 'Strong relative turn')).toBe(true);
    expect(notes.some(note => note.headline === 'Underperformed the market')).toBe(false);
  });

  it('warns when latest turn alpha is negative', () => {
    const prevState = makeState(100000, 0);
    const nextState = makeState(99000, 1.5);
    const perf = getLatestTurnPerformance(nextState);
    const notes = generateAdvisorFeedback(prevState, nextState);

    expect(perf.turnAlphaPct).toBeLessThan(-1);
    expect(notes.some(note => note.headline === 'Underperformed the market' && note.severity === 'warning')).toBe(true);
  });
});
