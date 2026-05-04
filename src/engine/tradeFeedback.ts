import type { GameState, RiskLevel, Sector, Stock } from './types';
import { executeBuy, executeCover, executeSell, executeShort, getNetWorth, getPortfolioValue, getShortLiability } from './gameState';
import { DIFFICULTY_CONFIGS } from './config';
import { calculateRisk } from './riskSystem';
import { roundCurrency } from './financialMath';

export type TradeAction = 'buy' | 'sell' | 'short' | 'cover';
export type FeedbackTone = 'positive' | 'neutral' | 'warning' | 'danger';

export interface TradeFeedbackDetail { label: string; value: string; tone?: FeedbackTone; }
export interface TradeFeedback {
  action: TradeAction; stockId: string; ticker: string; headline: string; subheadline: string; details: TradeFeedbackDetail[];
  cashBefore: number; cashAfter: number; cashDelta: number;
  riskBefore: { level: RiskLevel; score: number }; riskAfter: { level: RiskLevel; score: number }; riskDelta: number;
  positionLabel: string; sectorExposureBefore: number; sectorExposureAfter: number; positionWeightAfter: number;
}

function money(value: number): string { return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function signedMoney(value: number): string { if (Math.abs(value) < 0.005) return '$0.00'; return `${value > 0 ? '+' : '-'}${money(value)}`; }
function pct(value: number): string { if (Math.abs(value) < 0.05) return '0.0%'; return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`; }
function riskText(level: RiskLevel, score: number): string { return `${level.toUpperCase()} ${Math.round(score)}/100`; }
function riskTone(delta: number): FeedbackTone { if (delta >= 15) return 'danger'; if (delta >= 5) return 'warning'; if (delta <= -5) return 'positive'; return 'neutral'; }
function findStock(state: GameState, stockId: string): Stock | null { return state.stocks.find(s => s.id === stockId) ?? null; }
function latestRecordedNetWorth(state: GameState): number { return state.netWorthHistory?.[state.netWorthHistory.length - 1]?.netWorth ?? 0; }

function exposureBasis(state: GameState): number {
  const longValue = getPortfolioValue(state);
  const shortValue = getShortLiability(state);
  const directNetWorth = getNetWorth(state);
  const marginAdjustedEquity = roundCurrency(state.cash + longValue + state.marginUsed - shortValue);
  const candidates = [directNetWorth, marginAdjustedEquity, latestRecordedNetWorth(state)].filter(value => Number.isFinite(value) && value > 0);
  return Math.max(1, ...candidates);
}

function sectorExposurePct(state: GameState, sector: Sector): number {
  let sectorValue = 0;
  for (const [stockId, position] of Object.entries(state.portfolio)) {
    const stock = findStock(state, stockId);
    if (stock && stock.sector === sector && position.shares > 0) sectorValue += stock.currentPrice * position.shares;
  }
  for (const [stockId, position] of Object.entries(state.shortPositions)) {
    const stock = findStock(state, stockId);
    if (stock && stock.sector === sector && position.shares > 0) sectorValue += stock.currentPrice * position.shares;
  }
  return roundCurrency((sectorValue / exposureBasis(state)) * 100);
}

function positionWeightPct(state: GameState, stockId: string): number {
  const stock = findStock(state, stockId);
  if (!stock) return 0;
  const longShares = state.portfolio[stockId]?.shares ?? 0;
  const shortShares = state.shortPositions[stockId]?.shares ?? 0;
  const exposure = Math.abs(longShares * stock.currentPrice) + Math.abs(shortShares * stock.currentPrice);
  return roundCurrency((exposure / exposureBasis(state)) * 100);
}

function getPositionLabel(state: GameState, stockId: string): string {
  const longShares = state.portfolio[stockId]?.shares ?? 0;
  const shortShares = state.shortPositions[stockId]?.shares ?? 0;
  if (longShares > 0 && shortShares > 0) return `Owned ${longShares} · Bet Down ${shortShares}`;
  if (longShares > 0) return `${longShares} owned shares`;
  if (shortShares > 0) return `${shortShares} Bet Down shares`;
  return 'No position';
}

function simulateTrade(state: GameState, stockId: string, shares: number, action: TradeAction) {
  if (action === 'buy') return executeBuy(state, stockId, shares);
  if (action === 'sell') return executeSell(state, stockId, shares);
  if (action === 'short') return executeShort(state, stockId, shares);
  return executeCover(state, stockId, shares);
}

export function getTradeFeedback(state: GameState, stockId: string, shares: number, action: TradeAction): TradeFeedback | null {
  const stock = findStock(state, stockId);
  if (!stock) return null;
  const result = simulateTrade(state, stockId, shares, action);
  if (!result.ok) return null;

  const beforeRisk = calculateRisk(state);
  const afterRisk = calculateRisk(result.state);
  const cashBefore = roundCurrency(state.cash);
  const cashAfter = roundCurrency(result.state.cash);
  const cashDelta = roundCurrency(cashAfter - cashBefore);
  const riskDelta = afterRisk.totalScore - beforeRisk.totalScore;
  const sectorBefore = sectorExposurePct(state, stock.sector);
  const sectorAfter = sectorExposurePct(result.state, stock.sector);
  const positionWeightAfter = positionWeightPct(result.state, stockId);
  const positionLabel = getPositionLabel(result.state, stockId);
  const transaction = result.transaction;
  const details: TradeFeedbackDetail[] = [];
  let headline = '';
  let subheadline = '';

  if (action === 'buy') {
    headline = `Bought ${shares} ${stock.ticker}`;
    subheadline = `Cost ${money(transaction.total)} · Fee ${money(transaction.fee)}`;
    details.push({ label: 'Cash after', value: money(cashAfter) }, { label: 'Cash impact', value: signedMoney(cashDelta), tone: 'neutral' }, { label: 'Position after', value: positionLabel }, { label: 'Position size', value: `${positionWeightAfter.toFixed(1)}% of net worth`, tone: positionWeightAfter >= 50 ? 'danger' : positionWeightAfter >= 25 ? 'warning' : 'neutral' });
  } else if (action === 'sell') {
    const avgCost = state.portfolio[stockId]?.avgCost ?? stock.currentPrice;
    const grossPnl = roundCurrency((stock.currentPrice - avgCost) * shares);
    headline = `Sold ${shares} ${stock.ticker}`;
    subheadline = `Proceeds ${money(transaction.total)} · Fee ${money(transaction.fee)}`;
    details.push({ label: 'Realized P/L', value: signedMoney(grossPnl - transaction.fee), tone: grossPnl - transaction.fee >= 0 ? 'positive' : 'danger' }, { label: 'Cash after', value: money(cashAfter) }, { label: 'Cash impact', value: signedMoney(cashDelta), tone: 'positive' }, { label: 'Position after', value: positionLabel });
  } else if (action === 'short') {
    const marginUsed = roundCurrency(transaction.total * DIFFICULTY_CONFIGS[state.difficulty].shortMarginRequirement);
    headline = `Bet Down ${shares} ${stock.ticker}`;
    subheadline = `Position value ${money(transaction.total)} · Fee ${money(transaction.fee)}`;
    details.push({ label: 'Cash reserved', value: money(marginUsed), tone: 'warning' }, { label: 'Cash after', value: money(cashAfter) }, { label: 'Bet Down exposure', value: `${positionWeightAfter.toFixed(1)}% of net worth`, tone: positionWeightAfter >= 50 ? 'danger' : positionWeightAfter >= 20 ? 'warning' : 'neutral' }, { label: 'Position after', value: positionLabel });
  } else {
    const shortEntry = state.shortPositions[stockId]?.entryPrice ?? stock.currentPrice;
    const grossPnl = roundCurrency((shortEntry - stock.currentPrice) * shares);
    headline = `Closed Short ${shares} ${stock.ticker}`;
    subheadline = `Close value ${money(transaction.total)} · Fee ${money(transaction.fee)}`;
    details.push({ label: 'Realized P/L', value: signedMoney(grossPnl - transaction.fee), tone: grossPnl - transaction.fee >= 0 ? 'positive' : 'danger' }, { label: 'Cash after', value: money(cashAfter) }, { label: 'Cash impact', value: signedMoney(cashDelta), tone: cashDelta >= 0 ? 'positive' : 'danger' }, { label: 'Position after', value: positionLabel });
  }

  details.push({ label: 'Sector exposure', value: `${sectorBefore.toFixed(1)}% → ${sectorAfter.toFixed(1)}%` }, { label: 'Risk', value: `${riskText(beforeRisk.level, beforeRisk.totalScore)} → ${riskText(afterRisk.level, afterRisk.totalScore)}`, tone: riskTone(riskDelta) });
  return { action, stockId, ticker: stock.ticker, headline, subheadline, details, cashBefore, cashAfter, cashDelta, riskBefore: { level: beforeRisk.level, score: beforeRisk.totalScore }, riskAfter: { level: afterRisk.level, score: afterRisk.totalScore }, riskDelta, positionLabel, sectorExposureBefore: sectorBefore, sectorExposureAfter: sectorAfter, positionWeightAfter };
}

export const tradeFeedbackFormat = { money, signedMoney, pct };
