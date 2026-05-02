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

function bandScore(value: number, bands: Array<[number, number]>): number {
  for (const [threshold, score] of bands) if (value >= threshold) return score;
  return 0;
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
  const starterExposureScore = totalExposure > 0 && !meaningfulExposure
    ? bandScore(exposureRatio, [[0.1, 10], [0.03, 5]])
    : 0;
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
  const cashRatio = state.cash / nw;
  const shortRatio = shorts / nw;
  const peak = Math.max(...state.netWorthHistory.map(s => s.netWorth), nw);
  const drawdown = peak > 0 ? Math.max(0, (peak - nw) / peak) : 0;

  if (meaningfulExposure && largestPositionToNw > 0.25) warnings.push('Single-stock concentration is above 25% of net worth.');
  if (meaningfulExposure && sectorByExposure > 0.5) warnings.push('One sector is more than 50% of invested exposure.');
  if (cashRatio < 0.1) warnings.push('Cash buffer is below 10%.');
  if (shortRatio > 0.2) warnings.push('Short exposure is above 20% of net worth.');
  if (drawdown > 0.1) warnings.push('Drawdown exceeds 10%.');

  const concentrationScore = meaningfulExposure
    ? Math.max(
      bandScore(largestPositionToNw, [[0.7, 85], [0.5, 70], [0.25, 40], [0.1, 15]]),
      concentrationByExposure >= 0.8 && exposureRatio > 0.2 ? 30 : 0,
    )
    : 0;
  const sectorScore = meaningfulExposure
    ? bandScore(sectorByExposure, [[0.8, 45], [0.5, 30], [0.3, 15]])
    : 0;
  const cashBufferScore = totalExposure > 0
    ? bandScore(1 - cashRatio, [[0.95, 40], [0.9, 30], [0.8, 15]])
    : 0;
  const shortExposureScore = bandScore(shortRatio, [[0.7, 90], [0.5, 80], [0.2, 55], [0.1, 30]]);
  const drawdownScore = bandScore(drawdown, [[0.35, 85], [0.25, 70], [0.1, 35], [0.05, 15]]);

  const dominant = Math.max(concentrationScore, sectorScore, cashBufferScore, shortExposureScore, drawdownScore, starterExposureScore);
  const weighted = clampScore(concentrationScore * 0.32 + sectorScore * 0.18 + cashBufferScore * 0.14 + shortExposureScore * 0.22 + drawdownScore * 0.14);
  const totalScore = clampScore(Math.max(dominant, weighted));

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
