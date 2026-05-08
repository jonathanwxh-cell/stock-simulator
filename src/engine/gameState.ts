import { deepCloneGameState } from './cloneState';
import type { ConditionalOrder, GameState, Difficulty, Transaction, TradeResult, CareerStyle, ChallengeModeId } from './types';
import { DIFFICULTY_CONFIGS, calcBrokerFee } from './config';
import { isPositiveCurrency, isPositiveWholeNumber, roundCurrency } from './financialMath';
import { cloneInitialStocks } from './stockData';
import { getPortfolioValue, getNetWorth, getShortLiability } from './marketSimulator';
import { initialMarketIndex } from './marketIndex';
import { createInitialRegime } from './regimeSystem';
import { calculateRisk } from './riskSystem';
import { createMission } from './missionSystem';
import { defaultRNG } from './rng';
import { ensureUpcomingCatalysts } from './catalystSystem';
import { createInitialMacroEnvironment } from './macroSystem';
import { createCareerState } from './careerSystem';
import { getCareerSeasonGoal } from './careerSeasons';
import {
  cancelConditionalOrder as cancelConditionalOrderImpl,
  cancelLimitOrder as cancelLimitOrderImpl,
  placeConditionalOrder as placeConditionalOrderImpl,
  placeLimitOrder as placeLimitOrderImpl,
} from './orders';

export { getPortfolioValue, getNetWorth, getShortLiability };

export function createNewGame(
  playerName: string,
  difficulty: Difficulty,
  careerStyle: CareerStyle = 'balanced',
  challengeMode: ChallengeModeId = 'standard',
): GameState {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const now = new Date();
  const startDate = new Date(2024, 0, 1);
  const macroEnvironment = createInitialMacroEnvironment();
  const state: GameState = {
    saveSlot: 'auto',
    runId: crypto.randomUUID(),
    leaderboardEntryId: null,
    playerName: playerName || 'Trader',
    career: createCareerState(careerStyle, config.startingCash, now, difficulty, challengeMode),
    difficulty,
    currentTurn: 0,
    currentDate: startDate,
    cash: config.startingCash,
    portfolio: {},
    shortPositions: {},
    limitOrders: [],
    conditionalOrders: [],
    marginUsed: 0,
    totalFeesPaid: 0,
    totalDividendsReceived: 0,
    transactionHistory: [],
    netWorthHistory: [{
      turn: 0,
      date: new Date(startDate),
      netWorth: config.startingCash,
      cash: config.startingCash,
      portfolioValue: 0,
      shortLiability: 0,
      marginUsed: 0,
    }],
    marketIndexHistory: initialMarketIndex(),
    currentRegime: createInitialRegime(),
    riskHistory: [],
    activeMission: null,
    completedMissions: [],
    lastAdvisorFeedback: [],
    macroEnvironment,
    macroHistory: [macroEnvironment],
    watchlist: [],
    catalystCalendar: [],
    stocks: cloneInitialStocks(),
    newsHistory: [],
    currentScenario: null,
    isGameOver: false,
    finalRank: null,
    finalGrade: null,
    createdAt: now,
    updatedAt: now,
  };
  state.riskHistory = [calculateRisk(state)];
  state.activeMission = createMission(state, defaultRNG);
  state.catalystCalendar = ensureUpcomingCatalysts(state, [], defaultRNG);
  return state;
}

function getTradeStock(state: GameState, stockId: string) {
  const stock = state.stocks.find(s => s.id === stockId);
  if (!stock || !isPositiveCurrency(stock.currentPrice)) return null;
  return stock;
}

export function canBuy(state: GameState, stockId: string, shares: number): boolean {
  if (!isPositiveWholeNumber(shares)) return false;
  const stock = getTradeStock(state, stockId);
  if (!stock) return false;
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const plan = planBuyNetting(state, stock, shares, config);
  return plan.cashAfter >= 0;
}

