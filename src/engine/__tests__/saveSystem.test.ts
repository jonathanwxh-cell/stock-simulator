import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame } from '../gameState';

const AUTO_SAVE_KEY = 'marketmaster_autosave';

function installLocalStorageMock() {
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
}

type StoreName = 'priceHistory' | 'transactions' | 'news';

const indexedDbStores: Record<StoreName, Map<string, unknown>> = {
  priceHistory: new Map(),
  transactions: new Map(),
  news: new Map(),
};

function resetIndexedDbStores() {
  for (const store of Object.values(indexedDbStores)) {
    store.clear();
  }
}

vi.mock('idb', () => ({
  openDB: vi.fn(async () => ({
    get: async (storeName: StoreName, key: string) => indexedDbStores[storeName].get(key),
    transaction: (storeNames: string[], mode: string) => {
      void storeNames;
      void mode;
      return {
        objectStore: (storeName: StoreName) => ({
          put: async (record: { slot: string; data: unknown }) => {
            indexedDbStores[storeName].set(record.slot, record);
          },
          delete: async (key: string) => {
            indexedDbStores[storeName].delete(key);
          },
        }),
        done: Promise.resolve(),
      };
    },
  })),
}));

vi.mock('../cloudSaveSystem', () => ({
  cloudDeleteSave: vi.fn(async () => false),
  cloudGetSaveMetadata: vi.fn(async () => []),
  cloudLoadGame: vi.fn(async () => null),
  cloudSaveGame: vi.fn(async () => false),
  isCloudSaveConfigured: vi.fn(() => false),
}));

describe('save-system auto-save lifecycle', () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
    resetIndexedDbStores();
  });

  it('removes completed auto-saves instead of keeping them resumable', async () => {
    const { autoSave, getSaveMetadata, initSaveSystem, loadGame } = await import('../saveSystem');

    initSaveSystem();

    const activeGame = createNewGame('Alex', 'normal');
    await autoSave(activeGame);

    expect((await getSaveMetadata()).find((slot) => slot.slot === 'auto')?.exists).toBe(true);

    const completedGame = {
      ...activeGame,
      currentTurn: 100,
      isGameOver: true,
      finalGrade: 'B' as const,
      finalRank: 'Seasoned Investor',
      updatedAt: new Date(activeGame.updatedAt.getTime() + 1_000),
    };

    await autoSave(completedGame);

    expect((await getSaveMetadata()).find((slot) => slot.slot === 'auto')?.exists).toBe(false);
    expect(await loadGame('auto')).toBeNull();
    expect(localStorage.getItem(AUTO_SAVE_KEY)).toBe('null');
  });

  it('cleans up stale completed auto-saves found while reading metadata', async () => {
    const { getSaveMetadata, initSaveSystem } = await import('../saveSystem');

    initSaveSystem();

    const completedGame = {
      ...createNewGame('Legacy Trader', 'normal'),
      currentTurn: 100,
      isGameOver: true,
      finalGrade: 'C' as const,
      finalRank: 'Survivor',
    };

    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(completedGame));

    expect((await getSaveMetadata()).find((slot) => slot.slot === 'auto')?.exists).toBe(false);
    expect(localStorage.getItem(AUTO_SAVE_KEY)).toBe('null');
  });
});
