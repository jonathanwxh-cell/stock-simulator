import type { GameState, SaveMetadata } from './types';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { z } from 'zod';
import { cloudDeleteSave, cloudGetSaveMetadata, cloudLoadGame, cloudSaveGame, isCloudSaveConfigured } from './cloudSaveSystem';
import { DIFFICULTY_CONFIGS } from './config';

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

function emptySaveMetadata(slot: SaveMetadata['slot']): SaveMetadata {
  return {
    slot,
    playerName: '',
    difficulty: 'normal',
    currentTurn: 0,
    turnLimit: 100,
    netWorth: 0,
    cash: 0,
    date: new Date(),
    updatedAt: new Date(),
    exists: false,
    isGameOver: false,
  };
}

function parseStoredState(raw: string | null): GameState | null {
  if (!raw || raw === 'null') return null;

  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
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
    catalystCalendar: (state.catalystCalendar || []).map(event => ({
      ...event,
      scheduledDate: typeof event.scheduledDate === 'string'
        ? event.scheduledDate
        : (event.scheduledDate as Date).toISOString(),
    })),
  } as unknown as Omit<GameState, 'stocks' | 'transactionHistory' | 'newsHistory'> & {
    stocks: Array<Omit<Stock, 'priceHistory'> & { priceHistory: [] }>;
    transactionHistory: [];
    newsHistory: [];
  };
}

import type { Stock } from './types';

