import type { GameState } from './types';

/**
 * Deep clone a GameState, preserving Date instances and array shapes.
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
    marketIndexHistory: (state.marketIndexHistory || []).map(m => ({ ...m })),
    riskHistory: (state.riskHistory || []).map(r => ({ ...r, warnings: [...r.warnings] })),
    activeMission: state.activeMission ? { ...state.activeMission } : null,
    completedMissions: (state.completedMissions || []).map(m => ({ ...m })),
    lastAdvisorFeedback: (state.lastAdvisorFeedback || []).map(f => ({ ...f, tags: [...f.tags] })),
    macroEnvironment: { ...state.macroEnvironment, trends: { ...state.macroEnvironment.trends } },
    macroHistory: (state.macroHistory || []).map(m => ({ ...m, trends: { ...m.trends } })),
    watchlist: [...(state.watchlist || [])],
    catalystCalendar: (state.catalystCalendar || []).map(event => ({ ...event, scheduledDate: new Date(event.scheduledDate) })),
    newsHistory: state.newsHistory.map(n => ({ ...n, date: new Date(n.date) })),
    currentRegime: state.currentRegime ? {
      ...state.currentRegime,
      sectorEffects: { ...state.currentRegime.sectorEffects },
      newsBias: state.currentRegime.newsBias ? { ...state.currentRegime.newsBias } : undefined,
    } : null,
    currentScenario: state.currentScenario ? {
      ...state.currentScenario,
      sectorEffects: { ...state.currentScenario.sectorEffects },
      events: state.currentScenario.events.map(e => ({ ...e, date: new Date(e.date) })),
    } : null,
  };
}
