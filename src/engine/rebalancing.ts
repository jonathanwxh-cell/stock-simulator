import { DIFFICULTY_CONFIGS, calcBrokerFee } from './config';
import { roundCurrency } from './financialMath';
import { executeBuy, executeCover, executeSell, executeShort } from './gameState';
import { getNetWorth } from './marketSimulator';
import { ALL_SECTORS } from './types';
import type {
  AllocationTarget,
  GameState,
  RebalanceMode,
  RebalancePreview,
  RebalanceTrade,
  Sector,
  Stock,
} from './types';

const CASH_TARGET_ID = 'cash';
const MARKET_CAP_RANK = { mega: 4, large: 3, mid: 2, small: 1 } as const;
const TRADE_PRIORITY: Record<RebalanceTrade['type'], number> = {
  sell: 0,
  cover: 1,
  buy: 2,
  short: 3,
};

function rankStocks(left: Stock, right: Stock) {
  const capDiff = MARKET_CAP_RANK[right.marketCap] - MARKET_CAP_RANK[left.marketCap];
  if (capDiff !== 0) return capDiff;
  const volatilityDiff = left.volatility - right.volatility;
  if (volatilityDiff !== 0) return volatilityDiff;
  return left.ticker.localeCompare(right.ticker);
}

function normalizeTargets(targets: AllocationTarget[]) {
  const byId = new Map<string, number>();
  for (const target of targets) {
    byId.set(target.id, roundCurrency((byId.get(target.id) || 0) + target.weight));
  }
  return byId;
}

function tradeFee(state: GameState, type: RebalanceTrade['type'], stock: Stock, shares: number) {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  if (shares <= 0) return 0;
  if (type === 'short') {
    const shortValue = roundCurrency(stock.currentPrice * shares);
    return calcBrokerFee(shortValue, config);
  }
  return calcBrokerFee(roundCurrency(stock.currentPrice * shares), config);
}

function appendTrade(
  trades: RebalanceTrade[],
  state: GameState,
  stock: Stock,
  type: RebalanceTrade['type'],
  shares: number,
  reason: string,
) {
  if (shares <= 0) return;
  const estimatedValue = roundCurrency(stock.currentPrice * shares);
  trades.push({
    stockId: stock.id,
    type,
    shares,
    estimatedValue,
    fee: tradeFee(state, type, stock, shares),
    reason,
  });
}

function desiredShares(weight: number, netWorth: number, price: number) {
  if (price <= 0) return 0;
  const absoluteDollarTarget = Math.abs((netWorth * weight) / 100);
  return Math.floor(absoluteDollarTarget / price);
}

function validateTargets(mode: RebalanceMode, state: GameState, targets: Map<string, number>) {
  const warnings: string[] = [];
  if (!targets.has(CASH_TARGET_ID)) {
    warnings.push('Rebalance targets must include a cash row.');
  } else if ((targets.get(CASH_TARGET_ID) || 0) < 0) {
    warnings.push('Rebalance cash target cannot be negative.');
  }

  const totalWeight = [...targets.values()].reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    warnings.push('Rebalance target weights must sum to 100%.');
  }

  for (const id of targets.keys()) {
    if (id === CASH_TARGET_ID) continue;
    if (mode === 'stock' && !state.stocks.some((stock) => stock.id === id)) {
      warnings.push(`Unknown stock target: ${id}.`);
    }
    if (mode === 'sector' && !ALL_SECTORS.includes(id as Sector)) {
      warnings.push(`Unknown sector target: ${id}.`);
    }
  }

  return warnings;
}

function currentStockIds(state: GameState, targets: Map<string, number>) {
  return [...new Set([
    ...Object.keys(state.portfolio),
    ...Object.keys(state.shortPositions),
    ...[...targets.keys()].filter((id) => id !== CASH_TARGET_ID),
  ])].sort();
}

function addRoundingWarning(
  warnings: Set<string>,
  label: string,
  weight: number,
  netWorth: number,
  price: number,
) {
  if (weight === 0 || price <= 0) return;
  const rawShares = Math.abs((netWorth * weight) / 100) / price;
  if (rawShares > 0 && rawShares < 1) {
    warnings.add(`${label} target rounds below one whole share at the current price.`);
  } else if (Math.abs(rawShares - Math.floor(rawShares)) > 0.0001) {
    warnings.add(`${label} target was rounded to whole shares.`);
  }
}

