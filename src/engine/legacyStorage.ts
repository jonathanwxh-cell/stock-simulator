import type { LegacyEnding, LegacyPathOffer, LegacyRecord } from './legacyStory';

export const LEGACY_STORAGE_KEY = 'marketmaster_legacy_saga_v1';

export function createEmptyLegacyRecord(): LegacyRecord {
  return {
    version: 1,
    fundId: 'fund_local_legacy',
    endings: [],
    chosenPaths: [],
    seenEventIds: [],
  };
}

function parseRecord(raw: string | null): LegacyRecord {
  if (!raw) return createEmptyLegacyRecord();

  try {
    const parsed = JSON.parse(raw) as Partial<LegacyRecord>;
    if (parsed.version !== 1) return createEmptyLegacyRecord();
    return {
      version: 1,
      fundId: typeof parsed.fundId === 'string' ? parsed.fundId : 'fund_local_legacy',
      endings: Array.isArray(parsed.endings) ? parsed.endings : [],
      chosenPaths: Array.isArray(parsed.chosenPaths) ? parsed.chosenPaths : [],
      seenEventIds: Array.isArray(parsed.seenEventIds) ? parsed.seenEventIds : [],
    };
  } catch {
    return createEmptyLegacyRecord();
  }
}

export function loadLegacyRecord(): LegacyRecord {
  if (typeof localStorage === 'undefined') return createEmptyLegacyRecord();
  return parseRecord(localStorage.getItem(LEGACY_STORAGE_KEY));
}

export function saveLegacyRecord(record: LegacyRecord): LegacyRecord {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(record));
  }
  return record;
}

export function recordLegacyEnding(ending: LegacyEnding): LegacyRecord {
  const record = loadLegacyRecord();
  const endings = record.endings.some((entry) => entry.runId === ending.runId)
    ? record.endings
    : [...record.endings, ending].slice(-30);

  return saveLegacyRecord({
    ...record,
    endings,
  });
}

export function recordLegacyChoice(ending: LegacyEnding, offer: LegacyPathOffer): LegacyRecord {
  const record = recordLegacyEnding(ending);
  return saveLegacyRecord({
    ...record,
    chosenPaths: [
      ...record.chosenPaths,
      {
        offerId: offer.id,
        endingId: ending.id,
        chosenAt: new Date().toISOString(),
        seasonNumber: ending.seasonNumber,
      },
    ].slice(-50),
  });
}
