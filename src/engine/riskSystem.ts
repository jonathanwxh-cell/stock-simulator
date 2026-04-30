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

  if (meaningfulExposure && largestPositionToNw > 0.25) warnings.push('Single-stock concentration is above 25% of net worth.');
  if (meaningfulExposure && sectorByExposure > 0.5) warnings.push('One sector is more than 50% of invested exposure.');
  if (cashRatio < 0.1) warnings.push('Cash buffer is below 10%.');
  if (shortRatio > 0.2) warnings.push('Short exposure is above 20% of net worth.');
  if (drawdown > 0.1) warnings.push('Drawdown exceeds 10%.');

  const concentrationScore = clampScore(concentrationByExposure * exposureScale * 65 + Math.max(0, largestPositionToNw - 0.25) * 55);
  const sectorScore = clampScore(sectorByExposure * exposureScale * 45 + Math.max(0, largestSectorToNw - 0.5) * 45);
  const cashBufferScore = clampScore(cashRatio < 0.1 ? 70 : cashRatio < 0.2 ? 35 : cashRatio < 0.35 ? 12 : 2);
  const shortExposureScore = clampScore(shortRatio * 170);
  const drawdownScore = clampScore(drawdown * 300);
  const totalScore = clampScore(concentrationScore * 0.3 + sectorScore * 0.22 + cashBufferScore * 0.12 + shortExposureScore * 0.2 + drawdownScore * 0.16);

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
  return state.riskHistory?.[state.riskHistory.length - 1] ?? calculateRisk(state);
}

export function formatRiskScore(risk: RiskSnapshot): string {
  return `${risk.level.toUpperCase()} · ${roundCurrency(risk.totalScore)}/100`;
}
