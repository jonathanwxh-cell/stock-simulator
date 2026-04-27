import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { GameState, Difficulty, Screen, GameSettings } from '../engine/types';
import {
  createNewGame,
  executeBuy,
  executeSell,
  executeShort,
  executeCover,
  placeLimitOrder,
  cancelLimitOrder,
  simulateTurn,
  autoSave,
  saveGame as saveGameEngine,
  loadGame as loadGameEngine,
  loadSettings,
  saveSettings,
  initSaveSystem,
} from '../engine';
import { useAudio } from '@/hooks/useAudio';

interface GameContextType {
  gameState: GameState | null;
  settings: GameSettings;
  screen: Screen;
  previousScreen: Screen;
  newGame: (name: string, difficulty: Difficulty) => void;
  loadGame: (slot: 1 | 2 | 3 | 'auto') => Promise<void>;
  saveGame: (slot: 1 | 2 | 3 | 'auto') => void;
  advanceTurn: () => void;
  buyStock: (stockId: string, shares: number) => void;
  sellStock: (stockId: string, shares: number) => void;
  shortStock: (stockId: string, shares: number) => void;
  coverStock: (stockId: string, shares: number) => void;
  placeOrder: (stockId: string, type: 'buy' | 'sell', shares: number, targetPrice: number) => void;
  cancelOrder: (orderId: string) => void;
  navigateTo: (screen: Screen) => void;
  goBack: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  resetGame: () => void;
}

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  animationSpeed: 'normal',
  showTutorials: true,
};

const GameContext = createContext<GameContextType | null>(null);

interface State {
  gameState: GameState | null;
  settings: GameSettings;
  screen: Screen;
  previousScreen: Screen;
}

