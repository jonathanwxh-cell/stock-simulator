import { addMonths } from 'date-fns';
import { deepCloneGameState } from './cloneState';
import type { GameState, Stock } from './types';
import type { RNG } from './rng';
import { defaultRNG } from './rng';
import { DIFFICULTY_CONFIGS, SCENARIO_FREQUENCY_MAP } from './config';
import { roundCurrency } from './financialMath';
import { generateDistinctNewsEvents, generateScenario } from './scenarioGenerator';
import { calculateGrade } from './gameState';
import { advanceRegime, getRegimeSectorMultiplier } from './regimeSystem';
import { simulateMarketIndex } from './marketIndex';
import { calculateRisk } from './riskSystem';
import { updateMission } from './missionSystem';
import { generateAdvisorFeedback } from './advisorSystem';
import { ensureUpcomingCatalysts, resolveDueCatalysts } from './catalystSystem';
import { applyPendingOrderSplitAdjustment, resolvePendingOrders } from './orders';
import { advanceMacroEnvironment, createInitialMacroEnvironment, getMacroStockDrift } from './macroSystem';
import { advanceCareerState } from './careerSystem';
import {
  getCareerSeasonGoal,
  getCareerSeasonTurn,
  getCareerSeasonTurnLimit,
  getSeasonBroadDriftPct,
  getSeasonScenarioChanceBonus,
  getSeasonSectorMultiplier,
  getSeasonVolatilityMultiplier,
} from './careerSeasons';

function genNewsId(): string { return `news_${crypto.randomUUID()}`; }

export function simulateTurn(gameState: GameState, rng: RNG = defaultRNG): GameState {
  const config = DIFFICULTY_CONFIGS[gameState.difficulty];
  const prevState = deepCloneGameState(gameState);
  let newState = deepCloneGameState(gameState);

  newState.currentTurn += 1;
  const currentDate = addMonths(new Date(newState.currentDate), 1);
  newState.currentDate = currentDate;

  newState.currentRegime = advanceRegime(newState.currentRegime, newState.currentTurn, rng);
  newState.macroEnvironment = advanceMacroEnvironment(
    newState.macroEnvironment || createInitialMacroEnvironment(),
    newState.currentTurn,
    rng,
  );
  newState.macroHistory = [...(newState.macroHistory || []), newState.macroEnvironment];

  if (newState.currentScenario) {
    newState.currentScenario.duration -= 1;
    if (newState.currentScenario.duration <= 0) newState.currentScenario = null;
  }
  const scenarioChance = Math.max(0, Math.min(0.8, SCENARIO_FREQUENCY_MAP[config.scenarioFrequency] + getSeasonScenarioChanceBonus(newState)));
  if (!newState.currentScenario && rng.next() < scenarioChance) {
    newState.currentScenario = generateScenario(newState, rng);
  }

  const catalystResolution = resolveDueCatalysts(newState, rng);
  newState.catalystCalendar = ensureUpcomingCatalysts(newState, catalystResolution.remainingCatalysts, rng);
  for (const event of catalystResolution.resolvedEvents) {
    newState.newsHistory.push(event);
  }

  const numNews = rng.int(0, 2);
  const freshNews = generateDistinctNewsEvents(newState, numNews, rng);
  for (const event of freshNews) {
    event.id = genNewsId();
    event.source = 'random';
    newState.newsHistory.push(event);
  }

  for (const stock of newState.stocks) {
    const newPrice = calculateNewPrice(stock, newState, config.volatilityMultiplier * getSeasonVolatilityMultiplier(newState), rng);
    stock.currentPrice = Math.max(1, roundCurrency(newPrice));
    stock.priceHistory.push({ turn: newState.currentTurn, price: stock.currentPrice });
  }

  newState = resolvePendingOrders(newState);
  maybeStockSplit(newState, rng);
  if (currentDate.getMonth() % 3 === 0) payDividends(newState);
  chargeMarginInterest(newState);
  checkMarginCall(newState);

  const indexSnapshot = simulateMarketIndex(prevState, newState, rng);
  newState.marketIndexHistory = [...(newState.marketIndexHistory || []), indexSnapshot];

  const riskSnapshot = calculateRisk(newState);
  newState.riskHistory = [...(newState.riskHistory || []), riskSnapshot];

  updateMission(prevState, newState, rng);

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

  newState.lastAdvisorFeedback = generateAdvisorFeedback(prevState, newState);
  newState.career = advanceCareerState(prevState, newState);

  const goalAmount = getCareerSeasonGoal(newState);
  const seasonTurn = getCareerSeasonTurn(newState);
  const seasonTurnLimit = getCareerSeasonTurnLimit(newState);
  if (netWorth >= goalAmount || seasonTurn >= seasonTurnLimit) {
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

function maybeStockSplit(state: GameState, rng: RNG = defaultRNG) {
  if (rng.next() > 0.02) return;
  const eligible = state.stocks.filter(s => s.currentPrice >= 500);
  if (eligible.length === 0) return;
  const stock = rng.pick(eligible);
  const splitRatio = 2;
  stock.basePrice = roundCurrency(stock.basePrice / splitRatio);
  stock.currentPrice = roundCurrency(stock.currentPrice / splitRatio);
  stock.splitMultiplier *= splitRatio;
  const pos = state.portfolio[stock.id];
  if (pos) { pos.shares *= splitRatio; pos.avgCost = roundCurrency(pos.avgCost / splitRatio); }
  const short = state.shortPositions[stock.id];
  if (short) { short.shares *= splitRatio; short.entryPrice = roundCurrency(short.entryPrice / splitRatio); }
  applyPendingOrderSplitAdjustment(state, stock.id, splitRatio);
  state.transactionHistory.push({ id: `split_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId: stock.id, type: 'split', shares: splitRatio, price: roundCurrency(stock.currentPrice), total: 0, fee: 0 });
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
    state.transactionHistory.push({ id: `div_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId, type: 'dividend', shares: position.shares, price: quarterlyDiv, total: totalDividend, fee: 0 });
  }
  for (const [stockId, short] of Object.entries(state.shortPositions)) {
    if (short.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock || stock.dividendYield <= 0) continue;
    const quarterlyDiv = roundCurrency((stock.currentPrice * stock.dividendYield) / 4);
    const cost = roundCurrency(quarterlyDiv * short.shares);
    state.cash = roundCurrency(state.cash - cost);
    state.transactionHistory.push({ id: `div_short_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId, type: 'dividend', shares: short.shares, price: -quarterlyDiv, total: -cost, fee: 0 });
  }
}

function chargeMarginInterest(state: GameState) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (state.marginUsed <= 0) return;
  const interest = roundCurrency(state.marginUsed * config.marginInterestRate);
  state.cash = roundCurrency(state.cash - interest);
  state.totalFeesPaid = roundCurrency(state.totalFeesPaid + interest);
  state.transactionHistory.push({ id: `margin_int_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId: '__margin__', type: 'fee', shares: 0, price: 0, total: interest, fee: interest });
}

export function checkMarginCall(state: GameState) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (state.marginUsed <= 0 && Object.keys(state.shortPositions).length === 0) return;
  for (const [stockId, short] of Object.entries(state.shortPositions)) {
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock) continue;
    const equity = roundCurrency(state.cash + getPortfolioValue(state) - getShortLiability(state));
    const currentLiability = roundCurrency(stock.currentPrice * short.shares);
    const maintenanceReq = roundCurrency(currentLiability * config.marginMaintenance);
    if (equity < maintenanceReq) {
      const pnl = roundCurrency((short.entryPrice - stock.currentPrice) * short.shares);
      state.cash = roundCurrency(state.cash + short.marginUsed + pnl);
      state.marginUsed = roundCurrency(state.marginUsed - short.marginUsed);
      state.transactionHistory.push({ id: `margin_call_${crypto.randomUUID()}`, date: new Date(state.currentDate), turn: state.currentTurn, stockId, type: 'margin_call', shares: short.shares, price: roundCurrency(stock.currentPrice), total: currentLiability, fee: 0 });
      delete state.shortPositions[stockId];
    }
  }
}