export function canSell(state: GameState, stockId: string, shares: number): boolean {
  if (!isPositiveWholeNumber(shares)) return false;
  const position = state.portfolio[stockId];
  return !!position && position.shares >= shares;
}

export function canShort(state: GameState, stockId: string, shares: number): boolean {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (state.career?.challengeMode === 'no_shorts') return false;
  if (!config.shortEnabled || !isPositiveWholeNumber(shares)) return false;
  const stock = getTradeStock(state, stockId);
  if (!stock) return false;
  const plan = planShortNetting(state, stock, shares, config);
  return plan.cashAfter >= 0;
}

export function canCover(state: GameState, stockId: string, shares: number): boolean {
  if (!isPositiveWholeNumber(shares)) return false;
  const pos = state.shortPositions[stockId];
  if (!pos || pos.shares < shares) return false;
  const stock = getTradeStock(state, stockId);
  if (!stock) return false;
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const coverCost = roundCurrency(stock.currentPrice * shares);
  const fee = calcBrokerFee(coverCost, config);
  const marginRelease = roundCurrency((pos.marginUsed / pos.shares) * shares);
  const pnl = roundCurrency((pos.entryPrice - stock.currentPrice) * shares);
  return state.cash + roundCurrency(marginRelease + pnl - fee) >= 0;
}

interface BuyPlan {
  sharesToCover: number;
  sharesToBuy: number;
  buyCost: number;
  marginRelease: number;
  coverPnl: number;
  fee: number;
  cashAfter: number;
}

interface ShortPlan {
  sharesToSell: number;
  sharesToShort: number;
  sellProceeds: number;
  shortProceeds: number;
  marginReq: number;
  fee: number;
  cashAfter: number;
}

function planBuyNetting(state: GameState, stock: NonNullable<ReturnType<typeof getTradeStock>>, shares: number, config: typeof DIFFICULTY_CONFIGS[Difficulty]): BuyPlan {
  const shortPosition = state.shortPositions[stock.id];
  const sharesToCover = shortPosition ? Math.min(shares, shortPosition.shares) : 0;
  const sharesToBuy = shares - sharesToCover;
  const totalNotional = roundCurrency(stock.currentPrice * shares);
  const fee = calcBrokerFee(totalNotional, config);
  const buyCost = roundCurrency(stock.currentPrice * sharesToBuy);
  const marginRelease = sharesToCover > 0 && shortPosition
    ? roundCurrency((shortPosition.marginUsed / shortPosition.shares) * sharesToCover)
    : 0;
  const coverPnl = sharesToCover > 0 && shortPosition
    ? roundCurrency((shortPosition.entryPrice - stock.currentPrice) * sharesToCover)
    : 0;
  const cashAfter = roundCurrency(state.cash + marginRelease + coverPnl - buyCost - fee);
  return { sharesToCover, sharesToBuy, buyCost, marginRelease, coverPnl, fee, cashAfter };
}

function planShortNetting(state: GameState, stock: NonNullable<ReturnType<typeof getTradeStock>>, shares: number, config: typeof DIFFICULTY_CONFIGS[Difficulty]): ShortPlan {
  const longPosition = state.portfolio[stock.id];
  const sharesToSell = longPosition ? Math.min(shares, longPosition.shares) : 0;
  const sharesToShort = shares - sharesToSell;
  const totalNotional = roundCurrency(stock.currentPrice * shares);
  const fee = calcBrokerFee(totalNotional, config);
  const sellProceeds = roundCurrency(stock.currentPrice * sharesToSell);
  const shortProceeds = roundCurrency(stock.currentPrice * sharesToShort);
  const marginReq = roundCurrency(shortProceeds * config.shortMarginRequirement);
  const cashAfter = roundCurrency(state.cash + sellProceeds - marginReq - fee);
  return { sharesToSell, sharesToShort, sellProceeds, shortProceeds, marginReq, fee, cashAfter };
}

