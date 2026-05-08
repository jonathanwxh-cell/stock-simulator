import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { ConditionalOrder, GameState, Difficulty, RebalancePreview, Screen, GameSettings, CareerStyle, ChallengeModeId } from '../engine/types';
import type { LegacyPathOffer } from '../engine/legacyStory';
import type { TrophyCase, TrophyUnlock } from '../engine/trophySystem';
import {
  createNewGame, executeBuy, executeSell, executeShort, executeCover,
  placeLimitOrder, cancelLimitOrder, placeConditionalOrder, cancelConditionalOrder, executeRebalancePreview, simulateTurn, autoSave,
  saveGame as saveGameEngine, loadGame as loadGameEngine,
  loadSettings, saveSettings, initSaveSystem, tradeErrorMessage,
  createMission, defaultRNG, toggleWatchlistStock,
  continueCareer as continueCareerEngine,
  loadTrophyCase, recordTrophyProgress, buildLegacyEnding, recordLegacyChoice,
} from '../engine';
import { recordCompletedGame } from '../engine/completion';
import { useAudio } from '@/hooks/useAudio';

interface GameContextType {
  gameState: GameState | null;
  settings: GameSettings;
  screen: Screen;
  previousScreen: Screen;
  newGame: (name: string, difficulty: Difficulty, careerStyle?: CareerStyle, challengeMode?: ChallengeModeId) => void;
  continueCareer: (offer?: LegacyPathOffer) => void;
  loadGame: (slot: 1 | 2 | 3 | 'auto') => Promise<void>;
  saveGame: (slot: 1 | 2 | 3 | 'auto') => void;
  advanceTurn: () => void;
  buyStock: (stockId: string, shares: number) => void;
  sellStock: (stockId: string, shares: number) => void;
  shortStock: (stockId: string, shares: number) => void;
  coverStock: (stockId: string, shares: number) => void;
  placeOrder: (stockId: string, type: 'buy' | 'sell', shares: number, targetPrice: number) => void;
  cancelOrder: (orderId: string) => void;
  placeProtectiveOrder: (stockId: string, type: ConditionalOrder['type'], shares: number, triggerPrice: number) => void;
  cancelProtectiveOrder: (orderId: string) => void;
  executeRebalance: (preview: RebalancePreview) => void;
  toggleWatchlist: (stockId: string) => void;
  lastError: string | null;
  clearError: () => void;
  navigateTo: (screen: Screen) => void;
  goBack: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  resetGame: () => void;
  trophyCase: TrophyCase;
  newTrophyUnlocks: TrophyUnlock[];
  dismissTrophyUnlock: (trophyId: string) => void;
}

const defaultSettings: GameSettings = { soundEnabled: true, musicEnabled: true, animationSpeed: 'normal', showTutorials: true };
const GameContext = createContext<GameContextType | null>(null);

interface State { gameState: GameState | null; settings: GameSettings; screen: Screen; previousScreen: Screen; lastError: string | null; trophyCase: TrophyCase; newTrophyUnlocks: TrophyUnlock[]; }
type Action =
  | { type: 'SET_GAME_STATE'; payload: GameState | null }
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GameSettings> }
  | { type: 'UPDATE_GAME_STATE'; payload: GameState }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_TROPHY_CASE'; payload: TrophyCase }
  | { type: 'ADD_TROPHY_UNLOCKS'; payload: TrophyUnlock[] }
  | { type: 'DISMISS_TROPHY_UNLOCK'; payload: string }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_GAME_STATE': return { ...state, gameState: action.payload };
    case 'SET_SCREEN': return { ...state, previousScreen: state.screen, screen: action.payload };
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_GAME_STATE': return { ...state, gameState: action.payload };
    case 'SET_ERROR': return { ...state, lastError: action.payload };
    case 'CLEAR_ERROR': return { ...state, lastError: null };
    case 'SET_TROPHY_CASE': return { ...state, trophyCase: action.payload };
    case 'ADD_TROPHY_UNLOCKS': return { ...state, newTrophyUnlocks: [...state.newTrophyUnlocks, ...action.payload] };
    case 'DISMISS_TROPHY_UNLOCK': return { ...state, newTrophyUnlocks: state.newTrophyUnlocks.filter((unlock) => unlock.trophyId !== action.payload) };
    case 'RESET': return { gameState: null, settings: defaultSettings, screen: 'title', previousScreen: 'title', lastError: null, trophyCase: state.trophyCase, newTrophyUnlocks: state.newTrophyUnlocks };
    default: return state;
  }
}


