import { deepCloneGameState } from './cloneState';
import type { GameState, Stock } from './types';
import type { RNG } from './rng';
import { defaultRNG } from './rng';
import { DIFFICULTY_CONFIGS, SCENARIO_FREQUENCY_MAP, calcBrokerFee } from './config';
import { roundCurrency } from './financialMath';
import { generateScenario, generateNewsEvent } from './scenarioGenerator';
import { calculateGrade } from './gameState';

function genNewsId(): string {
  return `news_${crypto.randomUUID()}`;
}

export function simulateTurn(gameState: GameState, rng: RNG = defaultRNG): GameState {
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
  if (!newState.currentScenario && rng.next() < SCENARIO_FREQUENCY_MAP[config.scenarioFrequency]) {
    newState.currentScenario = generateScenario(newState, rng);
  }

  // 5. Generate news
  const numNews = rng.int(0, 2);
  for (let i = 0; i < numNews; i++) {
    const event = generateNewsEvent(newState, undefined, undefined, rng);
    event.id = genNewsId();
    newState.newsHistory.push(event);
  }

  // 6. Update stock prices
  for (const stock of newState.stocks) {
    const newPrice = calculateNewPrice(stock, newState, config.volatilityMultiplier, rng);
    stock.currentPrice = Math.max(1, roundCurrency(newPrice));
    stock.priceHistory.push({ turn: newState.currentTurn, price: stock.currentPrice });
  }

  // 7. Execute limit orders
  executeLimitOrders(newState);

  // 8. Stock splits (rare: ~2% chance per turn for any stock above $500)
  maybeStockSplit(newState, rng);

  // 9. Pay dividends quarterly
  if (currentDate.getMonth() % 3 === 0) payDividends(newState);

  // 10. Charge margin interest monthly
  chargeMarginInterest(newState);

  // 11. Margin call check
  checkMarginCall(newState);

  // 12. Snapshot
  const portfolioValue = getPortfolioValue(newState);
  const shortLiability = getShortLiability(newState);
  const netWorth = roundCurrency(newState.cash + portfolioValue - shortLiability);
  newState.netWorthHistory.push({
    turn: newState.currentTurn,
    date: new Date(currentDate),
    netWorth,
    cash: roundCurrency(newState.cash),
    portfolioValue: roundCurrency(portfolioValue),
    shortLiability: roundCurrency(shortLiability),
    marginUsed: roundCurrency(newState.marginUsed),
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
  } else if (netWorth <= 0) {
    newState.isGameOver = true;
    newState.finalGrade = 'F';
    newState.finalRank = getRankTitle('F');
  }

  newState.updatedAt = new Date();
  return newState;
}

function recordExecutionFee(state: GameState, fee: number, stockId: string) {
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

function executeLimitOrders(state: GameState) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const consumed: string[] = [];

  for (const order of state.limitOrders) {
    const stock = state.stocks.find(s => s.id === order.stockId);
    if (!stock || !Number.isFinite(stock.currentPrice) || stock.currentPrice <= 0) {
      consumed.push(order.id);
      continue;
    }

    let shouldExecute = false;
    if (order.type === 'buy' && stock.currentPrice <= order.targetPrice) shouldExecute = true;
    if (order.type === 'sell' && stock.currentPrice >= order.targetPrice) shouldExecute = true;

    if (!shouldExecute) continue;

    const total = roundCurrency(stock.currentPrice * order.shares);
    const fee = calcBrokerFee(total, config);

    if (order.type === 'buy') {
      if (state.cash >= total + fee) {
        state.cash = roundCurrency(state.cash - total - fee);
        recordExecutionFee(state, fee, order.stockId);
        const existing = state.portfolio[order.stockId];
        if (existing) {
          const ts = existing.shares + order.shares;
          existing.avgCost = roundCurrency(((existing.avgCost * existing.shares) + total) / ts);
          existing.shares = ts;
        } else {
          state.portfolio[order.stockId] = { stockId: order.stockId, shares: order.shares, avgCost: roundCurrency(stock.currentPrice) };
        }
        state.transactionHistory.push({
          id: `txn_${order.id}_exec`,
          date: new Date(state.currentDate), turn: state.currentTurn,
          stockId: order.stockId, type: 'limit_buy', shares: order.shares,
          price: roundCurrency(stock.currentPrice), total, fee,
        });
      }
      consumed.push(order.id);
    } else {
      const pos = state.portfolio[order.stockId];
      if (pos && pos.shares >= order.shares) {
        state.cash = roundCurrency(state.cash + total - fee);
        recordExecutionFee(state, fee, order.stockId);
        pos.shares -= order.shares;
        if (pos.shares === 0) delete state.portfolio[order.stockId];
        state.transactionHistory.push({
          id: `txn_${order.id}_exec`,
          date: new Date(state.currentDate), turn: state.currentTurn,
          stockId: order.stockId, type: 'limit_sell', shares: order.shares,
          price: roundCurrency(stock.currentPrice), total, fee,
        });
      }
      consumed.push(order.id);
    }
  }

  state.limitOrders = state.limitOrders.filter(o => !consumed.includes(o.id));
}

function maybeStockSplit(state: GameState, rng: RNG = defaultRNG) {
  if (rng.next() > 0.02) return;
  const eligible = state.stocks.filter(s => s.currentPrice >= 500);
  if (eligible.length === 0) return;

  const stock = rng.pick(eligible);
  const splitRatio = 2;
  stock.basePrice = roundCurrency(stock.basePrice / splitRatio);
  stock.currentPrice = roundCurrency(stock.currentPrice / splitRatio);
  stock.splitMultiplier *= splitRatio;

  // Adjust positions
  const pos = state.portfolio[stock.id];
  if (pos) {
    pos.shares *= splitRatio;
    pos.avgCost = roundCurrency(pos.avgCost / splitRatio);
  }

  // Adjust short positions
  const short = state.shortPositions[stock.id];
  if (short) {
    short.shares *= splitRatio;
    short.entryPrice = roundCurrency(short.entryPrice / splitRatio);
  }

  for (const order of state.limitOrders) {
    if (order.stockId !== stock.id) continue;
    order.shares *= splitRatio;
    order.targetPrice = roundCurrency(order.targetPrice / splitRatio);
  }

  state.transactionHistory.push({
    id: `split_${crypto.randomUUID()}`,
    date: new Date(state.currentDate), turn: state.currentTurn,
    stockId: stock.id, type: 'split', shares: splitRatio,
    price: roundCurrency(stock.currentPrice),
    total: 0, fee: 0,
  });
}

function payDividends(state: GameState) {
  for (const [stockId, position] of Object.entries(state.portfolio)) {
    if (position.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock || stock.dividendYield <= 0) continue;

    const quarterlyDiv = roundCurrency((stock.currentPrice * stock.dividendYield) / 4);
    const totalDividend = roundCurrency(quarterlyDiv * position.shares);
    state.cash = roundCurrency(state.cash + totalDividend);
    state.totalDividendsReceived = roundCurrency(state.totalDividendsReceived + totalDividend);

    state.transactionHistory.push({
      id: `div_${crypto.randomUUID()}`,
      date: new Date(state.currentDate), turn: state.currentTurn,
      stockId, type: 'dividend', shares: position.shares,
      price: quarterlyDiv,
      total: totalDividend, fee: 0,
    });
  }

  for (const [stockId, short] of Object.entries(state.shortPositions)) {
    if (short.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock || stock.dividendYield <= 0) continue;
    const quarterlyDiv = roundCurrency((stock.currentPrice * stock.dividendYield) / 4);
    const cost = roundCurrency(quarterlyDiv * short.shares);
    state.cash = roundCurrency(state.cash - cost);

    state.transactionHistory.push({
      id: `div_short_${crypto.randomUUID()}`,
      date: new Date(state.currentDate), turn: state.currentTurn,
      stockId, type: 'dividend', shares: short.shares,
      price: -quarterlyDiv,
      total: -cost, fee: 0,
    });
  }
}

function chargeMarginInterest(state: GameState) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const totalMargin = state.marginUsed;
  if (totalMargin <= 0) return;
  const interest = roundCurrency(totalMargin * config.marginInterestRate);
  state.cash = roundCurrency(state.cash - interest);
  state.totalFeesPaid = roundCurrency(state.totalFeesPaid + interest);
  state.transactionHistory.push({
    id: `margin_int_${crypto.randomUUID()}`,
    date: new Date(state.currentDate), turn: state.currentTurn,
    stockId: '__margin__', type: 'fee', shares: 0, price: 0,
    total: interest, fee: interest,
  });
}

