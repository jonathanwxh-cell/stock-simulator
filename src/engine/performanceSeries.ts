import type { GameState } from './types';
import { roundCurrency } from './financialMath';

export type PerformanceRange = '12m' | '24m' | 'all';

export interface PerformanceSeriesPoint {
  turn: number;
  date: Date;
  netWorth: number;
  marketIndex: number;
  playerNormalized: number;
  marketNormalized: number;
}

function rangeLength(range: PerformanceRange): number | null {
  if (range === '12m') return 12;
  if (range === '24m') return 24;
  return null;
}

export function buildPerformanceSeries(state: GameState, range: PerformanceRange): PerformanceSeriesPoint[] {
  const marketByTurn = new Map(
    (state.marketIndexHistory || []).map((snapshot) => [snapshot.turn, snapshot]),
  );

  const zipped = (state.netWorthHistory || [])
    .map((snapshot) => {
      const market = marketByTurn.get(snapshot.turn);
      if (!market) return null;

      return {
        turn: snapshot.turn,
        date: snapshot.date,
        netWorth: snapshot.netWorth,
        marketIndex: market.value,
      };
    })
    .filter((point): point is Omit<PerformanceSeriesPoint, 'playerNormalized' | 'marketNormalized'> => point !== null)
    .sort((left, right) => left.turn - right.turn);

  if (zipped.length === 0) return [];

  const maxRows = rangeLength(range);
  const visible = maxRows ? zipped.slice(-maxRows) : zipped;
  const baseNetWorth = visible[0]?.netWorth || 0;
  const baseMarketIndex = visible[0]?.marketIndex || 0;

  return visible.map((point) => ({
    ...point,
    playerNormalized: baseNetWorth > 0 ? roundCurrency((point.netWorth / baseNetWorth) * 100) : 0,
    marketNormalized: baseMarketIndex > 0 ? roundCurrency((point.marketIndex / baseMarketIndex) * 100) : 0,
  }));
}
