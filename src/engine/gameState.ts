import { deepCloneGameState } from './cloneState';
import type { GameState, Difficulty, Transaction, TradeResult, CareerStyle } from './types';
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
import {
  cancelConditionalOrder as cancelConditionalOrderImpl,
  cancelLimitOrder as cancelLimitOrderImpl,
  placeConditionalOrder as placeConditionalOrderImpl,
  placeLimitOrder as placeLimitOrderImpl,
} from './orders';

export { getPortfolioValue, getNetWorth, getShortLiability };

export function createNewGame(playerName: string, difficulty: Difficulty, careerStyle: CareerStyle = 'balanced'): GameState {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const now = new Date();
  const startDate = new Date(2024, 0, 1);
  const macroEnvironment = createInitialMacroEnvironment();
  const state: GameState = {
    saveSlot: 'auto', runId: crypto.randomUUID(), leaderboardEntryId: null, playerName: playerName || 'Trader', career: createCareerState(careerStyle, config.startingCash, now), difficulty, currentTurn: 0, currentDate: startDate,
    cash: config.startingCash, portfolio: {}, shortPositions: {}, limitOrders: [], conditionalOrders: [], marginUsed: 0,
    totalFeesPaid: 0, totalDividendsReceived: 0, transactionHistory: [],
    netWorthHistory: [{ turn: 0, date: new Date(startDate), netWorth: config.startingCash, cash: config.startingCash, portfolioValue: 0, shortLiability: 0, marginUsed: 0 }],
    marketIndexHistory: initialMarketIndex(), currentRegime: createInitialRegime(), riskHistory: [], activeMission: null, completedMissions: [], lastAdvisorFeedback: [],
    macroEnvironment, macroHistory: [macroEnvironment],
    watchlist: [], catalystCalendar: [],
    stocks: cloneInitialStocks(), newsHistory: [], currentScenario: null, isGameOver: false, finalRank: null, finalGrade: null, createdAt: now, updatedAt: now,
  };
  state.riskHistory = [calculateRisk(state)];
  state.activeMission = createMission(state, defaultRNG);
  state.catalystCalendar = ensureUpcomingCatalysts(state, [], defaultRNG);
  return state;
}

