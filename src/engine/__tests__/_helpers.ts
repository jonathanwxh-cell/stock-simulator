import type { TradeResult, GameState } from '../types';

/**
 * Unwrap a TradeResult, throwing on failure.
 * Reduces 5-line try/catch blocks to 1-line calls in tests:
 *
 *   state = unwrap(state, s => executeBuy(s, stockId, 5));
 */
export function unwrap(
  state: GameState,
  op: (s: GameState) => TradeResult,
): GameState {
  const r = op(state);
  if (!r.ok) throw new Error(`Trade failed: ${r.reason}`);
  return r.state;
}
