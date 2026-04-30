import type { GameState, RiskLevel, RiskSnapshot, Sector } from './types';
import { roundCurrency } from './financialMath';

function riskLevel(score: number): RiskLevel {
  if (score >= 75) return 'extreme';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function portfolioValue(state: GameState): number {
  return roundCurrency(Object.entries(state.portfolio).reduce((sum, [stockId, pos]) => {
    const stock = state.stocks.find(s => s.id === stockId);
    return sum + (stock && pos.shares > 0 ? stock.currentPrice * pos.shares : 0);
  }, 0));
}

function shortLiability(state: GameState): number {
  return roundCurrency(Object.entries(state.shortPositions).reduce((sum, [stockId, pos]) => {
    const stock = state.stocks.find(s => s.id === stockId);
    return sum + (stock && pos.shares > 0 ? stock.currentPrice * pos.shares : 0);
  }, 0));
}

function netWorth(state: GameState): number {
  return roundCurrency(state.cash + portfolioValue(state) - shortLiability(state));
}

export function calculateRisk(state: GameState): RiskSnapshot {
  const nw = Math.max(netWorth(state), 1);
  const longs = portfolioValue(state);
  const shorts = shortLiability(state);
  const totalExposure = Math.max(longs + shorts, 0);
  const exposureRatio = totalExposure / nw;
  const meaningfulExposure = exposureRatio > 0.2;
  const exposureScale = Math.min(1, exposureRatio / 0.7);
  const warnings: string[] = [];

  let largestPosition = 0;
  const sectorValues: Partial<Record<Sector, number>> = {};
  for (const [stockId, pos] of Object.entries(state.portfolio)) {
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock || pos.shares <= 0) continue;
    const value = stock.currentPrice * pos.shares;
    largestPosition = Math.max(largestPosition, value);
    sectorValues[stock.sector] = (sectorValues[stock.sector] ?? 0) + value;
  }
  for (const [stockId, pos] of Object.entries(state.shortPositions)) {
    const stock = state.stocks.find(s => s.id === stockId);
    if (!stock || pos.shares <= 0) continue;
    const value = stock.currentPrice * pos.shares;
    largestPosition = Math.max(largestPosition, value);
    sectorValues[stock.sector] = (sectorValues[stock.sector] ?? 0) + value;
  }

  const largestSectorValue = Math.max(0, ...Object.values(sectorValues));
  const concentrationByExposure = totalExposure > 0 ? largestPosition / totalExposure : 0;
  const sectorByExposure = totalExposure > 0 ? largestSectorValue / totalExposure : 0;
  const largestPositionToNw = largestPosition / nw;
  const largestSectorToNw = largestSectorValue / nw;
  const cashRatio = state.cash / nw;
  const shortRatio = shorts / nw;
  const peak = Math.max(...state.netWorthHistory.map(s => s.netWorth), nw);
  const drawdown = peak > 0 ? Math.max(0, (peak - nw) / peak) : 0;

  let scoreFloor = 0;
  if (meaningfulExposure && largestPositionToNw > 0.25) {
    warnings.push('Single-stock concentration is above 25% of net worth.');
    scoreFloor = Math.max(scoreFloor, 25);
  }
  if (meaningfulExposure && largestPositionToNw > 0.5) scoreFloor = Math.max(scoreFloor, 45);
  if (meaningfulExposure && largestPositionToNw > 0.7) scoreFloor = Math.max(scoreFloor, 60);
  if (meaningfulExposure && sectorByExposure > 0.5) {
    warnings.push('One sector is more than 50% of invested exposure.');
    scoreFloor = Math.max(scoreFloor, 25);
  }
  if (cashRatio < 0.1) {
    warnings.push('Cash buffer is below 10%.');
    scoreFloor = Math.max(scoreFloor, 35);
  }
  if (shortRatio > 0.2) {
    warnings.push('Short exposure is above 20% of net worth.');
    scoreFloor = Math.max(scoreFloor, 40);
  }
  if (drawdown > 0.1) {
    warnings.push('Drawdown exceeds 10%.');
    scoreFloor = Math.max(scoreFloor, 30);
  }

  const concentrationScore = clampScore(concentrationByExposure * exposureScale * 70 + Math.max(0, largestPositionToNw - 0.25) * 70);
  const sectorScore = clampScore(sectorByExposure * exposureScale * 50 + Math.max(0, largestSectorToNw - 0.5) * 50);
  const cashBufferScore = clampScore(totalExposure <= 0 ? 0 : cashRatio < 0.1 ? 75 : cashRatio < 0.2 ? 40 : cashRatio < 0.35 ? 15 : 3);
  const shortExposureScore = clampScore(shortRatio * 190);
  const drawdownScore = clampScore(drawdown * 320);
  const weightedScore = clampScore(concentrationScore * 0.34 + sectorScore * 0.22 + cashBufferScore * 0.1 + shortExposureScore * 0.2 + drawdownScore * 0.14);
  const totalScore = clampScore(Math.max(weightedScore, scoreFloor));

  return {
    turn: state.currentTurn,
    totalScore,
    level: riskLevel(totalScore),
    concentrationScore,
    sectorScore,
    cashBufferScore,
    shortExposureScore,
    drawdownScore,
    warnings,
  };
}

export function getLatestRisk(state: GameState): RiskSnapshot {
  return calculateRisk(state);
}

export function formatRiskScore(risk: RiskSnapshot): string {
  return `${risk.level.toUpperCase()} · ${roundCurrency(risk.totalScore)}/100`;
}
