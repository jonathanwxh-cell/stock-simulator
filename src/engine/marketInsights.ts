import { CATALYST_TYPE_LABELS } from './catalystSystem';
import { roundCurrency } from './financialMath';
import { getAlphaPct, getMarketReturnPct, getPlayerReturnPct } from './marketIndex';
import type {
  GameState,
  MarketBreadthSummary,
  SeasonRecap,
  SeasonRecapHolding,
  SectorPerformance,
  WatchlistAlert,
} from './types';

function getPreviousPrice(state: GameState, stockId: string): number | null {
  const stock = state.stocks.find((entry) => entry.id === stockId);
  if (!stock || stock.priceHistory.length < 2) return null;
  return stock.priceHistory[stock.priceHistory.length - 2]?.price ?? null;
}

export function getStockChangePct(state: GameState, stockId: string): number {
  const stock = state.stocks.find((entry) => entry.id === stockId);
  const previousPrice = getPreviousPrice(state, stockId);
  if (!stock || !previousPrice || previousPrice <= 0) return 0;
  return roundCurrency(((stock.currentPrice - previousPrice) / previousPrice) * 100);
}

export function getUpcomingCatalysts(state: GameState, limit: number = 6) {
  return [...(state.catalystCalendar || [])]
    .filter((event) => event.scheduledTurn > state.currentTurn)
    .sort((a, b) => a.scheduledTurn - b.scheduledTurn || a.stockId.localeCompare(b.stockId))
    .slice(0, limit);
}

