import type { GameState, Stock } from './types';
import { DIFFICULTY_CONFIGS, SCENARIO_FREQUENCY_MAP, calcBrokerFee } from './config';
import { generateScenario, generateNewsEvent } from './scenarioGenerator';
import { calculateGrade } from './gameState';

let nextNewsId = 1;
function genNewsId(): string {
  return `news_${nextNewsId++}_${Date.now()}`;
}

export function simulateTurn(gameState: GameState): GameState {
  const config = DIFFICULTY_CONFIGS[gameState.difficulty];
  const newState = deepCloneGameState(gameState);

  // 1. Increment turn
  newState.currentTurn += 1;

  // 2. Advance date by 1 month
  const currentDate = new Date(newState.currentDate);
  currentDate.setMonth(currentDate.getMonth() + 1);
  newState.currentDate = currentDate;

  // 3. Expire scenario
  if (newState.currentScenario) {
    newState.currentScenario.duration -= 1;
    if (newState.currentScenario.duration <= 0) newState.currentScenario = null;
  }

  // 4. Maybe start new scenario
  if (!newState.currentScenario && Math.random() < SCENARIO_FREQUENCY_MAP[config.scenarioFrequency]) {
    newState.currentScenario = generateScenario(newState);
  }

  // 5. Generate news
  const numNews = Math.floor(Math.random() * 3);
  for (let i = 0; i < numNews; i++) {
    const event = generateNewsEvent(newState);
    event.id = genNewsId();
    newState.newsHistory.push(event);
  }

  // 6. Update stock prices
  for (const stock of newState.stocks) {
    const newPrice = calculateNewPrice(stock, newState, config.volatilityMultiplier);
    stock.currentPrice = Math.max(1, Math.round(newPrice * 100) / 100);
    stock.priceHistory.push({ turn: newState.currentTurn, price: stock.currentPrice });
  }

  // 7. Execute limit orders
  executeLimitOrders(newState);

  // 8. Stock splits (rare: ~2% chance per turn for any stock above $500)
  maybeStockSplit(newState);

  // 9. Pay dividends quarterly
  if (currentDate.getMonth() % 3 === 0) payDividends(newState);

  // 10. Charge margin interest monthly
  chargeMarginInterest(newState);

  // 11. Margin call check
  checkMarginCall(newState);

  // 12. Snapshot
  const portfolioValue = getPortfolioValue(newState);
  const shortLiability = getShortLiability(newState);
  const netWorth = newState.cash + portfolioValue - shortLiability;
  newState.netWorthHistory.push({
    turn: newState.currentTurn,
    date: new Date(currentDate),
    netWorth: Math.round(netWorth * 100) / 100,
    cash: Math.round(newState.cash * 100) / 100,
    portfolioValue: Math.round(portfolioValue * 100) / 100,
    shortLiability: Math.round(shortLiability * 100) / 100,
    marginUsed: Math.round(newState.marginUsed * 100) / 100,
  });

  // 13. Check game over
  const goalAmount = config.startingCash * config.goalMultiplier;
  if (netWorth >= goalAmount) {
    newState.isGameOver = true;
    newState.finalGrade = calculateGrade(newState);
    newState.finalRank = getRankTitle(newState.finalGrade);
  } else if (newState.currentTurn >= config.turnLimit) {
    newState.isGameOver = true;
    newState.finalGrade = calculateGrade(newState);
    newState.finalRank = getRankTitle(newState.finalGrade);
  } else if (netWorth <= 0 && newState.cash <= 0) {
    newState.isGameOver = true;
    newState.finalGrade = 'F';
    newState.finalRank = getRankTitle('F');
  }

  newState.updatedAt = new Date();
  return newState;
}

