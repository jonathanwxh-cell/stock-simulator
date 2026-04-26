import type { GameState, SaveMetadata } from './types';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const SAVE_SLOTS_KEY = 'marketmaster_save_slots';
const AUTO_SAVE_KEY = 'marketmaster_autosave';
const SETTINGS_KEY = 'marketmaster_settings';
const LEADERBOARD_KEY = 'marketmaster_leaderboard';

const DB_NAME = 'MarketMasterDB';
const DB_VERSION = 1;
const PRICE_HISTORY_STORE = 'priceHistory';
const TRANSACTION_STORE = 'transactions';
const NEWS_STORE = 'news';

interface MarketMasterDB extends DBSchema {
  priceHistory: {
    key: string;
    value: { slot: string; data: Record<string, Array<{ turn: number; price: number }>> };
  };
  transactions: {
    key: string;
    value: { slot: string; data: GameState['transactionHistory'] };
  };
  news: {
    key: string;
    value: { slot: string; data: GameState['newsHistory'] };
  };
}

let dbPromise: Promise<IDBPDatabase<MarketMasterDB>> | null = null;

function getDB(): Promise<IDBPDatabase<MarketMasterDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MarketMasterDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PRICE_HISTORY_STORE)) {
          db.createObjectStore(PRICE_HISTORY_STORE, { keyPath: 'slot' });
        }
        if (!db.objectStoreNames.contains(TRANSACTION_STORE)) {
          db.createObjectStore(TRANSACTION_STORE, { keyPath: 'slot' });
        }
        if (!db.objectStoreNames.contains(NEWS_STORE)) {
          db.createObjectStore(NEWS_STORE, { keyPath: 'slot' });
        }
      },
    });
  }
  return dbPromise;
}

export function initSaveSystem(): void {
  // Ensure localStorage keys exist
  if (!localStorage.getItem(SAVE_SLOTS_KEY)) {
    localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify({}));
  }
  if (!localStorage.getItem(AUTO_SAVE_KEY)) {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(null));
  }
  if (!localStorage.getItem(SETTINGS_KEY)) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      soundEnabled: true,
      musicEnabled: true,
      animationSpeed: 'normal',
      showTutorials: true,
    }));
  }
  if (!localStorage.getItem(LEADERBOARD_KEY)) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify([]));
  }
  // Initialize IndexedDB
  getDB().catch(console.error);
}

function getSlotKey(slot: 1 | 2 | 3 | 'auto'): string {
  return slot === 'auto' ? 'auto' : `slot_${slot}`;
}

function stripLargeData(state: GameState): Omit<GameState, 'stocks' | 'transactionHistory' | 'newsHistory'> & {
  stocks: Array<Omit<Stock, 'priceHistory'> & { priceHistory: [] }>;
  transactionHistory: [];
  newsHistory: [];
} {
  return {
    ...state,
    currentDate: state.currentDate.toISOString() as unknown as Date,
    createdAt: state.createdAt.toISOString() as unknown as Date,
    updatedAt: state.updatedAt.toISOString() as unknown as Date,
    stocks: state.stocks.map(s => ({
      ...s,
      currentDate: undefined,
      priceHistory: [],
    })),
    transactionHistory: [],
    newsHistory: [],
    netWorthHistory: state.netWorthHistory.map(n => ({
      ...n,
      date: typeof n.date === 'string' ? n.date : (n.date as Date).toISOString(),
    })),
    currentScenario: state.currentScenario ? {
      ...state.currentScenario,
      events: state.currentScenario.events.map(e => ({
        ...e,
        date: typeof e.date === 'string' ? e.date : (e.date as Date).toISOString(),
      })),
    } : null,
  } as unknown as Omit<GameState, 'stocks' | 'transactionHistory' | 'newsHistory'> & {
    stocks: Array<Omit<Stock, 'priceHistory'> & { priceHistory: [] }>;
    transactionHistory: [];
    newsHistory: [];
  };
}

import type { Stock } from './types';