function calculateNewPrice(stock: Stock, state: GameState, volatilityMult: number, rng: RNG = defaultRNG): number {
  const prevPrice = stock.currentPrice;
  const regimeMultiplier = getRegimeSectorMultiplier(state.currentRegime, stock.sector);
  const regimeDrift = (regimeMultiplier - 1) * prevPrice * 0.25;
  const macroDrift = state.macroEnvironment ? getMacroStockDrift(stock, state.macroEnvironment) * prevPrice : 0;
  const meanReversion = (stock.basePrice - prevPrice) * 0.03;
  const volatility = stock.volatility * volatilityMult * (state.currentRegime?.volatilityMultiplier ?? 1);
  const betaAdj = stock.beta ? stock.beta * 0.3 : 0.3;
  const randomWalk = (rng.next() - 0.48) * volatility * prevPrice;
  let sectorEffect = 0;
  if (state.currentScenario) sectorEffect = ((state.currentScenario.sectorEffects[stock.sector] ?? 1) - 1) * prevPrice * 0.1;
  const seasonSectorEffect = (getSeasonSectorMultiplier(state, stock.sector) - 1) * prevPrice * 0.12;
  const seasonBroadDrift = getSeasonBroadDriftPct(state) * prevPrice;
  let newsImpact = 0;
  for (const news of state.newsHistory) if (news.turn === state.currentTurn && news.affectedStocks.includes(stock.id)) {
    const dir = news.impact === 'positive' ? 1 : news.impact === 'negative' ? -1 : 0;
    newsImpact += dir * news.magnitude * prevPrice * betaAdj;
  }
  const drift = prevPrice * 0.002;
  return Math.max(0.01, prevPrice + meanReversion + randomWalk + sectorEffect + seasonSectorEffect + seasonBroadDrift + regimeDrift + macroDrift + newsImpact + drift);
}

export function getPortfolioValue(state: GameState): number { let total = 0; for (const [stockId, position] of Object.entries(state.portfolio)) { if (position.shares <= 0) continue; const stock = state.stocks.find(s => s.id === stockId); if (stock) total += stock.currentPrice * position.shares; } return roundCurrency(total); }
export function getShortLiability(state: GameState): number { let total = 0; for (const [stockId, short] of Object.entries(state.shortPositions)) { if (short.shares <= 0) continue; const stock = state.stocks.find(s => s.id === stockId); if (stock) total += stock.currentPrice * short.shares; } return roundCurrency(total); }
export function getNetWorth(state: GameState): number { return roundCurrency(state.cash + getPortfolioValue(state) - getShortLiability(state)); }
function getRankTitle(grade: string | null): string { const titles: Record<string, string> = { S: 'Market Legend', A: 'Master Trader', B: 'Seasoned Investor', C: 'Apprentice Trader', D: 'Novice Investor', F: 'Market Casualty' }; return titles[grade || 'F'] || 'Unknown'; }
