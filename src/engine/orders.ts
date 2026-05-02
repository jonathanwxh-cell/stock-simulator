import { DIFFICULTY_CONFIGS, calcBrokerFee } from './config';
import { deepCloneGameState } from './cloneState';
import { isPositiveCurrency, isPositiveWholeNumber, roundCurrency } from './financialMath';
import type { ConditionalOrder, GameState, LimitOrder, TradeResult, Transaction } from './types';

function getTradeStock(state: GameState, stockId: string) {
  const stock = state.stocks.find((entry) => entry.id === stockId);
  return !stock || !isPositiveCurrency(stock.currentPrice) ? null : stock;
}

function recordFee(state: GameState, fee: number, stockId: string) {
  if (fee <= 0) return;

  const roundedFee = roundCurrency(fee);
  state.totalFeesPaid = roundCurrency(state.totalFeesPaid + roundedFee);
  state.transactionHistory.push({
    id: `fee_${crypto.randomUUID()}`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: 'fee',
    shares: 0,
    price: 0,
    total: roundedFee,
    fee: roundedFee,
  });
}

function executeLimitOrder(state: GameState, order: LimitOrder): boolean {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const stock = getTradeStock(state, order.stockId);
  if (!stock) return true;

  const shouldExecute =
    (order.type === 'buy' && stock.currentPrice <= order.targetPrice) ||
    (order.type === 'sell' && stock.currentPrice >= order.targetPrice);
  if (!shouldExecute) return false;

  const total = roundCurrency(stock.currentPrice * order.shares);
  const fee = calcBrokerFee(total, config);

  if (order.type === 'buy') {
    if (state.cash >= total + fee) {
      state.cash = roundCurrency(state.cash - total - fee);
      recordFee(state, fee, order.stockId);
      const existing = state.portfolio[order.stockId];
      if (existing) {
        const totalShares = existing.shares + order.shares;
        existing.avgCost = roundCurrency(((existing.avgCost * existing.shares) + total) / totalShares);
        existing.shares = totalShares;
      } else {
        state.portfolio[order.stockId] = {
          stockId: order.stockId,
          shares: order.shares,
          avgCost: roundCurrency(stock.currentPrice),
        };
      }
      state.transactionHistory.push({
        id: `txn_${order.id}_exec`,
        date: new Date(state.currentDate),
        turn: state.currentTurn,
        stockId: order.stockId,
        type: 'limit_buy',
        shares: order.shares,
        price: roundCurrency(stock.currentPrice),
        total,
        fee,
      });
    }
    return true;
  }

  const position = state.portfolio[order.stockId];
  if (position && position.shares >= order.shares) {
    state.cash = roundCurrency(state.cash + total - fee);
    recordFee(state, fee, order.stockId);
    position.shares -= order.shares;
    if (position.shares === 0) delete state.portfolio[order.stockId];
    state.transactionHistory.push({
      id: `txn_${order.id}_exec`,
      date: new Date(state.currentDate),
      turn: state.currentTurn,
      stockId: order.stockId,
      type: 'limit_sell',
      shares: order.shares,
      price: roundCurrency(stock.currentPrice),
      total,
      fee,
    });
  }

  return true;
}

function executeConditionalOrder(state: GameState, order: ConditionalOrder): boolean {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const stock = getTradeStock(state, order.stockId);
  if (!stock) return true;

  const shouldExecute =
    (order.type === 'stop_loss' && stock.currentPrice <= order.triggerPrice) ||
    (order.type === 'take_profit' && stock.currentPrice >= order.triggerPrice);
  if (!shouldExecute) return false;

  const position = state.portfolio[order.stockId];
  if (!position || position.shares <= 0) return true;

  const sharesToSell = Math.min(position.shares, order.shares);
  if (sharesToSell <= 0) return true;

  const total = roundCurrency(stock.currentPrice * sharesToSell);
  const fee = calcBrokerFee(total, config);
  state.cash = roundCurrency(state.cash + total - fee);
  recordFee(state, fee, order.stockId);
  position.shares -= sharesToSell;
  if (position.shares === 0) delete state.portfolio[order.stockId];

  state.transactionHistory.push({
    id: `txn_${order.id}_exec`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId: order.stockId,
    type: order.type,
    shares: sharesToSell,
    price: roundCurrency(stock.currentPrice),
    total,
    fee,
  });

  return true;
}

function totalPendingOrders(state: GameState): number {
  return state.limitOrders.length + (state.conditionalOrders?.length || 0);
}