function executeLimitOrders(state: GameState) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const executed: string[] = [];

  for (const order of state.limitOrders) {
    const stock = state.stocks.find(s => s.id === order.stockId);
    if (!stock) continue;

    let shouldExecute = false;
    if (order.type === 'buy' && stock.currentPrice <= order.targetPrice) shouldExecute = true;
    if (order.type === 'sell' && stock.currentPrice >= order.targetPrice) shouldExecute = true;

    if (!shouldExecute) continue;

    const total = stock.currentPrice * order.shares;
    const fee = calcBrokerFee(total, config);

    if (order.type === 'buy') {
      if (state.cash >= total + fee) {
        state.cash = Math.round((state.cash - total - fee) * 100) / 100;
        const existing = state.portfolio[order.stockId];
        if (existing) {
          const ts = existing.shares + order.shares;
          existing.avgCost = Math.round(((existing.avgCost * existing.shares) + total) / ts * 100) / 100;
          existing.shares = ts;
        } else {
          state.portfolio[order.stockId] = { stockId: order.stockId, shares: order.shares, avgCost: Math.round(stock.currentPrice * 100) / 100 };
        }
        state.transactionHistory.push({
          id: `txn_${order.id}_exec`,
          date: new Date(state.currentDate), turn: state.currentTurn,
          stockId: order.stockId, type: 'limit_buy', shares: order.shares,
          price: Math.round(stock.currentPrice * 100) / 100, total: Math.round(total * 100) / 100, fee,
        });
        executed.push(order.id);
      }
    } else {
      const pos = state.portfolio[order.stockId];
      if (pos && pos.shares >= order.shares) {
        state.cash = Math.round((state.cash + total - fee) * 100) / 100;
        pos.shares -= order.shares;
        if (pos.shares === 0) delete state.portfolio[order.stockId];
        state.transactionHistory.push({
          id: `txn_${order.id}_exec`,
          date: new Date(state.currentDate), turn: state.currentTurn,
          stockId: order.stockId, type: 'limit_sell', shares: order.shares,
          price: Math.round(stock.currentPrice * 100) / 100, total: Math.round(total * 100) / 100, fee,
        });
        executed.push(order.id);
      }
    }
  }

  state.limitOrders = state.limitOrders.filter(o => !executed.includes(o.id));
}

function maybeStockSplit(state: GameState) {
  if (Math.random() > 0.02) return;
  const eligible = state.stocks.filter(s => s.currentPrice >= 500);
  if (eligible.length === 0) return;

  const stock = eligible[Math.floor(Math.random() * eligible.length)];
  const splitRatio = 2;
  stock.basePrice = Math.round(stock.basePrice / splitRatio * 100) / 100;
  stock.currentPrice = Math.round(stock.currentPrice / splitRatio * 100) / 100;
  stock.splitMultiplier *= splitRatio;

  // Adjust positions
  const pos = state.portfolio[stock.id];
  if (pos) {
    pos.shares *= splitRatio;
    pos.avgCost = Math.round(pos.avgCost / splitRatio * 100) / 100;
  }

  // Adjust short positions
  const short = state.shortPositions[stock.id];
  if (short) {
    short.shares *= splitRatio;
    short.entryPrice = Math.round(short.entryPrice / splitRatio * 100) / 100;
  }

  state.transactionHistory.push({
    id: `split_${Date.now()}_${stock.id}`,
    date: new Date(state.currentDate), turn: state.currentTurn,
    stockId: stock.id, type: 'split', shares: splitRatio,
    price: Math.round(stock.currentPrice * 100) / 100,
    total: 0, fee: 0,
  });
}

function payDividends(state: GameState) {
  for (const [stockId, position] of Object.entries(state.portfolio)) {
    if (position.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock || stock.dividendYield <= 0) continue;

    const quarterlyDiv = (stock.currentPrice * stock.dividendYield) / 4;
    const totalDividend = quarterlyDiv * position.shares;
    state.cash += totalDividend;
    state.totalDividendsReceived = Math.round((state.totalDividendsReceived + totalDividend) * 100) / 100;

    state.transactionHistory.push({
      id: `div_${Date.now()}_${stockId}`,
      date: new Date(state.currentDate), turn: state.currentTurn,
      stockId, type: 'dividend', shares: position.shares,
      price: Math.round(quarterlyDiv * 100) / 100,
      total: Math.round(totalDividend * 100) / 100, fee: 0,
    });
  }

  // Short sellers pay dividends
  for (const [stockId, short] of Object.entries(state.shortPositions)) {
    if (short.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock || stock.dividendYield <= 0) continue;
    const quarterlyDiv = (stock.currentPrice * stock.dividendYield) / 4;
    const cost = quarterlyDiv * short.shares;
    state.cash -= cost;
    state.cash = Math.round(state.cash * 100) / 100;
  }
}

