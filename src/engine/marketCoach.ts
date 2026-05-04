import { CATALYST_TYPE_LABELS } from './catalystSystem';
import { SECTOR_LABELS } from './config';
import { getMarketBreadthSummary, getUpcomingCatalysts, getWatchlistAlerts, isExecutedPlayerTrade } from './marketInsights';
import { getLatestRisk } from './riskSystem';
import { getScannerSignals } from './scannerSystem';
import { getLatestTurnPerformance } from './turnPerformance';
import type { CatalystEvent, GameState, ScannerSignal, Screen, Stock } from './types';

export type CoachTone = 'positive' | 'neutral' | 'warning' | 'danger';

export interface CoachAction {
  label: string;
  screen: Screen;
  stockId?: string;
}

export interface CoachCard {
  id: string;
  title: string;
  body: string;
  tone: CoachTone;
  action?: CoachAction;
}

export interface GuidedMarketCoach {
  hero: CoachCard;
  recap: CoachCard | null;
  tips: CoachCard[];
}

export interface StockCoachCallout {
  label: string;
  value: string;
  tone: CoachTone;
}

export interface StockCoach {
  title: string;
  body: string;
  tone: CoachTone;
  callouts: StockCoachCallout[];
}

function signedPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function totalPlayerTrades(state: GameState): number {
  return state.transactionHistory.filter(isExecutedPlayerTrade).length;
}

function formatCatalyst(event: CatalystEvent): string {
  return CATALYST_TYPE_LABELS[event.type].toLowerCase();
}

function findStock(state: GameState, stockId: string): Stock | null {
  return state.stocks.find((stock) => stock.id === stockId) || null;
}

function stockTicker(state: GameState, stockId: string): string {
  return findStock(state, stockId)?.ticker || stockId.toUpperCase();
}

function buildRecap(state: GameState): CoachCard | null {
  if (state.currentTurn <= 0 || state.netWorthHistory.length < 2) return null;

  const performance = getLatestTurnPerformance(state);
  const beatMarket = performance.turnAlphaPct >= 0;
  const title = beatMarket ? 'You beat the market last turn' : 'The market beat you last turn';
  const tone: CoachTone = performance.playerMovePct >= 0
    ? 'positive'
    : performance.turnAlphaPct < -1.5
    ? 'warning'
    : 'neutral';

  return {
    id: 'turn-recap',
    title,
    tone,
    body: `Your fund moved ${signedPct(performance.playerMovePct)} vs market ${signedPct(performance.marketMovePct)}. Alpha was ${signedPct(performance.turnAlphaPct)}.`,
    action: { label: 'Review Portfolio', screen: 'portfolio' },
  };
}

function buildHero(state: GameState): CoachCard {
  const risk = getLatestRisk(state);
  if (risk.level === 'high' || risk.level === 'extreme') {
    return {
      id: 'risk-attention',
      title: 'Risk needs attention',
      tone: risk.level === 'extreme' ? 'danger' : 'warning',
      body: risk.warnings[0] || 'Your portfolio risk is elevated. Check position size, cash buffer, and Bet Down exposure before adding new trades.',
      action: { label: 'Check Portfolio', screen: 'portfolio' },
    };
  }

  if (totalPlayerTrades(state) === 0) {
    return {
      id: 'first-move',
      title: 'Make one clear move',
      tone: 'positive',
      body: 'Start simple: open the Market, pick one stock you understand, and use Buy Now for an immediate trade. Use Plan Ahead only when you want to wait for a better price.',
      action: { label: 'Open Market', screen: 'stock-market' },
    };
  }

  const watchlistAlerts = getWatchlistAlerts(state, 1);
  if (watchlistAlerts.length > 0) {
    const alert = watchlistAlerts[0];
    return {
      id: 'watchlist-alert',
      title: alert.title,
      tone: alert.tone === 'negative' ? 'warning' : alert.tone,
      body: alert.description,
      action: { label: `Open ${stockTicker(state, alert.stockId)}`, screen: 'stock-detail', stockId: alert.stockId },
    };
  }

  const nextCatalyst = getUpcomingCatalysts(state, 1)[0];
  if (nextCatalyst) {
    const ticker = stockTicker(state, nextCatalyst.stockId);
    return {
      id: 'next-catalyst',
      title: `${ticker} has ${formatCatalyst(nextCatalyst)} soon`,
      tone: 'neutral',
      body: `A ${nextCatalyst.volatility} volatility catalyst is due in ${nextCatalyst.scheduledTurn - state.currentTurn} turn${nextCatalyst.scheduledTurn - state.currentTurn === 1 ? '' : 's'}. Decide before the event, not after the move.`,
      action: { label: `Open ${ticker}`, screen: 'stock-detail', stockId: nextCatalyst.stockId },
    };
  }

  const marketPulse = getMarketBreadthSummary(state);
  const bestSector = marketPulse.bestSector;
  if (bestSector && bestSector.avgChangePct > 0) {
    return {
      id: 'market-flow',
      title: `${SECTOR_LABELS[bestSector.sector] || bestSector.sector} has the tape`,
      tone: 'positive',
      body: `The strongest sector is up ${signedPct(bestSector.avgChangePct)} this turn. Use scanner signals to find a clean setup instead of chasing every mover.`,
      action: { label: 'View Scanner', screen: 'stock-market' },
    };
  }

  return {
    id: 'steady-plan',
    title: 'Play the next clean setup',
    tone: 'neutral',
    body: 'Check scanner signals, keep risk controlled, and use Plan Ahead when you want the game to wait for your price.',
    action: { label: 'Open Market', screen: 'stock-market' },
  };
}

