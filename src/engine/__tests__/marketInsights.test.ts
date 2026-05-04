import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import {
  buildSeasonRecap,
  getMarketBreadthSummary,
  getWatchlistAlerts,
} from '../marketInsights';

describe('marketInsights', () => {
  it('derives watchlist alerts from catalysts, news, and sharp moves', () => {
    const state = createNewGame('Signals', 'normal');
    const watched = state.stocks[0];

    state.currentTurn = 1;
    state.watchlist = [watched.id];
    watched.priceHistory = [
      { turn: 0, price: 100 },
      { turn: 1, price: 108 },
    ];
    watched.currentPrice = 108;
    state.newsHistory = [
      {
        id: 'news_watch',
        turn: 1,
        date: new Date(2024, 1, 1),
        headline: `${watched.name} surprises investors`,
        description: 'A sharp upside surprise resets expectations.',
        sector: watched.sector,
        impact: 'positive',
        magnitude: 0.04,
        affectedStocks: [watched.id],
        source: 'catalyst',
        catalystType: 'earnings',
      },
    ];
    state.catalystCalendar = [
      {
        id: 'cat_next',
        stockId: watched.id,
        type: 'guidance',
        volatility: 'medium',
        scheduledTurn: 2,
        scheduledDate: new Date(2024, 2, 1),
      },
    ];

    const alerts = getWatchlistAlerts(state);

    expect(alerts.map((alert) => alert.reason)).toEqual(
      expect.arrayContaining(['price_move', 'news', 'catalyst'])
    );
  });

  it('summarizes market breadth and sector leadership from last-turn moves', () => {
    const state = createNewGame('Breadth', 'normal');

    state.currentTurn = 1;
    state.stocks = state.stocks.map((stock, index) => {
      const nextPrice = index < 4 ? 110 : index < 8 ? 90 : 100;
      return {
        ...stock,
        currentPrice: nextPrice,
        priceHistory: [
          { turn: 0, price: 100 },
          { turn: 1, price: nextPrice },
        ],
      };
    });

    const summary = getMarketBreadthSummary(state);

    expect(summary.advances).toBe(4);
    expect(summary.declines).toBe(4);
    expect(summary.unchanged).toBe(state.stocks.length - 8);
    expect(summary.bestSector?.avgChangePct).toBeGreaterThanOrEqual(summary.worstSector?.avgChangePct ?? 0);
  });

  it('builds a season recap with alpha, drawdown, and holding contributions', () => {
    const state = createNewGame('Recap', 'normal');
    const winner = state.stocks[0];
    const loser = state.stocks[1];

    winner.currentPrice = 130;
    loser.currentPrice = 80;

    state.portfolio = {
      [winner.id]: { stockId: winner.id, shares: 10, avgCost: 100 },
      [loser.id]: { stockId: loser.id, shares: 5, avgCost: 100 },
    };
    state.netWorthHistory = [
      { turn: 0, date: new Date(2024, 0, 1), netWorth: 25000, cash: 25000, portfolioValue: 0, shortLiability: 0, marginUsed: 0 },
      { turn: 1, date: new Date(2024, 1, 1), netWorth: 30000, cash: 24000, portfolioValue: 6000, shortLiability: 0, marginUsed: 0 },
      { turn: 2, date: new Date(2024, 2, 1), netWorth: 27500, cash: 23500, portfolioValue: 4000, shortLiability: 0, marginUsed: 0 },
    ];
    state.marketIndexHistory = [
      { turn: 0, value: 1000, changePct: 0 },
      { turn: 1, value: 1025, changePct: 2.5 },
      { turn: 2, value: 1050, changePct: 2.4 },
    ];
    state.transactionHistory = [
      { id: 'buy_1', date: new Date(2024, 0, 1), turn: 0, stockId: winner.id, type: 'buy', shares: 10, price: 100, total: 1000, fee: 2 },
      { id: 'buy_2', date: new Date(2024, 0, 1), turn: 0, stockId: loser.id, type: 'buy', shares: 5, price: 100, total: 500, fee: 2 },
      { id: 'div_1', date: new Date(2024, 1, 1), turn: 1, stockId: winner.id, type: 'dividend', shares: 10, price: 1, total: 10, fee: 0 },
    ];
    state.newsHistory = [
      {
        id: 'cat_news',
        turn: 1,
        date: new Date(2024, 1, 1),
        headline: `${winner.name} delivers a strong quarter`,
        description: 'The catalyst resolves favorably.',
        sector: winner.sector,
        impact: 'positive',
        magnitude: 0.04,
        affectedStocks: [winner.id],
        source: 'catalyst',
        catalystType: 'earnings',
      },
    ];
    state.watchlist = [winner.id];

    const recap = buildSeasonRecap(state);

    expect(recap.alphaPct).toBeCloseTo(5, 1);
    expect(recap.maxDrawdownPct).toBeCloseTo(8.3, 1);
    expect(recap.topWinner?.ticker).toBe(winner.ticker);
    expect(recap.biggestDrag?.ticker).toBe(loser.ticker);
    expect(recap.catalystEvents).toBe(1);
  });

  it('counts executed trades in the season recap without counting order placement records', () => {
    const state = createNewGame('Recap', 'normal');
    const stock = state.stocks[0];
    state.totalFeesPaid = 5;
    state.transactionHistory = [
      { id: 'fee_buy', date: new Date(2024, 0, 1), turn: 0, stockId: stock.id, type: 'fee', shares: 0, price: 0, total: 2, fee: 2 },
      { id: 'buy_1', date: new Date(2024, 0, 1), turn: 0, stockId: stock.id, type: 'buy', shares: 1, price: 100, total: 100, fee: 2 },
      { id: 'fee_limit_place', date: new Date(2024, 0, 1), turn: 0, stockId: stock.id, type: 'fee', shares: 0, price: 0, total: 1, fee: 1 },
      { id: 'txn_lo_placed', date: new Date(2024, 0, 1), turn: 0, stockId: stock.id, type: 'limit_sell', shares: 1, price: 105, total: 1, fee: 1 },
      { id: 'fee_limit_exec', date: new Date(2024, 1, 1), turn: 1, stockId: stock.id, type: 'fee', shares: 0, price: 0, total: 2, fee: 2 },
      { id: 'txn_lo_placed_exec', date: new Date(2024, 1, 1), turn: 1, stockId: stock.id, type: 'limit_sell', shares: 1, price: 106, total: 106, fee: 2 },
    ];

    const recap = buildSeasonRecap(state);

    expect(recap.totalTrades).toBe(2);
    expect(recap.totalFees).toBe(5);
  });

  it('does not label a profitable holding as the biggest drag', () => {
    const state = createNewGame('Recap', 'normal');
    const winner = state.stocks[0];

    winner.currentPrice = 130;
    state.portfolio = {
      [winner.id]: { stockId: winner.id, shares: 10, avgCost: 100 },
    };

    const recap = buildSeasonRecap(state);

    expect(recap.topWinner?.ticker).toBe(winner.ticker);
    expect(recap.biggestDrag).toBeNull();
  });
});