export function getWatchlistAlerts(state: GameState, limit: number = 6): WatchlistAlert[] {
  const alerts: WatchlistAlert[] = [];
  const watchedSet = new Set(state.watchlist || []);
  if (!watchedSet.size) return alerts;

  for (const stockId of watchedSet) {
    const stock = state.stocks.find((entry) => entry.id === stockId);
    if (!stock) continue;

    const changePct = getStockChangePct(state, stockId);
    if (Math.abs(changePct) >= 5) {
      alerts.push({
        id: `alert_move_${stockId}_${state.currentTurn}`,
        stockId,
        turn: state.currentTurn,
        title: `${stock.ticker} moved ${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}% this turn`,
        description: `Price now sits at $${stock.currentPrice.toFixed(2)} after a sharp move.`,
        reason: 'price_move',
        tone: changePct >= 0 ? 'positive' : 'negative',
      });
    }

    const stockNews = state.newsHistory.filter(
      (event) => event.turn === state.currentTurn && event.affectedStocks.includes(stockId)
    );
    for (const event of stockNews.slice(0, 2)) {
      alerts.push({
        id: `alert_news_${event.id}`,
        stockId,
        turn: state.currentTurn,
        title: `${stock.ticker} is in the headlines`,
        description: event.headline,
        reason: 'news',
        tone: event.impact === 'positive' ? 'positive' : event.impact === 'negative' ? 'negative' : 'neutral',
      });
    }

    const nextCatalyst = (state.catalystCalendar || []).find(
      (event) => event.stockId === stockId && event.scheduledTurn === state.currentTurn + 1
    );
    if (nextCatalyst) {
      alerts.push({
        id: `alert_catalyst_${nextCatalyst.id}`,
        stockId,
        turn: state.currentTurn,
        title: `${stock.ticker} has ${CATALYST_TYPE_LABELS[nextCatalyst.type].toLowerCase()} next turn`,
        description: `Expect ${nextCatalyst.volatility} volatility when the event resolves.`,
        reason: 'catalyst',
        tone: 'neutral',
      });
    }
  }

  const priority: Record<WatchlistAlert['reason'], number> = {
    catalyst: 0,
    news: 1,
    price_move: 2,
  };

  return alerts
    .sort((a, b) => priority[a.reason] - priority[b.reason] || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function getSectorPerformance(state: GameState): SectorPerformance[] {
  const bySector = new Map<SectorPerformance['sector'], number[]>();

  for (const stock of state.stocks) {
    const previous = getPreviousPrice(state, stock.id);
    const changePct = previous && previous > 0
      ? ((stock.currentPrice - previous) / previous) * 100
      : 0;
    const current = bySector.get(stock.sector) || [];
    current.push(changePct);
    bySector.set(stock.sector, current);
  }

  return [...bySector.entries()].map(([sector, changes]) => ({
    sector,
    avgChangePct: roundCurrency(changes.reduce((sum, value) => sum + value, 0) / Math.max(1, changes.length)),
    advancers: changes.filter((value) => value > 0).length,
    decliners: changes.filter((value) => value < 0).length,
    unchanged: changes.filter((value) => value === 0).length,
  })).sort((a, b) => b.avgChangePct - a.avgChangePct);
}

export function getMarketBreadthSummary(state: GameState): MarketBreadthSummary {
  const changes = state.stocks.map((stock) => getStockChangePct(state, stock.id));
  const sectorPerformance = getSectorPerformance(state);

  return {
    advances: changes.filter((value) => value > 0).length,
    declines: changes.filter((value) => value < 0).length,
    unchanged: changes.filter((value) => value === 0).length,
    sectorPerformance,
    bestSector: sectorPerformance[0] || null,
    worstSector: sectorPerformance[sectorPerformance.length - 1] || null,
  };
}

function buildHoldingRecap(state: GameState): SeasonRecapHolding[] {
  const holdings: SeasonRecapHolding[] = [];

  for (const [stockId, position] of Object.entries(state.portfolio)) {
    const stock = state.stocks.find((entry) => entry.id === stockId);
    if (!stock || position.shares <= 0) continue;
    const pnl = roundCurrency((stock.currentPrice - position.avgCost) * position.shares);
    const pnlPct = position.avgCost > 0
      ? roundCurrency(((stock.currentPrice - position.avgCost) / position.avgCost) * 100)
      : 0;
    holdings.push({ stockId, ticker: stock.ticker, kind: 'long', pnl, pnlPct });
  }

  for (const [stockId, position] of Object.entries(state.shortPositions)) {
    const stock = state.stocks.find((entry) => entry.id === stockId);
    if (!stock || position.shares <= 0) continue;
    const pnl = roundCurrency((position.entryPrice - stock.currentPrice) * position.shares);
    const pnlPct = position.entryPrice > 0
      ? roundCurrency(((position.entryPrice - stock.currentPrice) / position.entryPrice) * 100)
      : 0;
    holdings.push({ stockId, ticker: stock.ticker, kind: 'short', pnl, pnlPct });
  }

  return holdings;
}

export function buildSeasonRecap(state: GameState): SeasonRecap {
  const snapshots = state.netWorthHistory || [];
  let bestTurn: SeasonRecap['bestTurn'] = null;
  let worstTurn: SeasonRecap['worstTurn'] = null;
  let peak = snapshots[0]?.netWorth ?? 0;
  let maxDrawdownPct = 0;

  for (let index = 1; index < snapshots.length; index++) {
    const previous = snapshots[index - 1];
    const current = snapshots[index];
    const changePct = previous.netWorth > 0
      ? roundCurrency(((current.netWorth - previous.netWorth) / previous.netWorth) * 100)
      : 0;

    const turnSummary = { turn: current.turn, changePct };
    if (!bestTurn || changePct > bestTurn.changePct) bestTurn = turnSummary;
    if (!worstTurn || changePct < worstTurn.changePct) worstTurn = turnSummary;

    peak = Math.max(peak, current.netWorth);
    if (peak > 0) {
      const drawdownPct = roundCurrency(((peak - current.netWorth) / peak) * 100);
      maxDrawdownPct = Math.max(maxDrawdownPct, drawdownPct);
    }
  }

  const holdings = buildHoldingRecap(state).sort((a, b) => b.pnl - a.pnl);
  const watchedSet = new Set(state.watchlist || []);
  const totalTrades = state.transactionHistory.filter((txn) =>
    txn.type === 'buy' ||
    txn.type === 'sell' ||
    txn.type === 'short' ||
    txn.type === 'cover' ||
    txn.type === 'limit_buy' ||
    txn.type === 'limit_sell'
  ).length;

  return {
    playerReturnPct: getPlayerReturnPct(state),
    marketReturnPct: getMarketReturnPct(state),
    alphaPct: getAlphaPct(state),
    bestTurn,
    worstTurn,
    maxDrawdownPct: roundCurrency(maxDrawdownPct),
    topWinner: holdings[0] || null,
    biggestDrag: holdings.length ? holdings[holdings.length - 1] : null,
    totalTrades,
    totalFees: roundCurrency(state.totalFeesPaid || 0),
    totalDividends: roundCurrency(state.totalDividendsReceived || 0),
    newsEvents: state.newsHistory.length,
    catalystEvents: state.newsHistory.filter((event) => event.source === 'catalyst').length,
    watchedNewsHits: state.newsHistory.filter((event) =>
      event.affectedStocks.some((stockId) => watchedSet.has(stockId))
    ).length,
  };
}