function splitFee(totalFee: number, primaryShares: number, totalShares: number): { primary: number; remainder: number } {
  if (primaryShares === 0) return { primary: 0, remainder: totalFee };
  if (primaryShares === totalShares) return { primary: totalFee, remainder: 0 };
  const primary = roundCurrency(totalFee * (primaryShares / totalShares));
  return { primary, remainder: roundCurrency(totalFee - primary) };
}

function getCoverError(state: GameState, stockId: string, shares: number) {
  if (!isPositiveWholeNumber(shares)) return 'invalid_shares' as const;
  const pos = state.shortPositions[stockId];
  if (!pos) return 'no_position' as const;
  if (pos.shares < shares) return 'insufficient_shares' as const;
  const stock = getTradeStock(state, stockId);
  if (!stock) return 'stock_not_found' as const;
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const coverCost = roundCurrency(stock.currentPrice * shares);
  const fee = calcBrokerFee(coverCost, config);
  const marginRelease = roundCurrency((pos.marginUsed / pos.shares) * shares);
  const pnl = roundCurrency((pos.entryPrice - stock.currentPrice) * shares);
  return state.cash + roundCurrency(marginRelease + pnl - fee) < 0 ? ('insufficient_funds' as const) : null;
}

function recordFee(newState: GameState, fee: number, stockId: string) {
  if (fee <= 0) return;
  newState.totalFeesPaid = roundCurrency(newState.totalFeesPaid + fee);
  newState.transactionHistory.push({
    id: `fee_${crypto.randomUUID()}`,
    date: new Date(newState.currentDate),
    turn: newState.currentTurn,
    stockId,
    type: 'fee',
    shares: 0,
    price: 0,
    total: roundCurrency(fee),
    fee: roundCurrency(fee),
  });
}

export function executeBuy(state: GameState, stockId: string, shares: number): TradeResult {
  if (!isPositiveWholeNumber(shares)) return { ok: false, reason: 'invalid_shares' };
  const stock = getTradeStock(state, stockId);
  if (!stock) return { ok: false, reason: 'stock_not_found' };
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const plan = planBuyNetting(state, stock, shares, config);
  if (plan.cashAfter < 0) return { ok: false, reason: 'insufficient_funds' };

  const newState = deepCloneGameState(state);
  newState.cash = plan.cashAfter;
  newState.marginUsed = roundCurrency(newState.marginUsed - plan.marginRelease);
  recordFee(newState, plan.fee, stockId);

  const fees = splitFee(plan.fee, plan.sharesToCover, shares);
  const price = roundCurrency(stock.currentPrice);
  const txns: Transaction[] = [];

  if (plan.sharesToCover > 0) {
    const pos = newState.shortPositions[stockId];
    pos.shares -= plan.sharesToCover;
    pos.marginUsed = roundCurrency(pos.marginUsed - plan.marginRelease);
    if (pos.shares <= 0) delete newState.shortPositions[stockId];
    txns.push({
      id: `txn_${crypto.randomUUID()}`,
      date: new Date(state.currentDate),
      turn: state.currentTurn,
      stockId,
      type: 'cover',
      shares: plan.sharesToCover,
      price,
      total: roundCurrency(stock.currentPrice * plan.sharesToCover),
      fee: fees.primary,
    });
  }

  if (plan.sharesToBuy > 0) {
    const existing = newState.portfolio[stockId];
    if (existing) {
      const totalShares = existing.shares + plan.sharesToBuy;
      const totalCostBasis = roundCurrency((existing.avgCost * existing.shares) + plan.buyCost);
      existing.shares = totalShares;
      if (totalShares > 0) existing.avgCost = roundCurrency(totalCostBasis / totalShares);
    } else {
      newState.portfolio[stockId] = { stockId, shares: plan.sharesToBuy, avgCost: price };
    }
    txns.push({
      id: `txn_${crypto.randomUUID()}`,
      date: new Date(state.currentDate),
      turn: state.currentTurn,
      stockId,
      type: 'buy',
      shares: plan.sharesToBuy,
      price,
      total: plan.buyCost,
      fee: fees.remainder,
    });
  }

  newState.transactionHistory.push(...txns);
  newState.updatedAt = new Date();
  return { ok: true, state: newState, transaction: txns[txns.length - 1] };
}

