import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { buildLegacyEnding, buildLegacyOffers } from '../legacyStory';
import {
  LEGACY_STORAGE_KEY,
  createEmptyLegacyRecord,
  loadLegacyRecord,
  recordLegacyChoice,
  recordLegacyEnding,
} from '../legacyStorage';

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

describe('legacy saga storage', () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
  });

  it('loads an empty versioned record when storage is empty', () => {
    const record = loadLegacyRecord();

    expect(record).toEqual(createEmptyLegacyRecord());
    expect(record.version).toBe(1);
    expect(record.endings).toEqual([]);
  });

  it('records completed endings once per run id', () => {
    const state = createNewGame('Archive Tester', 'normal');
    state.isGameOver = true;
    state.finalGrade = 'A';
    state.runId = 'archive-run';
    const ending = buildLegacyEnding(state);

    recordLegacyEnding(ending);
    recordLegacyEnding(ending);

    const record = loadLegacyRecord();
    expect(record.endings).toHaveLength(1);
    expect(record.endings[0].runId).toBe('archive-run');
  });

  it('records chosen paths with the source ending id', () => {
    const state = createNewGame('Choice Tester', 'normal');
    state.isGameOver = true;
    state.finalGrade = 'B';
    const ending = buildLegacyEnding(state);
    const offer = buildLegacyOffers(state, ending)[0];

    recordLegacyChoice(ending, offer);

    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const record = loadLegacyRecord();
    expect(record.chosenPaths).toHaveLength(1);
    expect(record.chosenPaths[0]).toMatchObject({ endingId: ending.id, offerId: offer.id, seasonNumber: ending.seasonNumber });
  });
});