export function GameProvider({ children }: { children: ReactNode }) {
  try {
    initSaveSystem();
  } catch {
    // Save initialization is best-effort. The engine falls back to local-only behavior.
  }

  const savedSettings = loadSettings();
  const [state, dispatch] = useReducer(reducer, { gameState: null, settings: savedSettings || defaultSettings, screen: 'title', previousScreen: 'title', lastError: null, trophyCase: loadTrophyCase(), newTrophyUnlocks: [] });
  const { buy, sell, short, cover, dividend, gameOver, turn, marginCall, click, error } = useAudio({ soundEnabled: state.settings.soundEnabled, musicEnabled: state.settings.musicEnabled, screen: state.screen });

  const syncTrophies = useCallback((nextGameState: GameState) => {
    const result = recordTrophyProgress(nextGameState);
    dispatch({ type: 'SET_TROPHY_CASE', payload: result.trophyCase });
    if (result.newUnlocks.length > 0) dispatch({ type: 'ADD_TROPHY_UNLOCKS', payload: result.newUnlocks });
  }, []);

  const saveAuto = useCallback((gs: GameState) => {
    autoSave(gs).catch(() => {
      dispatch({ type: 'SET_ERROR', payload: 'Auto-save failed — use Save Game to preserve your progress.' });
    });
  }, []);

  const newGame = useCallback((name: string, difficulty: Difficulty, careerStyle: CareerStyle = 'balanced', challengeMode: ChallengeModeId = 'standard') => {
    const game = createNewGame(name, difficulty, careerStyle, challengeMode);
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'SET_GAME_STATE', payload: game });
    dispatch({ type: 'SET_SCREEN', payload: 'game' });
    syncTrophies(game);
    turn();
    saveAuto(game);
  }, [turn, syncTrophies]);

  const continueCareer = useCallback((offer?: LegacyPathOffer) => {
    if (!state.gameState || !state.gameState.isGameOver) return;
    if (offer) recordLegacyChoice(buildLegacyEnding(state.gameState), offer);
    const continued = continueCareerEngine(state.gameState, offer ? {
      challengeMode: offer.challengeMode,
      themeId: offer.nextThemeId,
    } : undefined);
    const nextState = {
      ...continued,
      activeMission: continued.activeMission || createMission(continued, defaultRNG),
    };
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'SET_GAME_STATE', payload: nextState });
    dispatch({ type: 'SET_SCREEN', payload: 'game' });
    syncTrophies(nextState);
    saveAuto(nextState);
    turn();
  }, [state.gameState, turn, syncTrophies]);

  const loadGame = useCallback(async (slot: 1 | 2 | 3 | 'auto') => {
    const loaded = await loadGameEngine(slot);
    if (loaded) {
      // Schema migration is now done by saveSystem.parseStoredState before
      // we get here, so `loaded` is already at the current SAVE_VERSION.
      const migrated = recordCompletedGame(loaded);
      dispatch({ type: 'CLEAR_ERROR' });
      dispatch({ type: 'SET_GAME_STATE', payload: migrated });
      dispatch({ type: 'SET_SCREEN', payload: migrated.isGameOver ? 'game-over' : 'game' });
      syncTrophies(migrated);
      if (!migrated.isGameOver) turn();
    }
  }, [turn, syncTrophies]);

  const saveGame = useCallback((slot: 1 | 2 | 3 | 'auto') => { if (state.gameState) saveGameEngine(slot, { ...state.gameState, saveSlot: slot }).catch(e => console.warn('save:', e)); }, [state.gameState]);

  const advanceTurn = useCallback(() => {
    if (!state.gameState || state.gameState.isGameOver) return;
    const prev = state.gameState;
    const newState = recordCompletedGame(simulateTurn(state.gameState));
    dispatch({ type: 'UPDATE_GAME_STATE', payload: newState });
    dispatch({ type: 'SET_SCREEN', payload: 'next-turn' });
    syncTrophies(newState);
    saveAuto(newState);
    turn();
    const newTxns = newState.transactionHistory.slice(prev.transactionHistory.length);
    if (newTxns.some(t => t.type === 'dividend')) setTimeout(() => dividend(), 300);
    if (newTxns.some(t => t.type === 'margin_call')) setTimeout(() => marginCall(), 400);
    if (newState.isGameOver) setTimeout(() => gameOver(), 800);
  }, [state.gameState, turn, dividend, marginCall, gameOver, syncTrophies]);

  const buyStock = useCallback((stockId: string, shares: number) => { if (!state.gameState) return; const result = executeBuy(state.gameState, stockId, shares); if (result.ok) { dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state }); syncTrophies(result.state); saveAuto(result.state); buy(); } else { dispatch({ type: 'SET_ERROR', payload: tradeErrorMessage(result.reason) }); error(); } }, [state.gameState, buy, error, syncTrophies]);
  const sellStock = useCallback((stockId: string, shares: number) => { if (!state.gameState) return; const result = executeSell(state.gameState, stockId, shares); if (result.ok) { dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state }); syncTrophies(result.state); saveAuto(result.state); sell(); } else { dispatch({ type: 'SET_ERROR', payload: tradeErrorMessage(result.reason) }); error(); } }, [state.gameState, sell, error, syncTrophies]);
  const shortStock = useCallback((stockId: string, shares: number) => { if (!state.gameState) return; const result = executeShort(state.gameState, stockId, shares); if (result.ok) { dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state }); syncTrophies(result.state); saveAuto(result.state); short(); } else { dispatch({ type: 'SET_ERROR', payload: tradeErrorMessage(result.reason) }); error(); } }, [state.gameState, short, error, syncTrophies]);
  const coverStock = useCallback((stockId: string, shares: number) => { if (!state.gameState) return; const result = executeCover(state.gameState, stockId, shares); if (result.ok) { dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state }); syncTrophies(result.state); saveAuto(result.state); cover(); } else { dispatch({ type: 'SET_ERROR', payload: tradeErrorMessage(result.reason) }); error(); } }, [state.gameState, cover, error, syncTrophies]);
  const placeOrder = useCallback((stockId: string, type: 'buy' | 'sell', shares: number, targetPrice: number) => { if (!state.gameState) return; const result = placeLimitOrder(state.gameState, stockId, type, shares, targetPrice); if (result.ok) { dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state }); syncTrophies(result.state); saveAuto(result.state); click(); } else { dispatch({ type: 'SET_ERROR', payload: tradeErrorMessage(result.reason) }); error(); } }, [state.gameState, click, error, syncTrophies]);
  const cancelOrder = useCallback((orderId: string) => { if (!state.gameState) return; const newState = cancelLimitOrder(state.gameState, orderId); dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: newState }); saveAuto(newState); click(); }, [state.gameState, click]);
  const placeProtectiveOrder = useCallback((stockId: string, type: ConditionalOrder['type'], shares: number, triggerPrice: number) => { if (!state.gameState) return; const result = placeConditionalOrder(state.gameState, stockId, type, shares, triggerPrice); if (result.ok) { dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state }); syncTrophies(result.state); saveAuto(result.state); click(); } else { dispatch({ type: 'SET_ERROR', payload: tradeErrorMessage(result.reason) }); error(); } }, [state.gameState, click, error, syncTrophies]);
  const cancelProtectiveOrder = useCallback((orderId: string) => { if (!state.gameState) return; const newState = cancelConditionalOrder(state.gameState, orderId); dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: newState }); saveAuto(newState); click(); }, [state.gameState, click]);
  const executeRebalance = useCallback((preview: RebalancePreview) => {
    if (!state.gameState) return;
    if (preview.trades.length === 0) {
      dispatch({ type: 'SET_ERROR', payload: 'No rebalance trades to execute' });
      error();
      return;
    }
    const newState = executeRebalancePreview(state.gameState, preview);
    if (newState === state.gameState) {
      dispatch({ type: 'SET_ERROR', payload: 'Rebalance could not be executed' });
      error();
      return;
    }
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'UPDATE_GAME_STATE', payload: newState });
    syncTrophies(newState);
    saveAuto(newState);
    click();
  }, [state.gameState, click, error, syncTrophies]);
  const toggleWatchlist = useCallback((stockId: string) => { if (!state.gameState) return; const newState = toggleWatchlistStock(state.gameState, stockId); dispatch({ type: 'CLEAR_ERROR' }); dispatch({ type: 'UPDATE_GAME_STATE', payload: newState }); syncTrophies(newState); saveAuto(newState); click(); }, [state.gameState, click, syncTrophies]);
  const navigateTo = useCallback((screen: Screen) => dispatch({ type: 'SET_SCREEN', payload: screen }), []);
  const goBack = useCallback(() => dispatch({ type: 'SET_SCREEN', payload: state.previousScreen }), [state.previousScreen]);
  const updateSettings = useCallback((partial: Partial<GameSettings>) => { dispatch({ type: 'UPDATE_SETTINGS', payload: partial }); saveSettings({ ...state.settings, ...partial }); }, [state.settings]);
  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);
  const dismissTrophyUnlock = useCallback((trophyId: string) => dispatch({ type: 'DISMISS_TROPHY_UNLOCK', payload: trophyId }), []);
  const resetGame = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value: GameContextType = { gameState: state.gameState, settings: state.settings, screen: state.screen, previousScreen: state.previousScreen, lastError: state.lastError, clearError, newGame, continueCareer, loadGame, saveGame, advanceTurn, buyStock, sellStock, shortStock, coverStock, placeOrder, cancelOrder, placeProtectiveOrder, cancelProtectiveOrder, executeRebalance, toggleWatchlist, navigateTo, goBack, updateSettings, resetGame, trophyCase: state.trophyCase, newTrophyUnlocks: state.newTrophyUnlocks, dismissTrophyUnlock };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// useGame intentionally lives beside GameProvider to avoid a broad import churn pass.
// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
