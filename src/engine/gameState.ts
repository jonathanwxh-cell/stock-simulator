import type { GameState, Difficulty, Transaction, LimitOrder } from './types';
import { DIFFICULTY_CONFIGS, calcBrokerFee } from './config';
import { cloneInitialStocks } from './stockData';
import { getPortfolioValue, getNetWorth, getShortLiability } from './marketSimulator';

export { getPortfolioValue, getNetWorth, getShortLiability };

export function createNewGame(playerName: string, difficulty: Difficulty): GameState {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const now = new Date();
  const startDate = new Date(2024, 0, 1);

  return {
    saveSlot: 'auto',
    playerName: playerName || 'Trader',
    difficulty,
    currentTurn: 0,
    currentDate: startDate,
    cash: config.startingCash,
    portfolio: {},
    shortPositions: {},
    limitOrders: [],
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
    stocks: cloneInitialStocks(),
    newsHistory: [],
    currentScenario: null,
    isGameOver: false,
    finalRank: null,
    finalGrade: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function canBuy(state: GameState, stockId: string, shares: number): boolean {
  if (shares <= 0) return false;
  const stock = state.stocks.find(s => s.id === stockId);
  if (!stock) return false;
  const cost = stock.currentPrice * shares;
  const fee = calcBrokerFee(cost, DIFFICULTY_CONFIGS[state.difficulty]);
  return state.cash >= cost + fee;
}

export function canSell(state: GameState, stockId: string, shares: number): boolean {
  if (shares <= 0) return false;
  const position = state.portfolio[stockId];
  if (!position) return false;
  return position.shares >= shares;
}

export function canShort(state: GameState, stockId: string, shares: number): boolean {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (!config.shortEnabled) return false;
  if (shares <= 0) return false;
  const stock = state.stocks.find(s => s.id === stockId);
  if (!stock) return false;
  const proceeds = stock.currentPrice * shares;
  const marginReq = proceeds * config.shortMarginRequirement;
  const fee = calcBrokerFee(proceeds, config);
  return state.cash >= marginReq + fee;
}

export function canCover(state: GameState, stockId: string, shares: number): boolean {
  if (shares <= 0) return false;
  const pos = state.shortPositions[stockId];
  if (!pos) return false;
  if (pos.shares < shares) return false;
  const stock = state.stocks.find(s => s.id === stockId);
  if (!stock) return false;
  const cost = stock.currentPrice * shares;
  const fee = calcBrokerFee(cost, DIFFICULTY_CONFIGS[state.difficulty]);
  return state.cash >= cost + fee;
}

function recordFee(newState: GameState, fee: number, stockId: string) {
  newState.totalFeesPaid = Math.round((newState.totalFeesPaid + fee) * 100) / 100;
  newState.transactionHistory.push({
    id: `fee_${Date.now()}_${stockId}`,
    date: new Date(newState.currentDate),
    turn: newState.currentTurn,
    stockId,
    type: 'fee',
    shares: 0,
    price: 0,
    total: fee,
    fee: fee,
  });
}

export function executeBuy(
  state: GameState,
  stockId: string,
  shares: number,
): { state: GameState; transaction: Transaction } {
  if (!canBuy(state, stockId, shares)) {
    throw new Error('Insufficient funds');
  }
  const stock = state.stocks.find(s => s.id === stockId)!;
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const totalCost = stock.currentPrice * shares;
  const fee = calcBrokerFee(totalCost, config);
  const newState = deepClone(state);

  newState.cash -= (totalCost + fee);
  newState.cash = Math.round(newState.cash * 100) / 100;
  recordFee(newState, fee, stockId);

  const existing = newState.portfolio[stockId];
  if (existing) {
    const totalShares = existing.shares + shares;
    const totalCostBasis = (existing.avgCost * existing.shares) + totalCost;
    existing.shares = totalShares;
    existing.avgCost = Math.round((totalCostBasis / totalShares) * 100) / 100;
  } else {
    newState.portfolio[stockId] = {
      stockId,
      shares,
      avgCost: Math.round(stock.currentPrice * 100) / 100,
    };
  }

  const transaction: Transaction = {
    id: `txn_${Date.now()}_${stockId}_buy`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: 'buy',
    shares,
    price: Math.round(stock.currentPrice * 100) / 100,
    total: Math.round(totalCost * 100) / 100,
    fee,
  };
  newState.transactionHistory.push(transaction);
  newState.updatedAt = new Date();
  return { state: newState, transaction };
}

export function executeSell(
  state: GameState,
  stockId: string,
  shares: number,
): { state: GameState; transaction: Transaction } {
  if (!canSell(state, stockId, shares)) {
    throw new Error('Insufficient shares');
  }
  const stock = state.stocks.find(s => s.id === stockId)!;
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const totalProceeds = stock.currentPrice * shares;
  const fee = calcBrokerFee(totalProceeds, config);
  const newState = deepClone(state);

  newState.cash += totalProceeds - fee;
  newState.cash = Math.round(newState.cash * 100) / 100;
  recordFee(newState, fee, stockId);

  const position = newState.portfolio[stockId];
  position.shares -= shares;
  if (position.shares === 0) delete newState.portfolio[stockId];

  const transaction: Transaction = {
    id: `txn_${Date.now()}_${stockId}_sell`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: 'sell',
    shares,
    price: Math.round(stock.currentPrice * 100) / 100,
    total: Math.round(totalProceeds * 100) / 100,
    fee,
  };
  newState.transactionHistory.push(transaction);
  newState.updatedAt = new Date();
  return { state: newState, transaction };
}

export function executeShort(
  state: GameState,
  stockId: string,
  shares: number,
): { state: GameState; transaction: Transaction } {
  if (!canShort(state, stockId, shares)) throw new Error('Cannot short');
  const stock = state.stocks.find(s => s.id === stockId)!;
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const proceeds = stock.currentPrice * shares;
  const marginReq = proceeds * config.shortMarginRequirement;
  const fee = calcBrokerFee(proceeds, config);
  const newState = deepClone(state);

  newState.cash -= (marginReq + fee);
  newState.cash = Math.round(newState.cash * 100) / 100;
  newState.marginUsed = Math.round((newState.marginUsed + marginReq) * 100) / 100;
  recordFee(newState, fee, stockId);

  const existing = newState.shortPositions[stockId];
  if (existing) {
    const totalShares = existing.shares + shares;
    const avgEntry = ((existing.entryPrice * existing.shares) + (stock.currentPrice * shares)) / totalShares;
    existing.shares = totalShares;
    existing.entryPrice = Math.round(avgEntry * 100) / 100;
    existing.marginUsed = Math.round((existing.marginUsed + marginReq) * 100) / 100;
  } else {
    newState.shortPositions[stockId] = {
      stockId,
      shares,
      entryPrice: Math.round(stock.currentPrice * 100) / 100,
      marginUsed: marginReq,
    };
  }

  const transaction: Transaction = {
    id: `txn_${Date.now()}_${stockId}_short`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: 'short',
    shares,
    price: Math.round(stock.currentPrice * 100) / 100,
    total: Math.round(proceeds * 100) / 100,
    fee,
  };
  newState.transactionHistory.push(transaction);
  newState.updatedAt = new Date();
  return { state: newState, transaction };
}

export function executeCover(
  state: GameState,
  stockId: string,
  shares: number,
): { state: GameState; transaction: Transaction } {
  if (!canCover(state, stockId, shares)) throw new Error('Cannot cover');
  const stock = state.stocks.find(s => s.id === stockId)!;
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const coverCost = stock.currentPrice * shares;
  const fee = calcBrokerFee(coverCost, config);
  const newState = deepClone(state);

  const pos = newState.shortPositions[stockId];
  const marginRelease = (pos.marginUsed / pos.shares) * shares;

  newState.cash += marginRelease - coverCost - fee;
  newState.cash = Math.round(newState.cash * 100) / 100;
  newState.marginUsed = Math.round((newState.marginUsed - marginRelease) * 100) / 100;
  recordFee(newState, fee, stockId);

  pos.shares -= shares;
  pos.marginUsed = Math.round((pos.marginUsed - marginRelease) * 100) / 100;
  if (pos.shares <= 0) delete newState.shortPositions[stockId];

  // PnL reflected in margin release vs cover cost

  const transaction: Transaction = {
    id: `txn_${Date.now()}_${stockId}_cover`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: 'cover',
    shares,
    price: Math.round(stock.currentPrice * 100) / 100,
    total: Math.round(coverCost * 100) / 100,
    fee,
  };
  newState.transactionHistory.push(transaction);
  newState.updatedAt = new Date();
  return { state: newState, transaction };
}

export function placeLimitOrder(
  state: GameState,
  stockId: string,
  type: 'buy' | 'sell',
  shares: number,
  targetPrice: number,
): { state: GameState; transaction: Transaction } {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (state.limitOrders.length >= config.maxLimitOrders) throw new Error('Max limit orders reached');
  if (type === 'sell' && !canSell(state, stockId, shares)) throw new Error('Insufficient shares');
  if (type === 'buy') {
    const cost = targetPrice * shares;
    if (state.cash < cost + config.limitOrderFee) throw new Error('Insufficient funds');
  }

  const newState = deepClone(state);
  const fee = config.limitOrderFee;
  newState.cash = Math.round((newState.cash - fee) * 100) / 100;
  recordFee(newState, fee, stockId);

  const order: LimitOrder = {
    id: `lo_${Date.now()}_${stockId}`,
    stockId,
    type,
    shares,
    targetPrice,
    placedTurn: state.currentTurn,
  };
  newState.limitOrders.push(order);

  const transaction: Transaction = {
    id: `txn_${order.id}`,
    date: new Date(state.currentDate),
    turn: state.currentTurn,
    stockId,
    type: type === 'buy' ? 'limit_buy' : 'limit_sell',
    shares,
    price: targetPrice,
    total: fee,
    fee,
  };
  newState.transactionHistory.push(transaction);
  newState.updatedAt = new Date();
  return { state: newState, transaction };
}

export function cancelLimitOrder(state: GameState, orderId: string): GameState {
  const newState = deepClone(state);
  newState.limitOrders = newState.limitOrders.filter(o => o.id !== orderId);
  newState.updatedAt = new Date();
  return newState;
}

export function calculateGrade(state: GameState): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const goalAmount = config.startingCash * config.goalMultiplier;
  const netWorth = getNetWorth(state);
  const ratio = netWorth / goalAmount;

  if (ratio >= 3.0) return 'S';
  if (ratio >= 1.5) return 'A';
  if (ratio >= 1.0) return 'B';
  if (ratio >= 0.75) return 'C';
  if (ratio >= 0.5) return 'D';
  return 'F';
}

export function checkGameOver(state: GameState): 'win' | 'lose' | 'ongoing' {
  if (!state.isGameOver) return 'ongoing';
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const goalAmount = config.startingCash * config.goalMultiplier;
  if (getNetWorth(state) >= goalAmount) return 'win';
  return 'lose';
}

function deepClone(state: GameState): GameState {
  return {
    ...state,
    currentDate: new Date(state.currentDate),
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
    stocks: state.stocks.map(s => ({ ...s, priceHistory: s.priceHistory.map(p => ({ ...p })) })),
    portfolio: Object.fromEntries(Object.entries(state.portfolio).map(([k, v]) => [k, { ...v }])),
    shortPositions: Object.fromEntries(Object.entries(state.shortPositions).map(([k, v]) => [k, { ...v }])),
    limitOrders: state.limitOrders.map(o => ({ ...o })),
    transactionHistory: state.transactionHistory.map(t => ({ ...t, date: new Date(t.date) })),
    netWorthHistory: state.netWorthHistory.map(n => ({ ...n, date: new Date(n.date) })),
    newsHistory: state.newsHistory.map(n => ({ ...n, date: new Date(n.date) })),
    currentScenario: state.currentScenario ? {
      ...state.currentScenario,
      sectorEffects: { ...state.currentScenario.sectorEffects },
      events: state.currentScenario.events.map(e => ({ ...e, date: new Date(e.date) })),
    } : null,
  };
}