function buildStockModeTrades(
  state: GameState,
  targets: Map<string, number>,
  netWorth: number,
) {
  const trades: RebalanceTrade[] = [];
  const warnings = new Set<string>();

  for (const stockId of currentStockIds(state, targets)) {
    const stock = state.stocks.find((entry) => entry.id === stockId);
    if (!stock) continue;

    const weight = targets.get(stockId) || 0;
    addRoundingWarning(warnings, stock.ticker, weight, netWorth, stock.currentPrice);

    const currentLongShares = state.portfolio[stockId]?.shares || 0;
    const currentShortShares = state.shortPositions[stockId]?.shares || 0;
    const longTargetShares = weight > 0 ? desiredShares(weight, netWorth, stock.currentPrice) : 0;
    const shortTargetShares = weight < 0 ? desiredShares(weight, netWorth, stock.currentPrice) : 0;

    appendTrade(trades, state, stock, 'sell', Math.max(0, currentLongShares - longTargetShares), `Reduce ${stock.ticker} toward target.`);
    appendTrade(trades, state, stock, 'cover', Math.max(0, currentShortShares - shortTargetShares), `Cover ${stock.ticker} toward target.`);
    appendTrade(trades, state, stock, 'buy', Math.max(0, longTargetShares - currentLongShares), `Increase ${stock.ticker} toward target.`);
    appendTrade(trades, state, stock, 'short', Math.max(0, shortTargetShares - currentShortShares), `Increase ${stock.ticker} short exposure toward target.`);
  }

  return { trades, warnings: [...warnings] };
}

function sortPositionsByValue<T extends { stock: Stock; shares: number }>(positions: T[]) {
  return [...positions].sort((left, right) => {
    const valueDiff = (right.stock.currentPrice * right.shares) - (left.stock.currentPrice * left.shares);
    if (valueDiff !== 0) return valueDiff;
    return rankStocks(left.stock, right.stock);
  });
}

function sectorExistingStocks(
  state: GameState,
  sector: Sector,
  kind: 'long' | 'short',
) {
  const matchesSector = (entry: { stock?: Stock; shares: number }): entry is { stock: Stock; shares: number } => {
    if (!entry.stock) return false;
    return entry.stock.sector === sector && entry.shares > 0;
  };

  if (kind === 'long') {
    return sortPositionsByValue(
      Object.entries(state.portfolio)
        .map(([stockId, position]) => ({
          stock: state.stocks.find((entry) => entry.id === stockId),
          shares: position.shares,
        }))
        .filter(matchesSector),
    );
  }

  return sortPositionsByValue(
    Object.entries(state.shortPositions)
      .map(([stockId, position]) => ({
        stock: state.stocks.find((entry) => entry.id === stockId),
        shares: position.shares,
      }))
      .filter(matchesSector),
  );
}

function sectorProxy(state: GameState, sector: Sector) {
  return [...state.stocks]
    .filter((stock) => stock.sector === sector)
    .sort(rankStocks)[0] || null;
}

function allocateResidualToStockList(
  trades: RebalanceTrade[],
  state: GameState,
  stocks: Stock[],
  type: 'buy' | 'short',
  shares: number,
  reason: string,
) {
  if (shares <= 0 || stocks.length === 0) return;
  appendTrade(trades, state, stocks[0], type, shares, reason);
}

