import type { GameState } from './types';
import { roundCurrency } from './financialMath';

export interface TurnPerformance {
  marketMovePct: number;
  playerMovePct: number;
  turnAlphaPct: number;
}

export function getLatestTurnPerformance(state: GameState): TurnPerformance {
  const latestIndex = state.marketIndexHistory?.[state.marketIndexHistory.length - 1];
  const marketMovePct = latestIndex?.changePct ?? 0;
  const currentSnapshot = state.netWorthHistory?.[state.netWorthHistory.length - 1];
  const previousSnapshot = state.netWorthHistory?.[state.netWorthHistory.length - 2];
  const playerMovePct = currentSnapshot && previousSnapshot && previousSnapshot.netWorth > 0
    ? roundCurrency(((currentSnapshot.netWorth - previousSnapshot.netWorth) / previousSnapshot.netWorth) * 100)
    : 0;

  return {
    marketMovePct,
    playerMovePct,
    turnAlphaPct: roundCurrency(playerMovePct - marketMovePct),
  };
}