function reviveDates(state: GameState): GameState {
  return {
    ...state,
    currentDate: new Date(state.currentDate),
    createdAt: new Date(state.createdAt),
    updatedAt: new Date(state.updatedAt),
    stocks: state.stocks.map(s => ({
      ...s,
      priceHistory: (s.priceHistory || []).map(p => ({ ...p })),
    })),
    netWorthHistory: state.netWorthHistory?.map(n => ({
      ...n,
      date: new Date(n.date),
    })) || [],
    transactionHistory: state.transactionHistory?.map(t => ({
      ...t,
      date: new Date(t.date),
    })) || [],
    newsHistory: state.newsHistory?.map(n => ({
      ...n,
      date: new Date(n.date),
    })) || [],
    currentScenario: state.currentScenario ? {
      ...state.currentScenario,
      events: state.currentScenario.events.map(e => ({
        ...e,
        date: new Date(e.date),
      })),
    } : null,
  };
}

export async function saveGame(slot: 1 | 2 | 3 | 'auto', gameState: GameState): Promise<void> {
  const slotKey = getSlotKey(slot);

  // Save small data to localStorage
  const stripped = stripLargeData(gameState);
  if (slot === 'auto') {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(stripped));
  } else {
    const slots = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '{}');
    slots[slotKey] = stripped;
    localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
  }

  // Save large data to IndexedDB
  const db = await getDB();
  const tx = db.transaction([PRICE_HISTORY_STORE, TRANSACTION_STORE, NEWS_STORE], 'readwrite');

  // Price history per stock
  const priceData: Record<string, Array<{ turn: number; price: number }>> = {};
  for (const stock of gameState.stocks) {
    priceData[stock.id] = stock.priceHistory;
  }

  await Promise.all([
    tx.objectStore(PRICE_HISTORY_STORE).put({ slot: slotKey, data: priceData }),
    tx.objectStore(TRANSACTION_STORE).put({ slot: slotKey, data: gameState.transactionHistory }),
    tx.objectStore(NEWS_STORE).put({ slot: slotKey, data: gameState.newsHistory }),
    tx.done,
  ]);
}

export async function loadGame(slot: 1 | 2 | 3 | 'auto'): Promise<GameState | null> {
  const slotKey = getSlotKey(slot);

  // Load small data from localStorage
  let raw: string | null = null;
  if (slot === 'auto') {
    raw = localStorage.getItem(AUTO_SAVE_KEY);
  } else {
    const slots = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '{}');
    raw = slots[slotKey] ? JSON.stringify(slots[slotKey]) : null;
  }

  if (!raw || raw === 'null') return null;

  let state: GameState;
  try {
    state = JSON.parse(raw) as GameState;
  } catch {
    return null;
  }

  // Load large data from IndexedDB
  try {
    const db = await getDB();
    const [priceRecord, txnRecord, newsRecord] = await Promise.all([
      db.get(PRICE_HISTORY_STORE, slotKey),
      db.get(TRANSACTION_STORE, slotKey),
      db.get(NEWS_STORE, slotKey),
    ]);

    // Restore price history
    if (priceRecord && priceRecord.data) {
      const priceData = priceRecord.data as Record<string, Array<{ turn: number; price: number }>>;
      for (const stock of state.stocks) {
        const history = priceData[stock.id];
        if (history) {
          (stock as Stock).priceHistory = history;
        }
      }
    }

    // Restore transaction history
    if (txnRecord && txnRecord.data) {
      state.transactionHistory = txnRecord.data;
    }

    // Restore news history
    if (newsRecord && newsRecord.data) {
      state.newsHistory = newsRecord.data;
    }
  } catch (e) {
    console.warn('Failed to load IndexedDB data:', e);
  }

  return reviveDates(state);
}

export async function deleteSave(slot: 1 | 2 | 3 | 'auto'): Promise<void> {
  const slotKey = getSlotKey(slot);

  // Delete from localStorage
  if (slot === 'auto') {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(null));
  } else {
    const slots = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '{}');
    delete slots[slotKey];
    localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
  }

  // Delete from IndexedDB
  try {
    const db = await getDB();
    const tx = db.transaction([PRICE_HISTORY_STORE, TRANSACTION_STORE, NEWS_STORE], 'readwrite');
    await Promise.all([
      tx.objectStore(PRICE_HISTORY_STORE).delete(slotKey),
      tx.objectStore(TRANSACTION_STORE).delete(slotKey),
      tx.objectStore(NEWS_STORE).delete(slotKey),
      tx.done,
    ]);
  } catch (e) {
    console.warn('Failed to delete IndexedDB data:', e);
  }
}