function buildSectorModeTrades(
  state: GameState,
  targets: Map<string, number>,
  netWorth: number,
) {
  const trades: RebalanceTrade[] = [];
  const warnings = new Set<string>();
  const sectorIds = [...new Set([
    ...ALL_SECTORS.filter((sector) => targets.has(sector)),
    ...state.stocks
      .filter((stock) => state.portfolio[stock.id]?.shares || state.shortPositions[stock.id]?.shares)
      .map((stock) => stock.sector),
  ])].sort();

  for (const sector of sectorIds) {
    const weight = targets.get(sector) || 0;
    const longs = sectorExistingStocks(state, sector, 'long');
    const shorts = sectorExistingStocks(state, sector, 'short');
    const longExposure = longs.reduce((sum, entry) => sum + (entry.stock.currentPrice * entry.shares), 0);
    const shortExposure = shorts.reduce((sum, entry) => sum + (entry.stock.currentPrice * entry.shares), 0);

    const proxy = sectorProxy(state, sector);
    if (proxy) addRoundingWarning(warnings, `${sector} sector`, weight, netWorth, proxy.currentPrice);

    if (weight >= 0) {
      for (const entry of shorts) {
        appendTrade(trades, state, entry.stock, 'cover', entry.shares, `Close ${entry.stock.ticker} short before rebalancing ${sector}.`);
      }

      const desiredLongShares = proxy ? desiredShares(weight, netWorth, proxy.currentPrice) : 0;
      const currentLongShares = longs.reduce((sum, entry) => sum + entry.shares, 0);
      const currentLongValue = longExposure;
      const desiredLongValue = roundCurrency((netWorth * weight) / 100);

      if (currentLongValue > desiredLongValue) {
        let reductionValue = currentLongValue - desiredLongValue;
        for (const entry of longs) {
          if (reductionValue <= 0) break;
          const stockValue = entry.stock.currentPrice * entry.shares;
          const shares = Math.min(entry.shares, Math.ceil(reductionValue / entry.stock.currentPrice));
          appendTrade(trades, state, entry.stock, 'sell', shares, `Trim ${entry.stock.ticker} to lower ${sector} exposure.`);
          reductionValue = Math.max(0, reductionValue - Math.min(stockValue, shares * entry.stock.currentPrice));
        }
      } else if (desiredLongValue > currentLongValue) {
        const existingLongs = [...new Set(longs.map((entry) => entry.stock).filter((stock): stock is Stock => Boolean(stock)))].sort(rankStocks);
        const residualShares = desiredLongShares - currentLongShares;
        allocateResidualToStockList(
          trades,
          state,
          existingLongs.length > 0 ? existingLongs : proxy ? [proxy] : [],
          'buy',
          residualShares,
          `Raise ${sector} exposure toward target.`,
        );
      }
    } else {
      for (const entry of longs) {
        appendTrade(trades, state, entry.stock, 'sell', entry.shares, `Close ${entry.stock.ticker} long before rebalancing ${sector}.`);
      }

      const desiredShortShares = proxy ? desiredShares(weight, netWorth, proxy.currentPrice) : 0;
      const currentShortShares = shorts.reduce((sum, entry) => sum + entry.shares, 0);
      const desiredShortValue = roundCurrency(Math.abs((netWorth * weight) / 100));

      if (shortExposure > desiredShortValue) {
        let reductionValue = shortExposure - desiredShortValue;
        for (const entry of shorts) {
          if (reductionValue <= 0) break;
          const shares = Math.min(entry.shares, Math.ceil(reductionValue / entry.stock.currentPrice));
          appendTrade(trades, state, entry.stock, 'cover', shares, `Reduce ${entry.stock.ticker} short to lower ${sector} exposure.`);
          reductionValue = Math.max(0, reductionValue - (shares * entry.stock.currentPrice));
        }
      } else if (desiredShortValue > shortExposure) {
        const existingShorts = [...new Set(shorts.map((entry) => entry.stock).filter((stock): stock is Stock => Boolean(stock)))].sort(rankStocks);
        const residualShares = desiredShortShares - currentShortShares;
        allocateResidualToStockList(
          trades,
          state,
          existingShorts.length > 0 ? existingShorts : proxy ? [proxy] : [],
          'short',
          residualShares,
          `Raise ${sector} short exposure toward target.`,
        );
      }
    }
  }

  return { trades, warnings: [...warnings] };
}

function estimateCashAfter(state: GameState, preview: RebalancePreview) {
  const executed = executeRebalancePreview(state, preview);
  return roundCurrency(executed.cash);
}

export function buildRebalancePreview(
  state: GameState,
  mode: RebalanceMode,
  targets: AllocationTarget[],
): RebalancePreview {
  const normalizedTargets = normalizeTargets(targets);
  const validationWarnings = validateTargets(mode, state, normalizedTargets);
  const totalBasis = getNetWorth(state);

  if (
    validationWarnings.some((warning) => warning.includes('cash row')) ||
    validationWarnings.some((warning) => warning.includes('cash target')) ||
    validationWarnings.some((warning) => warning.includes('100%'))
  ) {
    return {
      mode,
      totalBasis,
      cashAfter: roundCurrency(state.cash),
      trades: [],
      warnings: validationWarnings,
    };
  }

  const built = mode === 'stock'
    ? buildStockModeTrades(state, normalizedTargets, totalBasis)
    : buildSectorModeTrades(state, normalizedTargets, totalBasis);

  const trades = built.trades.sort((left, right) => {
    const priorityDiff = TRADE_PRIORITY[left.type] - TRADE_PRIORITY[right.type];
    if (priorityDiff !== 0) return priorityDiff;
    if (left.stockId !== right.stockId) return left.stockId.localeCompare(right.stockId);
    return left.reason.localeCompare(right.reason);
  });

  const preview: RebalancePreview = {
    mode,
    totalBasis,
    cashAfter: roundCurrency(state.cash),
    trades,
    warnings: [...validationWarnings, ...built.warnings],
  };
  preview.cashAfter = estimateCashAfter(state, preview);
  return preview;
}

export function executeRebalancePreview(state: GameState, preview: RebalancePreview): GameState {
  let nextState = state;

  for (const trade of preview.trades) {
    const result =
      trade.type === 'sell'
        ? executeSell(nextState, trade.stockId, trade.shares)
        : trade.type === 'cover'
        ? executeCover(nextState, trade.stockId, trade.shares)
        : trade.type === 'buy'
        ? executeBuy(nextState, trade.stockId, trade.shares)
        : executeShort(nextState, trade.stockId, trade.shares);

    if (!result.ok) return nextState;
    nextState = result.state;
  }

  return nextState;
}
