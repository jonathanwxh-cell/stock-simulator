import type { GameState, MarketIndexSnapshot } from './types';
import type { RNG } from './rng';
import { getRegimeAverageEffect } from './regimeSystem';
import { roundCurrency } from './financialMath';

export const INITIAL_MARKET_INDEX = 1000;

export function initialMarketIndex(): MarketIndexSnapshot[] {
  return [{ turn: 0, value: INITIAL_MARKET_INDEX, changePct: 0 }];
}

export function simulateMarketIndex(prevState: GameState, nextState: GameState, rng: RNG): MarketIndexSnapshot {
  const previous = prevState.marketIndexHistory?.[prevState.marketIndexHistory.length - 1] ?? { turn: 0, value: INITIAL_MARKET_INDEX, changePct: 0 };
  const regimeEffect = (getRegimeAverageEffect(nextState.currentRegime) - 1) * 0.35;
  const volatility = 0.018 * (nextState.currentRegime?.volatilityMultiplier ?? 1);
  const newsImpact = nextState.newsHistory
    .filter(n => n.turn === nextState.currentTurn)
    .reduce((sum, n) => sum + (n.impact === 'positive' ? n.magnitude : n.impact === 'negative' ? -n.magnitude : 0), 0) * 0.08;
  const rawReturn = 0.002 + regimeEffect + newsImpact + (rng.next() - 0.5) * volatility * 2;
  const boundedReturn = Math.max(-0.08, Math.min(0.08, rawReturn));
  const value = roundCurrency(previous.value * (1 + boundedReturn));
  return { turn: nextState.currentTurn, value, changePct: roundCurrency(boundedReturn * 100) };
}

export function getMarketReturnPct(state: GameState): number {
  const first = state.marketIndexHistory?.[0]?.value ?? INITIAL_MARKET_INDEX;
  const last = state.marketIndexHistory?.[state.marketIndexHistory.length - 1]?.value ?? first;
  return first > 0 ? roundCurrency(((last - first) / first) * 100) : 0;
}

export function getPlayerReturnPct(state: GameState): number {
  const first = state.netWorthHistory?.[0]?.netWorth ?? 1;
  const last = state.netWorthHistory?.[state.netWorthHistory.length - 1]?.netWorth ?? first;
  return first > 0 ? roundCurrency(((last - first) / first) * 100) : 0;
}

export function getAlphaPct(state: GameState): number {
  return roundCurrency(getPlayerReturnPct(state) - getMarketReturnPct(state));
}