export async function getSaveMetadata(): Promise<SaveMetadata[]> {
  const slots: SaveMetadata[] = [];

  // Check auto-save
  const autoRaw = localStorage.getItem(AUTO_SAVE_KEY);
  if (autoRaw && autoRaw !== 'null') {
    try {
      const auto = JSON.parse(autoRaw);
      const cash = auto.cash || 0;
      const portfolioValue = (auto.netWorthHistory?.[auto.netWorthHistory.length - 1]?.portfolioValue) || 0;
      slots.push({
        slot: 'auto',
        playerName: auto.playerName || 'Unknown',
        difficulty: auto.difficulty || 'normal',
        currentTurn: auto.currentTurn || 0,
        turnLimit: auto.turnLimit || 100,
        netWorth: (auto.netWorthHistory?.[auto.netWorthHistory.length - 1]?.netWorth) || cash + portfolioValue,
        cash,
        date: new Date(auto.createdAt || Date.now()),
        updatedAt: new Date(auto.updatedAt || Date.now()),
        exists: true,
      });
    } catch {
      slots.push({
        slot: 'auto',
        playerName: '',
        difficulty: 'normal',
        currentTurn: 0,
        turnLimit: 100,
        netWorth: 0,
        cash: 0,
        date: new Date(),
        updatedAt: new Date(),
        exists: false,
      });
    }
  } else {
    slots.push({
      slot: 'auto',
      playerName: '',
      difficulty: 'normal',
      currentTurn: 0,
      turnLimit: 100,
      netWorth: 0,
      cash: 0,
      date: new Date(),
      updatedAt: new Date(),
      exists: false,
    });
  }

  // Check manual slots
  const slotsData = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '{}');
  for (const slotNum of [1, 2, 3] as const) {
    const key = getSlotKey(slotNum);
    const data = slotsData[key];
    if (data) {
      const cash = data.cash || 0;
      const portfolioValue = (data.netWorthHistory?.[data.netWorthHistory.length - 1]?.portfolioValue) || 0;
      slots.push({
        slot: slotNum,
        playerName: data.playerName || 'Unknown',
        difficulty: data.difficulty || 'normal',
        currentTurn: data.currentTurn || 0,
        turnLimit: data.turnLimit || 100,
        netWorth: (data.netWorthHistory?.[data.netWorthHistory.length - 1]?.netWorth) || cash + portfolioValue,
        cash,
        date: new Date(data.createdAt || Date.now()),
        updatedAt: new Date(data.updatedAt || Date.now()),
        exists: true,
      });
    } else {
      slots.push({
        slot: slotNum,
        playerName: '',
        difficulty: 'normal',
        currentTurn: 0,
        turnLimit: 100,
        netWorth: 0,
        cash: 0,
        date: new Date(),
        updatedAt: new Date(),
        exists: false,
      });
    }
  }

  return slots;
}

export async function autoSave(gameState: GameState): Promise<void> {
  await saveGame('auto', gameState);
}

export function exportSave(slot: 1 | 2 | 3): string {
  const slotsData = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '{}');
  const key = getSlotKey(slot);
  const data = slotsData[key];
  if (!data) return '';
  return JSON.stringify(data, null, 2);
}

export function importSave(json: string): GameState | null {
  try {
    const parsed = JSON.parse(json) as GameState;
    return reviveDates(parsed);
  } catch {
    return null;
  }
}

export function loadSettings(): { soundEnabled: boolean; musicEnabled: boolean; animationSpeed: 'slow' | 'normal' | 'fast'; showTutorials: boolean } {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return { soundEnabled: true, musicEnabled: true, animationSpeed: 'normal', showTutorials: true };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { soundEnabled: true, musicEnabled: true, animationSpeed: 'normal', showTutorials: true };
  }
}

export function saveSettings(settings: { soundEnabled: boolean; musicEnabled: boolean; animationSpeed: 'slow' | 'normal' | 'fast'; showTutorials: boolean }): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