function chargeMarginInterest(state: GameState) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const totalMargin = state.marginUsed;
  if (totalMargin <= 0) return;
  const interest = Math.round(totalMargin * config.marginInterestRate * 100) / 100;
  state.cash -= interest;
  state.cash = Math.round(state.cash * 100) / 100;
  state.totalFeesPaid = Math.round((state.totalFeesPaid + interest) * 100) / 100;
  state.transactionHistory.push({
    id: `margin_int_${Date.now()}`,
    date: new Date(state.currentDate), turn: state.currentTurn,
    stockId: '__margin__', type: 'fee', shares: 0, price: 0,
    total: interest, fee: interest,
  });
}

function checkMarginCall(state: GameState) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (state.marginUsed <= 0 && Object.keys(state.shortPositions).length === 0) return;

  const portfolioValue = getPortfolioValue(state);
  const shortLiability = getShortLiability(state);
  const equity = state.cash + portfolioValue - shortLiability;

  for (const [stockId, short] of Object.entries(state.shortPositions)) {
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock) continue;
    const currentLiability = stock.currentPrice * short.shares;
    const maintenanceReq = currentLiability * config.shortMarginRequirement * config.marginMaintenance;
    if (equity < maintenanceReq) {
      // Force cover at loss
      const pnl = (short.entryPrice - stock.currentPrice) * short.shares;
      state.cash += short.marginUsed + pnl;
      state.cash = Math.round(state.cash * 100) / 100;
      state.marginUsed = Math.round((state.marginUsed - short.marginUsed) * 100) / 100;
      state.transactionHistory.push({
        id: `margin_call_${Date.now()}_${stockId}`,
        date: new Date(state.currentDate), turn: state.currentTurn,
        stockId, type: 'margin_call', shares: short.shares,
        price: Math.round(stock.currentPrice * 100) / 100,
        total: Math.round(currentLiability * 100) / 100, fee: 0,
      });
      delete state.shortPositions[stockId];
    }
  }
}

function calculateNewPrice(stock: Stock, state: GameState, volatilityMult: number): number {
  const prevPrice = stock.currentPrice;
  const meanReversionStrength = 0.03;
  const meanReversion = (stock.basePrice - prevPrice) * meanReversionStrength;
  const volatility = stock.volatility * volatilityMult;
  const betaAdj = stock.beta ? stock.beta * 0.3 : 0.3;
  const randomWalk = (Math.random() - 0.48) * volatility * prevPrice;

  let sectorEffect = 0;
  if (state.currentScenario) {
    const sm = state.currentScenario.sectorEffects[stock.sector];
    sectorEffect = (sm - 1.0) * prevPrice * 0.1;
  }

  let newsImpact = 0;
  for (const news of state.newsHistory) {
    if (news.turn === state.currentTurn && news.affectedStocks.includes(stock.id)) {
      const dir = news.impact === 'positive' ? 1 : news.impact === 'negative' ? -1 : 0;
      newsImpact += dir * news.magnitude * prevPrice * betaAdj;
    }
  }

  const drift = prevPrice * 0.002;
  return Math.max(0.01, prevPrice + meanReversion + randomWalk + sectorEffect + newsImpact + drift);
}

export function getPortfolioValue(state: GameState): number {
  let total = 0;
  for (const [stockId, position] of Object.entries(state.portfolio)) {
    if (position.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (stock) total += stock.currentPrice * position.shares;
  }
  return Math.round(total * 100) / 100;
}

export function getShortLiability(state: GameState): number {
  let total = 0;
  for (const [stockId, short] of Object.entries(state.shortPositions)) {
    if (short.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (stock) total += stock.currentPrice * short.shares;
  }
  return Math.round(total * 100) / 100;
}

export function getNetWorth(state: GameState): number {
  return Math.round((state.cash + getPortfolioValue(state) - getShortLiability(state)) * 100) / 100;
}

function getRankTitle(grade: string | null): string {
  const titles: Record<string, string> = {
    S: 'Market Legend', A: 'Master Trader', B: 'Seasoned Investor',
    C: 'Apprentice Trader', D: 'Novice Investor', F: 'Market Casualty',
  };
  return titles[grade || 'F'] || 'Unknown';
}

function deepCloneGameState(state: GameState): GameState {
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