function getTradeStock(state: GameState, stockId: string) { const stock = state.stocks.find(s => s.id === stockId); return !stock || !isPositiveCurrency(stock.currentPrice) ? null : stock; }
export function canBuy(state: GameState, stockId: string, shares: number): boolean { if (!isPositiveWholeNumber(shares)) return false; const stock = getTradeStock(state, stockId); if (!stock) return false; const cost = roundCurrency(stock.currentPrice * shares); const fee = calcBrokerFee(cost, DIFFICULTY_CONFIGS[state.difficulty]); return state.cash >= cost + fee; }
export function canSell(state: GameState, stockId: string, shares: number): boolean { if (!isPositiveWholeNumber(shares)) return false; const position = state.portfolio[stockId]; return !!position && position.shares >= shares; }
export function canShort(state: GameState, stockId: string, shares: number): boolean { const config = DIFFICULTY_CONFIGS[state.difficulty]; if (!config.shortEnabled || !isPositiveWholeNumber(shares)) return false; const stock = getTradeStock(state, stockId); if (!stock) return false; const proceeds = roundCurrency(stock.currentPrice * shares); const marginReq = roundCurrency(proceeds * config.shortMarginRequirement); const fee = calcBrokerFee(proceeds, config); return state.cash >= marginReq + fee; }
export function canCover(state: GameState, stockId: string, shares: number): boolean { if (!isPositiveWholeNumber(shares)) return false; const pos = state.shortPositions[stockId]; if (!pos || pos.shares < shares) return false; const stock = getTradeStock(state, stockId); if (!stock) return false; const config = DIFFICULTY_CONFIGS[state.difficulty]; const coverCost = roundCurrency(stock.currentPrice * shares); const fee = calcBrokerFee(coverCost, config); const marginRelease = roundCurrency((pos.marginUsed / pos.shares) * shares); const pnl = roundCurrency((pos.entryPrice - stock.currentPrice) * shares); return state.cash + roundCurrency(marginRelease + pnl - fee) >= 0; }
function getShortError(state: GameState, stockId: string, shares: number) { const config = DIFFICULTY_CONFIGS[state.difficulty]; if (!config.shortEnabled) return 'short_disabled' as const; if (!isPositiveWholeNumber(shares)) return 'invalid_shares' as const; const stock = getTradeStock(state, stockId); if (!stock) return 'stock_not_found' as const; const proceeds = roundCurrency(stock.currentPrice * shares); const marginReq = roundCurrency(proceeds * config.shortMarginRequirement); const fee = calcBrokerFee(proceeds, config); return state.cash < marginReq + fee ? 'insufficient_funds' as const : null; }
function getCoverError(state: GameState, stockId: string, shares: number) { if (!isPositiveWholeNumber(shares)) return 'invalid_shares' as const; const pos = state.shortPositions[stockId]; if (!pos) return 'no_position' as const; if (pos.shares < shares) return 'insufficient_shares' as const; const stock = getTradeStock(state, stockId); if (!stock) return 'stock_not_found' as const; const config = DIFFICULTY_CONFIGS[state.difficulty]; const coverCost = roundCurrency(stock.currentPrice * shares); const fee = calcBrokerFee(coverCost, config); const marginRelease = roundCurrency((pos.marginUsed / pos.shares) * shares); const pnl = roundCurrency((pos.entryPrice - stock.currentPrice) * shares); return state.cash + roundCurrency(marginRelease + pnl - fee) < 0 ? 'insufficient_funds' as const : null; }
function recordFee(newState: GameState, fee: number, stockId: string) { if (fee <= 0) return; newState.totalFeesPaid = roundCurrency(newState.totalFeesPaid + fee); newState.transactionHistory.push({ id: `fee_${crypto.randomUUID()}`, date: new Date(newState.currentDate), turn: newState.currentTurn, stockId, type: 'fee', shares: 0, price: 0, total: roundCurrency(fee), fee: roundCurrency(fee) }); }
export function executeBuy(state: GameState, stockId: string, shares: number): TradeResult { if (!isPositiveWholeNumber(shares)) return { ok: false, reason: 'invalid_shares' }; if (!canBuy(state, stockId, shares)) return { ok: false, reason: 'insufficient_funds' }; const stock = getTradeStock(state, stockId)!; const config = DIFFICULTY_CONFIGS[state.difficulty]; const totalCost = roundCurrency(stock.currentPrice * shares); const fee = calcBrokerFee(totalCost, config); const newState = deepCloneGameState(state); newState.cash = roundCurrency(newState.cash - totalCost - fee); recordFee(newState, fee, stockId); const existing = newState.portfolio[stockId]; if (existing) { const totalShares = existing.shares + shares; const totalCostBasis = roundCurrency((existing.avgCost * existing.shares) + totalCost); existing.shares = totalShares; existing.avgCost = roundCurrency(totalCostBasis / totalShares); } else newState.portfolio[stockId] = { stockId, shares, avgCost: roundCurrency(stock.currentPrice) }; const transaction: Transaction = { id: `txn_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId, type: 'buy', shares, price: roundCurrency(stock.currentPrice), total: totalCost, fee }; newState.transactionHistory.push(transaction); newState.updatedAt = new Date(); return { ok: true, state: newState, transaction }; }
export function executeSell(state: GameState, stockId: string, shares: number): TradeResult { if (!isPositiveWholeNumber(shares)) return { ok: false, reason: 'invalid_shares' }; if (!canSell(state, stockId, shares)) return { ok: false, reason: 'insufficient_shares' }; const stock = getTradeStock(state, stockId); if (!stock) return { ok: false, reason: 'stock_not_found' }; const config = DIFFICULTY_CONFIGS[state.difficulty]; const totalProceeds = roundCurrency(stock.currentPrice * shares); const fee = calcBrokerFee(totalProceeds, config); const newState = deepCloneGameState(state); newState.cash = roundCurrency(newState.cash + totalProceeds - fee); recordFee(newState, fee, stockId); const position = newState.portfolio[stockId]; position.shares -= shares; if (position.shares === 0) delete newState.portfolio[stockId]; const transaction: Transaction = { id: `txn_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId, type: 'sell', shares, price: roundCurrency(stock.currentPrice), total: totalProceeds, fee }; newState.transactionHistory.push(transaction); newState.updatedAt = new Date(); return { ok: true, state: newState, transaction }; }
export function executeShort(state: GameState, stockId: string, shares: number): TradeResult { const error = getShortError(state, stockId, shares); if (error) return { ok: false, reason: error }; const stock = getTradeStock(state, stockId)!; const config = DIFFICULTY_CONFIGS[state.difficulty]; const proceeds = roundCurrency(stock.currentPrice * shares); const marginReq = roundCurrency(proceeds * config.shortMarginRequirement); const fee = calcBrokerFee(proceeds, config); const newState = deepCloneGameState(state); newState.cash = roundCurrency(newState.cash - marginReq - fee); newState.marginUsed = roundCurrency(newState.marginUsed + marginReq); recordFee(newState, fee, stockId); const existing = newState.shortPositions[stockId]; if (existing) { const totalShares = existing.shares + shares; existing.entryPrice = roundCurrency(((existing.entryPrice * existing.shares) + (stock.currentPrice * shares)) / totalShares); existing.shares = totalShares; existing.marginUsed = roundCurrency(existing.marginUsed + marginReq); } else newState.shortPositions[stockId] = { stockId, shares, entryPrice: roundCurrency(stock.currentPrice), marginUsed: marginReq }; const transaction: Transaction = { id: `txn_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId, type: 'short', shares, price: roundCurrency(stock.currentPrice), total: proceeds, fee }; newState.transactionHistory.push(transaction); newState.updatedAt = new Date(); return { ok: true, state: newState, transaction }; }
export function executeCover(state: GameState, stockId: string, shares: number): TradeResult { const error = getCoverError(state, stockId, shares); if (error) return { ok: false, reason: error }; const stock = getTradeStock(state, stockId)!; const config = DIFFICULTY_CONFIGS[state.difficulty]; const coverCost = roundCurrency(stock.currentPrice * shares); const fee = calcBrokerFee(coverCost, config); const newState = deepCloneGameState(state); const pos = newState.shortPositions[stockId]; const marginRelease = roundCurrency((pos.marginUsed / pos.shares) * shares); const pnl = roundCurrency((pos.entryPrice - stock.currentPrice) * shares); newState.cash = roundCurrency(newState.cash + marginRelease + pnl - fee); newState.marginUsed = roundCurrency(newState.marginUsed - marginRelease); recordFee(newState, fee, stockId); pos.shares -= shares; pos.marginUsed = roundCurrency(pos.marginUsed - marginRelease); if (pos.shares <= 0) delete newState.shortPositions[stockId]; const transaction: Transaction = { id: `txn_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId, type: 'cover', shares, price: roundCurrency(stock.currentPrice), total: coverCost, fee }; newState.transactionHistory.push(transaction); newState.updatedAt = new Date(); return { ok: true, state: newState, transaction }; }
export function placeLimitOrder(state: GameState, stockId: string, type: 'buy' | 'sell', shares: number, targetPrice: number): TradeResult { return placeLimitOrderImpl(state, stockId, type, shares, targetPrice); }
export function cancelLimitOrder(state: GameState, orderId: string): GameState { return cancelLimitOrderImpl(state, orderId); }
export function placeConditionalOrder(state: GameState, stockId: string, type: 'stop_loss' | 'take_profit', shares: number, triggerPrice: number): TradeResult { return placeConditionalOrderImpl(state, stockId, type, shares, triggerPrice); }
export function cancelConditionalOrder(state: GameState, orderId: string): GameState { return cancelConditionalOrderImpl(state, orderId); }
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
export function calculateGrade(state: GameState): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' { const config = DIFFICULTY_CONFIGS[state.difficulty]; const ratio = getNetWorth(state) / (config.startingCash * config.goalMultiplier); if (ratio >= 3) return 'S'; if (ratio >= 1.5) return 'A'; if (ratio >= 1) return 'B'; if (ratio >= 0.75) return 'C'; if (ratio >= 0.5) return 'D'; return 'F'; }
export function checkGameOver(state: GameState): 'win' | 'lose' | 'ongoing' { if (!state.isGameOver) return 'ongoing'; const config = DIFFICULTY_CONFIGS[state.difficulty]; return getNetWorth(state) >= config.startingCash * config.goalMultiplier ? 'win' : 'lose'; }
export function tradeErrorMessage(reason: string): string { const messages: Record<string, string> = { insufficient_funds: 'Not enough cash for this trade', insufficient_shares: 'Not enough shares to sell', invalid_shares: 'Share count must be a positive whole number', invalid_target_price: 'Target price must be positive', max_limit_orders_reached: 'Maximum limit orders reached', short_disabled: 'Short selling is not available', no_position: 'No position to cover', stock_not_found: 'Stock not found' }; return messages[reason] || 'Trade failed'; }