// Loose schema for imported saves. We don't try to fully model every nested
// shape — just the essentials needed to load a game without crashing on
// access. Anything else falls through and is treated as best-effort data.
const ImportSaveSchema = z.object({
  playerName: z.string(),
  difficulty: z.enum(['easy', 'normal', 'hard', 'expert']),
  currentTurn: z.number().int().nonnegative(),
  currentDate: z.union([z.string(), z.date()]),
  cash: z.number(),
  portfolio: z.record(z.string(), z.object({
    stockId: z.string(),
    shares: z.number(),
    avgCost: z.number(),
  })),
  shortPositions: z.record(z.string(), z.object({
    stockId: z.string(),
    shares: z.number(),
    entryPrice: z.number(),
    marginUsed: z.number(),
  })),
  limitOrders: z.array(z.object({
    id: z.string(),
    stockId: z.string(),
    type: z.enum(['buy', 'sell']),
    shares: z.number(),
    targetPrice: z.number(),
    placedTurn: z.number(),
  })),
  marginUsed: z.number(),
  stocks: z.array(z.object({
    id: z.string(),
    ticker: z.string(),
    name: z.string(),
    sector: z.string(),
    currentPrice: z.number(),
  }).passthrough()),
  isGameOver: z.boolean(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
}).passthrough();

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
    catalystCalendar: state.catalystCalendar?.map(event => ({
      ...event,
      scheduledDate: new Date(event.scheduledDate),
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

async function saveGameLocal(slot: 1 | 2 | 3 | 'auto', gameState: GameState): Promise<void> {
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

async function loadGameLocal(slot: 1 | 2 | 3 | 'auto'): Promise<GameState | null> {
  const slotKey = getSlotKey(slot);

  // Load small data from localStorage
  let raw: string | null = null;
  if (slot === 'auto') {
    raw = localStorage.getItem(AUTO_SAVE_KEY);
  } else {
    const slots = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '{}');
    raw = slots[slotKey] ? JSON.stringify(slots[slotKey]) : null;
  }

  const state = parseStoredState(raw);
  if (!state) return null;
  if (slot === 'auto' && state.isGameOver) {
    await deleteSave('auto');
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

export async function saveGame(slot: 1 | 2 | 3 | 'auto', gameState: GameState): Promise<void> {
  await saveGameLocal(slot, gameState);
  if (!isCloudSaveConfigured()) return;
  try {
    await cloudSaveGame(slot, gameState);
  } catch (e) {
    console.warn('Cloud save failed; local save preserved:', e);
  }
}

export async function loadGame(slot: 1 | 2 | 3 | 'auto'): Promise<GameState | null> {
  if (isCloudSaveConfigured()) {
    try {
      const cloud = await cloudLoadGame(slot);
      if (cloud) {
        if (slot === 'auto' && cloud.isGameOver) {
          await deleteSave('auto');
          return null;
        }
        await saveGameLocal(slot, cloud);
        return cloud;
      }
    } catch (e) {
      console.warn('Cloud load failed; falling back to local save:', e);
    }
  }
  return loadGameLocal(slot);
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

  if (isCloudSaveConfigured()) {
    try {
      await cloudDeleteSave(slot);
    } catch (e) {
      console.warn('Cloud delete failed; local delete completed:', e);
    }
  }
}

async function getLocalSaveMetadata(): Promise<SaveMetadata[]> {
  const slots: SaveMetadata[] = [];

  // Check auto-save
  const autoRaw = localStorage.getItem(AUTO_SAVE_KEY);
  const auto = parseStoredState(autoRaw);
  if (auto?.isGameOver) {
    await deleteSave('auto');
    slots.push(emptySaveMetadata('auto'));
  } else if (auto) {
    const difficulty = auto.difficulty || 'normal';
    const cash = auto.cash || 0;
    const portfolioValue = (auto.netWorthHistory?.[auto.netWorthHistory.length - 1]?.portfolioValue) || 0;
    slots.push({
      slot: 'auto',
      playerName: auto.playerName || 'Unknown',
      difficulty,
      currentTurn: auto.currentTurn || 0,
      turnLimit: DIFFICULTY_CONFIGS[difficulty].turnLimit,
      netWorth: (auto.netWorthHistory?.[auto.netWorthHistory.length - 1]?.netWorth) || cash + portfolioValue,
      cash,
      date: new Date(auto.createdAt || Date.now()),
      updatedAt: new Date(auto.updatedAt || Date.now()),
      exists: true,
      isGameOver: Boolean(auto.isGameOver),
    });
  } else {
    slots.push(emptySaveMetadata('auto'));
  }

  // Check manual slots
  const slotsData = JSON.parse(localStorage.getItem(SAVE_SLOTS_KEY) || '{}');
  for (const slotNum of [1, 2, 3] as const) {
    const key = getSlotKey(slotNum);
    const data = slotsData[key];
    if (data) {
      const difficulty = (data.difficulty || 'normal') as SaveMetadata['difficulty'];
      const cash = data.cash || 0;
      const portfolioValue = (data.netWorthHistory?.[data.netWorthHistory.length - 1]?.portfolioValue) || 0;
      slots.push({
        slot: slotNum,
        playerName: data.playerName || 'Unknown',
        difficulty,
        currentTurn: data.currentTurn || 0,
        turnLimit: DIFFICULTY_CONFIGS[difficulty].turnLimit,
        netWorth: (data.netWorthHistory?.[data.netWorthHistory.length - 1]?.netWorth) || cash + portfolioValue,
        cash,
        date: new Date(data.createdAt || Date.now()),
        updatedAt: new Date(data.updatedAt || Date.now()),
        exists: true,
        isGameOver: Boolean(data.isGameOver),
      });
    } else {
      slots.push(emptySaveMetadata(slotNum));
    }
  }

  return slots;
}

export async function getSaveMetadata(): Promise<SaveMetadata[]> {
  const local = await getLocalSaveMetadata();
  if (!isCloudSaveConfigured()) return local;

  try {
    const cloud = await cloudGetSaveMetadata();
    if (!cloud.length) return local;
    const bySlot = new Map<SaveMetadata['slot'], SaveMetadata>();
    for (const item of local) bySlot.set(item.slot, item);
    for (const item of cloud) bySlot.set(item.slot, item);
    const auto = bySlot.get('auto');
    if (auto?.exists && auto.isGameOver) {
      await deleteSave('auto');
      bySlot.set('auto', emptySaveMetadata('auto'));
    }
    return Array.from(bySlot.values()).sort((a, b) => {
      if (a.slot === 'auto') return -1;
      if (b.slot === 'auto') return 1;
      return String(a.slot).localeCompare(String(b.slot));
    });
  } catch (e) {
    console.warn('Cloud metadata failed; using local metadata:', e);
    return local;
  }
}

export async function autoSave(gameState: GameState): Promise<void> {
  if (gameState.isGameOver) {
    await deleteSave('auto');
    return;
  }
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  // Schema-validate before treating it as a GameState. This prevents corrupt
  // or malicious imports from crashing the app on first access.
  const result = ImportSaveSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('Save import rejected — schema validation failed:', result.error.issues);
    return null;
  }

  return reviveDates(result.data as unknown as GameState);
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