type Action =
  | { type: 'SET_GAME_STATE'; payload: GameState | null }
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'SET_PREVIOUS_SCREEN'; payload: Screen }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GameSettings> }
  | { type: 'UPDATE_GAME_STATE'; payload: GameState }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_GAME_STATE': return { ...state, gameState: action.payload };
    case 'SET_SCREEN': return { ...state, previousScreen: state.screen, screen: action.payload };
    case 'SET_PREVIOUS_SCREEN': return { ...state, previousScreen: action.payload };
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UPDATE_GAME_STATE': return { ...state, gameState: action.payload };
    case 'RESET': return { gameState: null, settings: defaultSettings, screen: 'title', previousScreen: 'title' };
    default: return state;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  try { initSaveSystem(); } catch {}

  const savedSettings = loadSettings();
  const [state, dispatch] = useReducer(reducer, {
    gameState: null,
    settings: savedSettings || defaultSettings,
    screen: 'title',
    previousScreen: 'title',
  });

  const audio = useAudio({
    soundEnabled: state.settings.soundEnabled,
    musicEnabled: state.settings.musicEnabled,
    screen: state.screen,
  });

  const newGame = useCallback((name: string, difficulty: Difficulty) => {
    const game = createNewGame(name, difficulty);
    dispatch({ type: 'SET_GAME_STATE', payload: game });
    dispatch({ type: 'SET_SCREEN', payload: 'game' });
    audio.turn();
    autoSave(game).catch(e => console.warn('audio:', e));
  }, [audio.turn]);

  const loadGame = useCallback(async (slot: 1 | 2 | 3 | 'auto') => {
    const loaded = await loadGameEngine(slot);
    if (loaded) {
      const migrated = {
        ...loaded,
        shortPositions: loaded.shortPositions || {},
        limitOrders: loaded.limitOrders || [],
        marginUsed: loaded.marginUsed || 0,
        totalFeesPaid: loaded.totalFeesPaid || 0,
        totalDividendsReceived: loaded.totalDividendsReceived || 0,
        stocks: loaded.stocks.map(s => ({ ...s, beta: s.beta || 1, splitMultiplier: s.splitMultiplier || 1 })),
      };
      dispatch({ type: 'SET_GAME_STATE', payload: migrated });
      dispatch({ type: 'SET_SCREEN', payload: migrated.isGameOver ? 'game-over' : 'game' });
      if (!migrated.isGameOver) audio.turn();
    }
  }, [audio.turn]);

  const saveGame = useCallback((slot: 1 | 2 | 3 | 'auto') => {
    if (state.gameState) {
      saveGameEngine(slot, { ...state.gameState, saveSlot: slot }).catch(e => console.warn('save:', e));
    }
  }, [state.gameState]);

  const advanceTurn = useCallback(() => {
    if (!state.gameState || state.gameState.isGameOver) return;
    const prev = state.gameState;
    const newState = simulateTurn(state.gameState);
    dispatch({ type: 'UPDATE_GAME_STATE', payload: newState });
    dispatch({ type: 'SET_SCREEN', payload: 'next-turn' });
    autoSave(newState).catch(e => console.warn('save:', e));

    audio.turn();

    // Check for special events this turn — reuse the same slice for all checks
    const newTxns = newState.transactionHistory.slice(prev.transactionHistory.length);

    const hadDividend = newTxns.some(t => t.type === 'dividend');
    if (hadDividend) setTimeout(() => audio.dividend(), 300);

    const hadBankrupt = newState.stocks.some(s => {
      const prevStock = prev.stocks.find(p => p.id === s.id);
      return s.currentPrice === 0 && (prevStock?.currentPrice ?? 0) > 0;
    });
    if (hadBankrupt) setTimeout(() => audio.bankrupt(), 500);

    const hadMarginCall = newTxns.some(t => t.type === 'margin_call');
    if (hadMarginCall) setTimeout(() => audio.marginCall(), 400);

    if (newState.isGameOver) setTimeout(() => audio.gameOver(), 800);
  }, [state.gameState, audio.turn, audio.dividend, audio.bankrupt, audio.marginCall, audio.gameOver]);

  const buyStock = useCallback((stockId: string, shares: number) => {
    if (!state.gameState) return;
    try {
      const result = executeBuy(state.gameState, stockId, shares);
      dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state });
      audio.buy();
    } catch {
      audio.error();
    }
  }, [state.gameState, audio.buy, audio.error]);

  const sellStock = useCallback((stockId: string, shares: number) => {
    if (!state.gameState) return;
    try {
      const result = executeSell(state.gameState, stockId, shares);
      dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state });
      audio.sell();
    } catch {
      audio.error();
    }
  }, [state.gameState, audio.sell, audio.error]);

  const shortStock = useCallback((stockId: string, shares: number) => {
    if (!state.gameState) return;
    try {
      const result = executeShort(state.gameState, stockId, shares);
      dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state });
      audio.short();
    } catch {
      audio.error();
    }
  }, [state.gameState, audio.short, audio.error]);

  const coverStock = useCallback((stockId: string, shares: number) => {
    if (!state.gameState) return;
    try {
      const result = executeCover(state.gameState, stockId, shares);
      dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state });
      audio.cover();
    } catch {
      audio.error();
    }
  }, [state.gameState, audio.cover, audio.error]);

  const placeOrder = useCallback((stockId: string, type: 'buy' | 'sell', shares: number, targetPrice: number) => {
    if (!state.gameState) return;
    try {
      const result = placeLimitOrder(state.gameState, stockId, type, shares, targetPrice);
      dispatch({ type: 'UPDATE_GAME_STATE', payload: result.state });
      audio.click();
    } catch {
      audio.error();
    }
  }, [state.gameState, audio.click, audio.error]);

  const cancelOrder = useCallback((orderId: string) => {
    if (!state.gameState) return;
    const newState = cancelLimitOrder(state.gameState, orderId);
    dispatch({ type: 'UPDATE_GAME_STATE', payload: newState });
    audio.click();
  }, [state.gameState, audio.click]);

  const navigateTo = useCallback((screen: Screen) => {
    dispatch({ type: 'SET_SCREEN', payload: screen });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'SET_SCREEN', payload: state.previousScreen });
  }, [state.previousScreen]);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: partial });
    saveSettings({ ...state.settings, ...partial });
  }, [state.settings]);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value: GameContextType = {
    gameState: state.gameState, settings: state.settings,
    screen: state.screen, previousScreen: state.previousScreen,
    newGame, loadGame, saveGame, advanceTurn,
    buyStock, sellStock, shortStock, coverStock,
    placeOrder, cancelOrder,
    navigateTo, goBack, updateSettings, resetGame,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
