import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNewGame } from '../gameState';

const AUTO_SAVE_KEY = 'marketmaster_autosave';

const cloudSaveMocks = vi.hoisted(() => ({
  cloudDeleteSave: vi.fn(async () => false),
  cloudGetSaveMetadata: vi.fn(async () => []),
  cloudLoadGame: vi.fn(async () => null),
  cloudSaveGame: vi.fn(async () => false),
  isCloudSaveConfigured: vi.fn(() => false),
}));

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

vi.mock('../cloudSaveSystem', () => cloudSaveMocks);

describe('save-system auto-save lifecycle', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
    cloudSaveMocks.cloudDeleteSave.mockResolvedValue(false);
    cloudSaveMocks.cloudGetSaveMetadata.mockResolvedValue([]);
    cloudSaveMocks.cloudLoadGame.mockResolvedValue(null);
    cloudSaveMocks.cloudSaveGame.mockResolvedValue(false);
    cloudSaveMocks.isCloudSaveConfigured.mockReturnValue(false);
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

  it('rejects imported saves with unexpected top-level or stock fields', async () => {
    const { importSave } = await import('../saveSystem');
    const validGame = createNewGame('Import Guard', 'normal');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(importSave(JSON.stringify(validGame))).not.toBeNull();
    expect(importSave(JSON.stringify({ ...validGame, injectedPayload: true }))).toBeNull();
    expect(importSave(JSON.stringify({
      ...validGame,
      stocks: [{ ...validGame.stocks[0], unexpectedField: '<script>alert(1)</script>' }],
    }))).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('coalesces rapid auto cloud saves while leaving manual cloud saves immediate', async () => {
    vi.useFakeTimers();
    cloudSaveMocks.isCloudSaveConfigured.mockReturnValue(true);
    const { saveGame } = await import('../saveSystem');
    const firstGame = createNewGame('Cloud Throttle', 'normal');
    const latestGame = {
      ...createNewGame('Latest Auto', 'normal'),
      currentTurn: 2,
    };

    await saveGame('auto', firstGame);
    expect(cloudSaveMocks.cloudSaveGame).toHaveBeenCalledTimes(1);
    expect(cloudSaveMocks.cloudSaveGame).toHaveBeenLastCalledWith('auto', firstGame);

    await saveGame('auto', latestGame);
    expect(cloudSaveMocks.cloudSaveGame).toHaveBeenCalledTimes(1);

    await saveGame(1, latestGame);
    expect(cloudSaveMocks.cloudSaveGame).toHaveBeenCalledTimes(2);
    expect(cloudSaveMocks.cloudSaveGame).toHaveBeenLastCalledWith(1, latestGame);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(cloudSaveMocks.cloudSaveGame).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(cloudSaveMocks.cloudSaveGame).toHaveBeenCalledTimes(3);
    expect(cloudSaveMocks.cloudSaveGame).toHaveBeenLastCalledWith('auto', latestGame);
  });
});