export function executeSell(state: GameState, stockId: string, shares: number): TradeResult {
  if (!isPositiveWholeNumber(shares)) return { ok: false, reason: 'invalid_shares' };
  if (!canSell(state, stockId, shares)) return { ok: false, reason: 'insufficient_shares' };
  const stock = getTradeStock(state, stockId);
  if (!stock) return { ok: false, reason: 'stock_not_found' };
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const totalProceeds = roundCurrency(stock.currentPrice * shares);
  const fee = calcBrokerFee(totalProceeds, config);
  const newState = deepCloneGameState(state);
  newState.cash = roundCurrency(newState.cash + totalProceeds - fee);
  recordFee(newState, fee, stockId);
  const position = newState.portfolio[stockId];
  position.shares -= shares;
  if (position.shares === 0) delete newState.portfolio[stockId];
  const transaction: Transaction = {
    id: `txn_${crypto.randomUUID()}`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: 'sell',
    shares,
    price: roundCurrency(stock.currentPrice),
    total: totalProceeds,
    fee,
  };
  newState.transactionHistory.push(transaction);
  newState.updatedAt = new Date();
  return { ok: true, state: newState, transaction };
}

export function executeShort(state: GameState, stockId: string, shares: number): TradeResult {
  if (!isPositiveWholeNumber(shares)) return { ok: false, reason: 'invalid_shares' };
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (state.career?.challengeMode === 'no_shorts') return { ok: false, reason: 'challenge_restricted' };
  if (!config.shortEnabled) return { ok: false, reason: 'short_disabled' };
  const stock = getTradeStock(state, stockId);
  if (!stock) return { ok: false, reason: 'stock_not_found' };
  const plan = planShortNetting(state, stock, shares, config);
  if (plan.cashAfter < 0) return { ok: false, reason: 'insufficient_funds' };

  const newState = deepCloneGameState(state);
  newState.cash = plan.cashAfter;
  newState.marginUsed = roundCurrency(newState.marginUsed + plan.marginReq);
  recordFee(newState, plan.fee, stockId);

  const fees = splitFee(plan.fee, plan.sharesToSell, shares);
  const price = roundCurrency(stock.currentPrice);
  const txns: Transaction[] = [];

  if (plan.sharesToSell > 0) {
    const pos = newState.portfolio[stockId];
    pos.shares -= plan.sharesToSell;
    if (pos.shares === 0) delete newState.portfolio[stockId];
    txns.push({
      id: `txn_${crypto.randomUUID()}`,
      date: new Date(state.currentDate),
      turn: state.currentTurn,
      stockId,
      type: 'sell',
      shares: plan.sharesToSell,
      price,
      total: plan.sellProceeds,
      fee: fees.primary,
    });
  }

  if (plan.sharesToShort > 0) {
    const existing = newState.shortPositions[stockId];
    if (existing) {
      const totalShares = existing.shares + plan.sharesToShort;
      if (totalShares > 0) existing.entryPrice = roundCurrency(((existing.entryPrice * existing.shares) + (stock.currentPrice * plan.sharesToShort)) / totalShares);
      existing.shares = totalShares;
      existing.marginUsed = roundCurrency(existing.marginUsed + plan.marginReq);
    } else {
      newState.shortPositions[stockId] = { stockId, shares: plan.sharesToShort, entryPrice: price, marginUsed: plan.marginReq };
    }
    txns.push({
      id: `txn_${crypto.randomUUID()}`,
      date: new Date(state.currentDate),
      turn: state.currentTurn,
      stockId,
      type: 'short',
      shares: plan.sharesToShort,
      price,
      total: plan.shortProceeds,
      fee: fees.remainder,
    });
  }

  newState.transactionHistory.push(...txns);
  newState.updatedAt = new Date();
  return { ok: true, state: newState, transaction: txns[txns.length - 1] };
}