export function checkMarginCall(state: GameState) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (state.marginUsed <= 0 && Object.keys(state.shortPositions).length === 0) return;

  for (const [stockId, short] of Object.entries(state.shortPositions)) {
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock) continue;

    const portfolioValue = getPortfolioValue(state);
    const shortLiability = getShortLiability(state);
    const equity = roundCurrency(state.cash + portfolioValue - shortLiability);
    const currentLiability = roundCurrency(stock.currentPrice * short.shares);
    const maintenanceReq = roundCurrency(currentLiability * config.marginMaintenance);
    if (equity < maintenanceReq) {
      const pnl = roundCurrency((short.entryPrice - stock.currentPrice) * short.shares);
      state.cash = roundCurrency(state.cash + short.marginUsed + pnl);
      state.marginUsed = roundCurrency(state.marginUsed - short.marginUsed);
      state.transactionHistory.push({
        id: `margin_call_${crypto.randomUUID()}`,
        date: new Date(state.currentDate), turn: state.currentTurn,
        stockId, type: 'margin_call', shares: short.shares,
        price: roundCurrency(stock.currentPrice),
        total: currentLiability, fee: 0,
      });
      delete state.shortPositions[stockId];
    }
  }
}

function calculateNewPrice(stock: Stock, state: GameState, volatilityMult: number, rng: RNG = defaultRNG): number {
  const prevPrice = stock.currentPrice;
  const meanReversionStrength = 0.03;
  const meanReversion = (stock.basePrice - prevPrice) * meanReversionStrength;
  const volatility = stock.volatility * volatilityMult;
  const betaAdj = stock.beta ? stock.beta * 0.3 : 0.3;
  const randomWalk = (rng.next() - 0.48) * volatility * prevPrice;

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
  return roundCurrency(total);
}

export function getShortLiability(state: GameState): number {
  let total = 0;
  for (const [stockId, short] of Object.entries(state.shortPositions)) {
    if (short.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (stock) total += stock.currentPrice * short.shares;
  }
  return roundCurrency(total);
}

export function getNetWorth(state: GameState): number {
  return roundCurrency(state.cash + getPortfolioValue(state) - getShortLiability(state));
}

function getRankTitle(grade: string | null): string {
  const titles: Record<string, string> = {
    S: 'Market Legend', A: 'Master Trader', B: 'Seasoned Investor',
    C: 'Apprentice Trader', D: 'Novice Investor', F: 'Market Casualty',
  };
  return titles[grade || 'F'] || 'Unknown';
}
