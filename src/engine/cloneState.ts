import type { GameState } from './types';

/**
 * Deep clone a GameState, preserving Date instances and array shapes.
 * We don't use structuredClone because it preserves Dates but doesn't
 * handle the spread-based shallow copy pattern we use for nested objects
 * (portfolio, shortPositions, etc.), and structuredClone would copy
 * prototype methods incorrectly for class instances if any sneak in.
 */
export function deepCloneGameState(state: GameState): GameState {
  return {
    ...state,
    currentDate: new Date(state.currentDate),
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
    stocks: state.stocks.map(s => ({ ...s, priceHistory: s.priceHistory.map(p => ({ ...p })) })),
    portfolio: Object.fromEntries(Object.entries(state.portfolio).map(([k, v]) => [k, { ...v }])),
    shortPositions: Object.fromEntries(Object.entries(state.shortPositions).map(([k, v]) => [k, { ...v }])),
    limitOrders: state.limitOrders.map(o => ({ ...o })),
    transactionHistory: state.transactionHistory.map(t => ({ ...t, date: new Date(t.date) })),
    netWorthHistory: state.netWorthHistory.map(n => ({ ...n, date: new Date(n.date) })),
    newsHistory: state.newsHistory.map(n => ({ ...n, date: new Date(n.date) })),
    currentScenario: state.currentScenario ? {
      ...state.currentScenario,
      sectorEffects: { ...state.currentScenario.sectorEffects },
      events: state.currentScenario.events.map(e => ({ ...e, date: new Date(e.date) })),
    } : null,
  };
}