function buildTips(state: GameState): CoachCard[] {
  const tips: CoachCard[] = [];
  const tradeCount = totalPlayerTrades(state);
  const watchedCount = state.watchlist?.length || 0;
  const openPlans = (state.limitOrders?.length || 0) + (state.conditionalOrders?.length || 0);
  const scanner = getScannerSignals(state, 1)[0];
  const mission = state.activeMission;

  if (watchedCount < 3) {
    tips.push({
      id: 'watchlist-tip',
      title: 'Star a few tickers',
      tone: 'neutral',
      body: 'A small watchlist turns news and catalyst noise into useful alerts on the HUD.',
      action: { label: 'Browse Market', screen: 'stock-market' },
    });
  }

  if (tradeCount > 0 && openPlans === 0) {
    tips.push({
      id: 'plan-ahead-tip',
      title: 'Try one Plan Ahead order',
      tone: 'positive',
      body: 'Use Auto-Sell If Price Drops to limit damage, or Buy If Price Falls To when you want patience instead of chasing.',
      action: { label: 'Open Market', screen: 'stock-market' },
    });
  }

  if (scanner) {
    tips.push({
      id: `scanner-${scanner.stockId}`,
      title: scanner.title,
      tone: scanner.tone === 'negative' ? 'warning' : scanner.tone,
      body: scanner.description,
      action: { label: `Open ${scanner.ticker}`, screen: 'stock-detail', stockId: scanner.stockId },
    });
  }

  if (mission) {
    tips.push({
      id: 'mission-tip',
      title: mission.title,
      tone: 'neutral',
      body: mission.description,
      action: { label: 'Track Mission', screen: 'game' },
    });
  }

  return tips.slice(0, 3);
}

export function buildGuidedMarketCoach(state: GameState): GuidedMarketCoach {
  return {
    hero: buildHero(state),
    recap: buildRecap(state),
    tips: buildTips(state),
  };
}

function signalForStock(signals: ScannerSignal[], stockId: string): ScannerSignal | null {
  return signals.find((signal) => signal.stockId === stockId) || null;
}

export function buildStockCoach(state: GameState, stockId: string): StockCoach {
  const stock = findStock(state, stockId);
  const ticker = stock?.ticker || stockId.toUpperCase();
  const nextCatalyst = (state.catalystCalendar || [])
    .filter((event) => event.stockId === stockId && event.scheduledTurn >= state.currentTurn)
    .sort((left, right) => left.scheduledTurn - right.scheduledTurn)[0];
  const signal = signalForStock(getScannerSignals(state, 20), stockId);
  const ownedShares = state.portfolio[stockId]?.shares || 0;
  const betDownShares = state.shortPositions[stockId]?.shares || 0;
  const callouts: StockCoachCallout[] = [];

  if (nextCatalyst) {
    callouts.push({
      label: 'Catalyst',
      value: `${CATALYST_TYPE_LABELS[nextCatalyst.type]} in ${nextCatalyst.scheduledTurn - state.currentTurn} turn${nextCatalyst.scheduledTurn - state.currentTurn === 1 ? '' : 's'}`,
      tone: nextCatalyst.volatility === 'high' ? 'warning' : 'neutral',
    });
  }

  if (signal) {
    callouts.push({
      label: 'Scanner',
      value: signal.title,
      tone: signal.tone === 'negative' ? 'warning' : signal.tone,
    });
  }

  if (ownedShares > 0) {
    callouts.push({ label: 'Position', value: `${ownedShares} owned`, tone: 'positive' });
  }

  if (betDownShares > 0) {
    callouts.push({ label: 'Bet Down', value: `${betDownShares} shares`, tone: 'warning' });
  }

  if (nextCatalyst && nextCatalyst.scheduledTurn <= state.currentTurn + 1) {
    return {
      title: `${ticker} has ${formatCatalyst(nextCatalyst)} next turn`,
      tone: 'warning',
      body: 'Catalysts can jump either way. Trade Now if you want exposure immediately; use Plan Ahead if you prefer to define the price first.',
      callouts,
    };
  }

  if (ownedShares > 0 || betDownShares > 0) {
    return {
      title: `Manage your ${ticker} position`,
      tone: betDownShares > 0 ? 'warning' : 'positive',
      body: 'You already have exposure here. Consider protecting shares with Plan Ahead before adding more size.',
      callouts,
    };
  }

  if (signal) {
    return {
      title: `${ticker} is on the scanner`,
      tone: signal.tone === 'negative' ? 'warning' : signal.tone,
      body: `${signal.description} Buy Now acts immediately; Plan Ahead waits for your target price.`,
      callouts,
    };
  }

  return {
    title: `${ticker} playbook`,
    tone: 'neutral',
    body: 'Use Buy Now for a simple immediate position, or Plan Ahead if you want the game to wait for a better entry or protective exit.',
    callouts,
  };
}