export function executeCover(state: GameState, stockId: string, shares: number): TradeResult {
  const error = getCoverError(state, stockId, shares);
  if (error) return { ok: false, reason: error };
  const stock = getTradeStock(state, stockId)!;
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const coverCost = roundCurrency(stock.currentPrice * shares);
  const fee = calcBrokerFee(coverCost, config);
  const newState = deepCloneGameState(state);
  const pos = newState.shortPositions[stockId];
  const marginRelease = roundCurrency((pos.marginUsed / pos.shares) * shares);
  const pnl = roundCurrency((pos.entryPrice - stock.currentPrice) * shares);
  newState.cash = roundCurrency(newState.cash + marginRelease + pnl - fee);
  newState.marginUsed = roundCurrency(newState.marginUsed - marginRelease);
  recordFee(newState, fee, stockId);
  pos.shares -= shares;
  pos.marginUsed = roundCurrency(pos.marginUsed - marginRelease);
  if (pos.shares <= 0) delete newState.shortPositions[stockId];
  const transaction: Transaction = {
    id: `txn_${crypto.randomUUID()}`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: 'cover',
    shares,
    price: roundCurrency(stock.currentPrice),
    total: coverCost,
    fee,
  };
  newState.transactionHistory.push(transaction);
  newState.updatedAt = new Date();
  return { ok: true, state: newState, transaction };
}

export function placeLimitOrder(state: GameState, stockId: string, type: 'buy' | 'sell', shares: number, targetPrice: number): TradeResult {
  return placeLimitOrderImpl(state, stockId, type, shares, targetPrice);
}

export function cancelLimitOrder(state: GameState, orderId: string): GameState {
  return cancelLimitOrderImpl(state, orderId);
}

export function placeConditionalOrder(state: GameState, stockId: string, type: ConditionalOrder['type'], shares: number, triggerPrice: number): TradeResult {
  return placeConditionalOrderImpl(state, stockId, type, shares, triggerPrice);
}

export function cancelConditionalOrder(state: GameState, orderId: string): GameState {
  return cancelConditionalOrderImpl(state, orderId);
}

export function toggleWatchlistStock(state: GameState, stockId: string): GameState {
  if (!state.stocks.some((stock) => stock.id === stockId)) return state;
  const newState = deepCloneGameState(state);
  const existing = new Set(newState.watchlist || []);
  if (existing.has(stockId)) existing.delete(stockId);
  else existing.add(stockId);
  newState.watchlist = [...existing];
  newState.updatedAt = new Date();
  return newState;
}

export function calculateGrade(state: GameState): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const ratio = getNetWorth(state) / getCareerSeasonGoal(state);
  if (ratio >= 3) return 'S';
  if (ratio >= 1.5) return 'A';
  if (ratio >= 1) return 'B';
  if (ratio >= 0.75) return 'C';
  if (ratio >= 0.5) return 'D';
  return 'F';
}

export function checkGameOver(state: GameState): 'win' | 'lose' | 'ongoing' {
  if (!state.isGameOver) return 'ongoing';
  return getNetWorth(state) >= getCareerSeasonGoal(state) ? 'win' : 'lose';
}

export function tradeErrorMessage(reason: string): string {
  const messages: Record<string, string> = {
    insufficient_funds: 'Not enough cash for this trade',
    insufficient_shares: 'Not enough shares to sell',
    invalid_shares: 'Share count must be a positive whole number',
    invalid_target_price: 'Target price must be positive',
    max_limit_orders_reached: 'Maximum limit orders reached',
    short_disabled: 'Short selling is not available',
    challenge_restricted: 'This career challenge blocks that trade',
    no_position: 'No position to cover',
    stock_not_found: 'Stock not found',
  };
  return messages[reason] || 'Trade failed';
}
