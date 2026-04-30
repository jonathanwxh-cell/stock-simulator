import type { GameState, RiskLevel, RiskSnapshot, Sector } from './types';
import { getNetWorth, getPortfolioValue, getShortLiability } from './marketSimulator';
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

export function calculateRisk(state: GameState): RiskSnapshot {
  const netWorth = Math.max(getNetWorth(state), 1);
  const portfolioValue = getPortfolioValue(state);
  const shortLiability = getShortLiability(state);
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
  const concentrationRatio = largestPosition / netWorth;
  const sectorRatio = largestSectorValue / netWorth;
  const cashRatio = state.cash / netWorth;
  const shortRatio = shortLiability / netWorth;
  const peak = Math.max(...state.netWorthHistory.map(s => s.netWorth), netWorth);
  const drawdown = peak > 0 ? Math.max(0, (peak - netWorth) / peak) : 0;

  if (concentrationRatio > 0.5) warnings.push('Single-stock concentration is high.');
  if (sectorRatio > 0.7) warnings.push('Sector concentration is above 70%.');
  if (cashRatio < 0.1) warnings.push('Cash buffer is below 10%.');
  if (shortRatio > 0.3) warnings.push('Short exposure is high.');
  if (drawdown > 0.2) warnings.push('Drawdown exceeds 20%.');

  const concentrationScore = clampScore(concentrationRatio * 100);
  const sectorScore = clampScore(sectorRatio * 90);
  const cashBufferScore = clampScore(cashRatio < 0.1 ? 70 : cashRatio < 0.2 ? 35 : 5);
  const shortExposureScore = clampScore(shortRatio * 130);
  const drawdownScore = clampScore(drawdown * 220);
  const totalScore = clampScore(
    concentrationScore * 0.25 +
    sectorScore * 0.2 +
    cashBufferScore * 0.15 +
    shortExposureScore * 0.2 +
    drawdownScore * 0.2
  );

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
  return state.riskHistory[state.riskHistory.length - 1] ?? calculateRisk(state);
}

export function formatRiskScore(risk: RiskSnapshot): string {
  return `${risk.level.toUpperCase()} · ${roundCurrency(risk.totalScore)}/100`;
}