export function placeLimitOrder(
  state: GameState,
  stockId: string,
  type: 'buy' | 'sell',
  shares: number,
  targetPrice: number,
): TradeResult {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (totalPendingOrders(state) >= config.maxLimitOrders) {
    return { ok: false, reason: 'max_limit_orders_reached' };
  }
  if (!isPositiveCurrency(targetPrice)) return { ok: false, reason: 'invalid_target_price' };
  if (!isPositiveWholeNumber(shares)) return { ok: false, reason: 'invalid_shares' };

  const stock = getTradeStock(state, stockId);
  if (!stock) return { ok: false, reason: 'stock_not_found' };

  const position = state.portfolio[stockId];
  if (type === 'sell' && (!position || position.shares < shares)) {
    return { ok: false, reason: 'insufficient_shares' };
  }

  if (type === 'buy' && state.cash < roundCurrency(targetPrice * shares) + config.limitOrderFee) {
    return { ok: false, reason: 'insufficient_funds' };
  }

  const nextState = deepCloneGameState(state);
  const fee = roundCurrency(config.limitOrderFee);
  nextState.cash = roundCurrency(nextState.cash - fee);
  recordFee(nextState, fee, stockId);

  const order: LimitOrder = {
    id: `lo_${crypto.randomUUID()}`,
    stockId,
    type,
    shares,
    targetPrice: roundCurrency(targetPrice),
    placedTurn: state.currentTurn,
  };
  nextState.limitOrders.push(order);

  const transaction: Transaction = {
    id: `txn_${order.id}`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: type === 'buy' ? 'limit_buy' : 'limit_sell',
    shares,
    price: roundCurrency(targetPrice),
    total: fee,
    fee,
  };
  nextState.transactionHistory.push(transaction);
  nextState.updatedAt = new Date();

  return { ok: true, state: nextState, transaction };
}

export function cancelLimitOrder(state: GameState, orderId: string): GameState {
  const nextState = deepCloneGameState(state);
  nextState.limitOrders = nextState.limitOrders.filter((order) => order.id !== orderId);
  nextState.updatedAt = new Date();
  return nextState;
}

export function placeConditionalOrder(
  state: GameState,
  stockId: string,
  type: ConditionalOrder['type'],
  shares: number,
  triggerPrice: number,
): TradeResult {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (totalPendingOrders(state) >= config.maxLimitOrders) {
    return { ok: false, reason: 'max_limit_orders_reached' };
  }
  if (!isPositiveCurrency(triggerPrice)) return { ok: false, reason: 'invalid_target_price' };
  if (!isPositiveWholeNumber(shares)) return { ok: false, reason: 'invalid_shares' };

  const stock = getTradeStock(state, stockId);
  if (!stock) return { ok: false, reason: 'stock_not_found' };

  const position = state.portfolio[stockId];
  if (!position || position.shares <= 0) return { ok: false, reason: 'no_position' };
  if (position.shares < shares) return { ok: false, reason: 'insufficient_shares' };
  if (state.cash < config.limitOrderFee) return { ok: false, reason: 'insufficient_funds' };

  const nextState = deepCloneGameState(state);
  const fee = roundCurrency(config.limitOrderFee);
  nextState.cash = roundCurrency(nextState.cash - fee);
  recordFee(nextState, fee, stockId);

  const order: ConditionalOrder = {
    id: `co_${crypto.randomUUID()}`,
    stockId,
    type,
    shares,
    triggerPrice: roundCurrency(triggerPrice),
    placedTurn: state.currentTurn,
  };
  nextState.conditionalOrders = [...(nextState.conditionalOrders || []), order];
  nextState.updatedAt = new Date();

  return {
    ok: true,
    state: nextState,
    transaction: {
      id: `txn_${order.id}`,
      date: new Date(state.currentDate),
      turn: state.currentTurn,
      stockId,
      type,
      shares,
      price: roundCurrency(triggerPrice),
      total: 0,
      fee,
    },
  };
}

export function cancelConditionalOrder(state: GameState, orderId: string): GameState {
  const nextState = deepCloneGameState(state);
  nextState.conditionalOrders = (nextState.conditionalOrders || []).filter(
    (order) => order.id !== orderId,
  );
  nextState.updatedAt = new Date();
  return nextState;
}

export function applyPendingOrderSplitAdjustment(
  state: GameState,
  stockId: string,
  splitRatio: number,
) {
  for (const order of state.limitOrders) {
    if (order.stockId !== stockId) continue;
    order.shares *= splitRatio;
    order.targetPrice = roundCurrency(order.targetPrice / splitRatio);
  }

  for (const order of state.conditionalOrders || []) {
    if (order.stockId !== stockId) continue;
    order.shares *= splitRatio;
    order.triggerPrice = roundCurrency(order.triggerPrice / splitRatio);
  }
}

export function resolvePendingOrders(state: GameState): GameState {
  const nextState = deepCloneGameState(state);
  const consumedLimitIds = new Set<string>();
  const consumedConditionalIds = new Set<string>();

  for (const order of nextState.limitOrders) {
    if (executeLimitOrder(nextState, order)) {
      consumedLimitIds.add(order.id);
    }
  }

  for (const order of nextState.conditionalOrders || []) {
    if (executeConditionalOrder(nextState, order)) {
      consumedConditionalIds.add(order.id);
    }
  }

  nextState.limitOrders = nextState.limitOrders.filter((order) => !consumedLimitIds.has(order.id));
  nextState.conditionalOrders = (nextState.conditionalOrders || []).filter(
    (order) => !consumedConditionalIds.has(order.id),
  );
  nextState.updatedAt = new Date();

  return nextState;
}
