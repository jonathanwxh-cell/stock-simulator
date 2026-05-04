import { CATALYST_TYPE_LABELS } from './catalystSystem';
import { SECTOR_LABELS } from './config';
import { getMarketBreadthSummary, getUpcomingCatalysts, isExecutedPlayerTrade } from './marketInsights';
import { getLatestRisk } from './riskSystem';
import { getScannerSignals } from './scannerSystem';
import type { GameState, Mission, Screen } from './types';

export type OpportunityTone = 'positive' | 'neutral' | 'warning' | 'danger';

export interface OpportunityAction {
  label: string;
  screen: Screen;
  stockId?: string;
  intent?: 'navigate' | 'buy_one' | 'toggle_watchlist';
}

export interface OpportunityProgress {
  label: string;
  value: number;
}

export interface OpportunityCard {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  tone: OpportunityTone;
  action?: OpportunityAction;
  progress?: OpportunityProgress;
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function playerTradeCount(state: GameState): number {
  return state.transactionHistory.filter(isExecutedPlayerTrade).length;
}

function missionProgress(mission: Mission): OpportunityProgress {
  const target = Math.max(Math.abs(mission.target), 1);
  const raw = mission.id.includes('risk')
    ? mission.progress
    : (mission.progress / target) * 100;

  return {
    label: `${mission.progress.toFixed(mission.progress % 1 === 0 ? 0 : 1)} / ${mission.target}`,
    value: clampPct(raw),
  };
}

function missionAction(mission: Mission): OpportunityAction {
  if (mission.type === 'risk') return { label: 'Tune Risk', screen: 'portfolio' };
  if (mission.type === 'diversification') return { label: 'Find Sectors', screen: 'stock-market' };
  if (mission.type === 'income') return { label: 'Find Dividends', screen: 'stock-market' };
  return { label: 'Find Setup', screen: 'stock-market' };
}

function addUnique(cards: OpportunityCard[], card: OpportunityCard): void {
  if (!cards.some((entry) => entry.id === card.id)) cards.push(card);
}

function pickActionStock(state: GameState, avoidWatched = false) {
  const watched = new Set(state.watchlist || []);
  const scanner = getScannerSignals(state, 6).find((signal) => !avoidWatched || !watched.has(signal.stockId));
  const catalyst = getUpcomingCatalysts(state, 4).find((event) => !avoidWatched || !watched.has(event.stockId));
  const fallback = state.stocks.find((stock) => !avoidWatched || !watched.has(stock.id));
  const stockId = scanner?.stockId || catalyst?.stockId || fallback?.id || state.stocks[0]?.id || '';
  const stock = state.stocks.find((entry) => entry.id === stockId);
  return stock ? { stockId: stock.id, ticker: stock.ticker } : null;
}

export function buildOpportunityBoard(state: GameState, limit = 3): OpportunityCard[] {
  const cards: OpportunityCard[] = [];
  const risk = getLatestRisk(state);
  const tradeCount = playerTradeCount(state);
  const openPlans = (state.limitOrders?.length || 0) + (state.conditionalOrders?.length || 0);
  const watchedCount = state.watchlist?.length || 0;

  if (risk.level === 'high' || risk.level === 'extreme') {
    addUnique(cards, {
      id: 'risk-reset',
      eyebrow: 'Risk Alert',
      title: 'Bring risk back under control',
      body: risk.warnings[0] || 'Your fund risk is elevated. Trim concentration, raise cash, or close exposed Bet Down positions before adding more trades.',
      tone: risk.level === 'extreme' ? 'danger' : 'warning',
      action: { label: 'Open Portfolio', screen: 'portfolio' },
      progress: { label: `${risk.totalScore}/100 risk`, value: clampPct(risk.totalScore) },
    });
  }

  if (tradeCount === 0) {
    const pick = pickActionStock(state);
    addUnique(cards, {
      id: 'first-trade',
      eyebrow: 'Start Here',
      title: 'Make your first clear trade',
      body: pick ? `Buy one share of ${pick.ticker} to start the loop. You can resize or undo with normal trades after you see how a turn feels.` : 'Open the Market, pick one understandable setup, and use Buy Now.',
      tone: 'positive',
      action: pick
        ? { label: `Buy 1 ${pick.ticker}`, screen: 'game', stockId: pick.stockId, intent: 'buy_one' }
        : { label: 'Open Market', screen: 'stock-market', intent: 'navigate' },
    });
  }

  if (state.activeMission) {
    addUnique(cards, {
      id: 'mission-focus',
      eyebrow: 'Bonus Cash',
      title: state.activeMission.title,
      body: state.activeMission.description,
      tone: 'neutral',
      action: missionAction(state.activeMission),
      progress: missionProgress(state.activeMission),
    });
  }

  if (watchedCount < 3) {
    const pick = pickActionStock(state, true);
    addUnique(cards, {
      id: 'watchlist-builder',
      eyebrow: 'Low Friction',
      title: 'Star 3 stocks to make news useful',
      body: pick ? `Star ${pick.ticker} now. A small watchlist turns catalyst noise into useful HUD alerts automatically.` : 'A small watchlist turns catalyst noise into alerts that show up on your HUD automatically.',
      tone: 'neutral',
      action: pick
        ? { label: `Star ${pick.ticker}`, screen: 'game', stockId: pick.stockId, intent: 'toggle_watchlist' }
        : { label: 'Browse Market', screen: 'stock-market', intent: 'navigate' },
      progress: { label: `${watchedCount}/3 watched`, value: clampPct((watchedCount / 3) * 100) },
    });
  }

  const catalyst = getUpcomingCatalysts(state, 1)[0];
  if (catalyst) {
    const stock = state.stocks.find((entry) => entry.id === catalyst.stockId);
    const turns = catalyst.scheduledTurn - state.currentTurn;
    addUnique(cards, {
      id: `catalyst-${catalyst.stockId}`,
      eyebrow: 'Event Setup',
      title: `${stock?.ticker || 'A stock'} has ${CATALYST_TYPE_LABELS[catalyst.type].toLowerCase()} soon`,
      body: `A ${catalyst.volatility} volatility event is due in ${turns} turn${turns === 1 ? '' : 's'}. Decide whether to enter, avoid, or plan an exit before the event hits.`,
      tone: catalyst.volatility === 'high' ? 'warning' : 'neutral',
      action: { label: `Open ${stock?.ticker || 'Stock'}`, screen: 'stock-detail', stockId: catalyst.stockId },
    });
  }

  const scanner = getScannerSignals(state, 1)[0];
  if (scanner) {
    addUnique(cards, {
      id: `scanner-${scanner.stockId}`,
      eyebrow: 'Scanner Pick',
      title: scanner.title,
      body: scanner.description,
      tone: scanner.tone === 'negative' ? 'warning' : scanner.tone,
      action: { label: `Open ${scanner.ticker}`, screen: 'stock-detail', stockId: scanner.stockId },
    });
  }

  if (tradeCount > 0 && openPlans === 0) {
    addUnique(cards, {
      id: 'plan-ahead',
      eyebrow: 'Automation',
      title: 'Set one Plan Ahead order',
      body: 'Use a planned buy, stop loss, or take profit so the game can execute your next move without extra clicking each turn.',
      tone: 'positive',
      action: { label: 'Open Market', screen: 'stock-market' },
    });
  }

  const bestSector = getMarketBreadthSummary(state).bestSector;
  if (bestSector) {
    addUnique(cards, {
      id: `sector-${bestSector.sector}`,
      eyebrow: 'Market Flow',
      title: `${SECTOR_LABELS[bestSector.sector] || bestSector.sector} leads the tape`,
      body: `This sector is averaging ${bestSector.avgChangePct >= 0 ? '+' : ''}${bestSector.avgChangePct.toFixed(1)}% this turn. Use it as a hunting ground, not a reason to chase every stock.`,
      tone: bestSector.avgChangePct >= 0 ? 'positive' : 'neutral',
      action: { label: 'View Market', screen: 'stock-market' },
    });
  }

  return cards.slice(0, Math.max(1, limit));
}
