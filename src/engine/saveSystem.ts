import type { GameState, SaveMetadata, Stock } from './types';
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { z } from 'zod';
import { cloudDeleteSave, cloudGetSaveMetadata, cloudLoadGame, cloudSaveGame, isCloudSaveConfigured } from './cloudSaveSystem';
import { createInitialMacroEnvironment } from './macroSystem';
import { ensureCareerState } from './careerSystem';
import { getCareerSeasonTurnLimit } from './careerSeasons';
import { initialMarketIndex } from './marketIndex';
import { createInitialRegime } from './regimeSystem';
import { calculateRisk } from './riskSystem';
import { createMission } from './missionSystem';
import { defaultRNG } from './rng';
import { ensureUpcomingCatalysts } from './catalystSystem';

// ============================================================================
// Save schema versioning
// ============================================================================
// Bump SAVE_VERSION when the saved JSON shape changes in a way that requires
// migration. Add a new entry to MIGRATIONS keyed by the OLD version that
// produces the next-newer version. Saves with __saveVersion === SAVE_VERSION
// are loaded as-is. Unversioned saves (legacy from pre-v1.6.x) are treated
// as version 0 and run through every migration. Saves with a version higher
// than SAVE_VERSION are rejected — we don't downgrade.
export const SAVE_VERSION = 1;

// Each migration takes a save at version N and returns one at version N+1.
// Inputs/outputs are deliberately typed as `unknown` — migrations operate on
// raw JSON shapes, not GameState directly, because the type *is* what the
// migration is changing.
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  // 0 -> 1: legacy unversioned saves. Pre-v1.6.x didn't track save versions;
  // the field defaulting that GameContext.migrateGameState used to do moves
  // here. Once a save is loaded and re-saved, it gets stamped __saveVersion:1
  // and skips this migration on subsequent loads.
  0: (raw) => migrate_v0_to_v1(raw),
};

function migrate_v0_to_v1(raw: Record<string, unknown>): Record<string, unknown> {
  // Legacy ad-hoc field defaulting. GameState shape evolved through v1.0–v1.5
  // without a versioned migrator, so we backfill anything missing here.
  const macroEnvironment = (raw.macroEnvironment as object | undefined) ?? createInitialMacroEnvironment();
  const stocks = Array.isArray(raw.stocks) ? raw.stocks as Array<Record<string, unknown>> : [];
  const playerName = typeof raw.playerName === 'string' ? raw.playerName : 'Trader';
  const difficulty = typeof raw.difficulty === 'string' ? raw.difficulty : 'normal';
  const createdAt = raw.createdAt ?? new Date().toISOString();
  const out: Record<string, unknown> = {
    ...raw,
    runId: typeof raw.runId === 'string' ? raw.runId : `legacy:${playerName}:${difficulty}:${new Date(createdAt as string).toISOString()}`,
    leaderboardEntryId: raw.leaderboardEntryId ?? null,
    career: ensureCareerState(raw as unknown as GameState),
    shortPositions: raw.shortPositions ?? {},
    limitOrders: Array.isArray(raw.limitOrders) ? raw.limitOrders : [],
    conditionalOrders: Array.isArray(raw.conditionalOrders) ? raw.conditionalOrders : [],
    marginUsed: typeof raw.marginUsed === 'number' ? raw.marginUsed : 0,
    totalFeesPaid: typeof raw.totalFeesPaid === 'number' ? raw.totalFeesPaid : 0,
    totalDividendsReceived: typeof raw.totalDividendsReceived === 'number' ? raw.totalDividendsReceived : 0,
    marketIndexHistory: Array.isArray(raw.marketIndexHistory) && raw.marketIndexHistory.length ? raw.marketIndexHistory : initialMarketIndex(),
    currentRegime: raw.currentRegime ?? createInitialRegime(),
    riskHistory: Array.isArray(raw.riskHistory) ? raw.riskHistory : [],
    activeMission: raw.activeMission ?? null,
    completedMissions: Array.isArray(raw.completedMissions) ? raw.completedMissions : [],
    lastAdvisorFeedback: Array.isArray(raw.lastAdvisorFeedback) ? raw.lastAdvisorFeedback : [],
    macroEnvironment,
    macroHistory: Array.isArray(raw.macroHistory) && raw.macroHistory.length ? raw.macroHistory : [macroEnvironment],
    watchlist: Array.isArray(raw.watchlist) ? raw.watchlist : [],
    catalystCalendar: Array.isArray(raw.catalystCalendar) ? raw.catalystCalendar : [],
    stocks: stocks.map((s) => ({ ...s, beta: s.beta ?? 1, splitMultiplier: s.splitMultiplier ?? 1 })),
  };
  // Post-migration consistency: derived state that must exist for a runnable game.
  const asState = out as unknown as GameState;
  if (!Array.isArray(out.riskHistory) || (out.riskHistory as unknown[]).length === 0) {
    out.riskHistory = [calculateRisk(asState)];
  }
  if (!out.activeMission && !out.isGameOver) {
    out.activeMission = createMission(asState, defaultRNG);
  }
  if (!out.isGameOver) {
    out.catalystCalendar = ensureUpcomingCatalysts(asState, asState.catalystCalendar || [], defaultRNG);
  }
  return out;
}

// Read the version off a raw save. Treats missing/invalid as 0 (legacy).
function getSaveVersion(raw: Record<string, unknown>): number {
  const v = raw.__saveVersion;
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
}

// Walk a raw save through every migration needed to reach SAVE_VERSION.
// Returns null if the save is from a future version (build is older than save).
function migrateToCurrent(raw: Record<string, unknown>): Record<string, unknown> | null {
  let version = getSaveVersion(raw);
  if (version > SAVE_VERSION) {
    console.warn(`Save is from a newer build (__saveVersion=${version}, this build supports up to ${SAVE_VERSION}). Refusing to load.`);
    return null;
  }
  let current = raw;
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      console.warn(`No migration from save version ${version} to ${version + 1}. Refusing to load.`);
      return null;
    }
    current = migrate(current);
    version += 1;
    current.__saveVersion = version;
  }
  return current;
}

// Storage keys are intentionally prefixed `marketmaster_*` rather than
// `stocksim_*`. The project was renamed from "Market Master" to "Stock
// Simulator" but renaming the keys would orphan every existing player's
// saves — so the legacy prefix is preserved for save compatibility.
// Same applies to MarketMasterDB / DB_NAME below.
const SAVE_SLOTS_KEY = 'marketmaster_save_slots';
const AUTO_SAVE_KEY = 'marketmaster_autosave';
const SETTINGS_KEY = 'marketmaster_settings';
const LEADERBOARD_KEY = 'marketmaster_leaderboard';
const AUTO_CLOUD_SAVE_INTERVAL_MS = 5_000;

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
let lastAutoCloudSaveAt: number | null = null;
let queuedAutoCloudSave: GameState | null = null;
let autoCloudSaveTimer: ReturnType<typeof setTimeout> | null = null;

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

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const migrated = migrateToCurrent(parsed as Record<string, unknown>);
  if (!migrated) return null;
  return migrated as unknown as GameState;
}

function stripLargeData(state: GameState): Omit<GameState, 'stocks' | 'transactionHistory' | 'newsHistory'> & {
  stocks: Array<Omit<Stock, 'priceHistory'> & { priceHistory: [] }>;
  transactionHistory: [];
  newsHistory: [];
  __saveVersion: number;
} {
  return {
    ...state,
    __saveVersion: SAVE_VERSION,
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
    __saveVersion: number;
  };
}

const DateValueSchema = z.union([z.string(), z.date()]);
const SectorSchema = z.enum([
  'technology',
  'semiconductors',
  'healthcare',
  'biotech',
  'energy',
  'financials',
  'consumer',
  'media',
  'industrial',
  'realestate',
  'telecom',
  'materials',
]);
const CompanyTraitSchema = z.enum([
  'growth',
  'value',
  'defensive',
  'cyclical',
  'income',
  'speculative',
  'turnaround',
  'momentum',
]);
const CareerStyleSchema = z.enum([
  'balanced',
  'growth_hunter',
  'dividend_baron',
  'macro_surfer',
  'contrarian',
  'short_shark',
]);
const SeasonThemeIdSchema = z.enum([
  'opening_bell',
  'inflation_shock',
  'startup_boom',
  'credit_crunch',
  'dividend_decade',
  'ai_mania',
  'commodity_squeeze',
]);
const ChallengeModeIdSchema = z.enum([
  'standard',
  'bear_market',
  'dividend_focus',
  'no_shorts',
  'small_cap_sprint',
]);
const StockSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  sector: SectorSchema,
  description: z.string().optional(),
  basePrice: z.number().optional(),
  currentPrice: z.number(),
  priceHistory: z.array(z.object({ turn: z.number(), price: z.number() }).strict()).optional(),
  volatility: z.number().optional(),
  marketCap: z.enum(['small', 'mid', 'large', 'mega']).optional(),
  dividendYield: z.number().optional(),
  beta: z.number().optional(),
  splitMultiplier: z.number().optional(),
  traits: z.array(CompanyTraitSchema).optional(),
}).strict();
const PositionSchema = z.object({
  stockId: z.string(),
  shares: z.number(),
  avgCost: z.number(),
}).strict();
const ShortPositionSchema = z.object({
  stockId: z.string(),
  shares: z.number(),
  entryPrice: z.number(),
  marginUsed: z.number(),
}).strict();
const LimitOrderSchema = z.object({
  id: z.string(),
  stockId: z.string(),
  type: z.enum(['buy', 'sell']),
  shares: z.number(),
  targetPrice: z.number(),
  placedTurn: z.number(),
}).strict();
const ConditionalOrderSchema = z.object({
  id: z.string(),
  stockId: z.string(),
  type: z.enum(['stop_loss', 'take_profit']),
  shares: z.number(),
  triggerPrice: z.number(),
  placedTurn: z.number(),
}).strict();
const TransactionSchema = z.object({
  id: z.string(),
  date: DateValueSchema,
  turn: z.number(),
  stockId: z.string(),
  type: z.enum([
    'buy',
    'sell',
    'short',
    'cover',
    'limit_buy',
    'limit_sell',
    'stop_loss',
    'take_profit',
    'dividend',
    'fee',
    'margin_call',
    'split',
    'mission_reward',
  ]),
  shares: z.number(),
  price: z.number(),
  total: z.number(),
  fee: z.number(),
}).strict();
const NetWorthSnapshotSchema = z.object({
  turn: z.number(),
  date: DateValueSchema,
  netWorth: z.number(),
  cash: z.number(),
  portfolioValue: z.number(),
  shortLiability: z.number(),
  marginUsed: z.number(),
}).strict();
const MarketIndexSnapshotSchema = z.object({
  turn: z.number(),
  value: z.number(),
  changePct: z.number(),
}).strict();
const RiskSnapshotSchema = z.object({
  turn: z.number(),
  totalScore: z.number(),
  level: z.enum(['low', 'medium', 'high', 'extreme']),
  concentrationScore: z.number(),
  sectorScore: z.number(),
  cashBufferScore: z.number(),
  shortExposureScore: z.number(),
  drawdownScore: z.number(),
  warnings: z.array(z.string()),
}).strict();
const MarketRegimeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startTurn: z.number(),
  remainingTurns: z.number(),
  sectorEffects: z.record(z.string(), z.number()),
  volatilityMultiplier: z.number(),
  newsBias: z.record(z.string(), z.enum(['positive', 'negative'])).optional(),
}).strict();
const MissionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['performance', 'risk', 'diversification', 'income', 'tactical']),
  startTurn: z.number(),
  endTurn: z.number(),
  rewardCash: z.number(),
  status: z.enum(['active', 'completed', 'failed']),
  progress: z.number(),
  target: z.number(),
}).strict();
const AdvisorFeedbackSchema = z.object({
  headline: z.string(),
  body: z.string(),
  severity: z.enum(['info', 'warning', 'positive', 'danger']),
  tags: z.array(z.string()),
}).strict();
const MacroEnvironmentSchema = z.object({
  turn: z.number(),
  interestRate: z.number(),
  inflation: z.number(),
  growth: z.number(),
  creditStress: z.number(),
  oilPrice: z.number(),
  sentiment: z.number(),
  trends: z.record(z.string(), z.enum(['falling', 'stable', 'rising'])),
  narrative: z.string(),
}).strict();
const CatalystEventSchema = z.object({
  id: z.string(),
  stockId: z.string(),
  type: z.enum(['earnings', 'guidance', 'product_launch', 'analyst_day', 'regulatory']),
  volatility: z.enum(['medium', 'high']),
  scheduledTurn: z.number(),
  scheduledDate: DateValueSchema,
}).strict();
const NewsEventSchema = z.object({
  id: z.string(),
  turn: z.number(),
  date: DateValueSchema,
  headline: z.string(),
  description: z.string(),
  sector: z.union([SectorSchema, z.literal('all')]),
  impact: z.enum(['positive', 'negative', 'neutral']),
  magnitude: z.number(),
  affectedStocks: z.array(z.string()),
  source: z.enum(['random', 'scenario', 'catalyst']).optional(),
  catalystType: z.enum(['earnings', 'guidance', 'product_launch', 'analyst_day', 'regulatory']).optional(),
}).strict();
const ActiveScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.number(),
  totalDuration: z.number(),
  sectorEffects: z.record(z.string(), z.number()),
  events: z.array(NewsEventSchema),
}).strict();
const CareerObjectiveSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetLabel: z.string(),
  rewardLabel: z.string(),
  expiresTurn: z.number(),
  status: z.enum(['active', 'completed', 'failed']),
}).strict();
const CareerRivalFundSchema = z.object({
  id: z.string(),
  name: z.string(),
  style: CareerStyleSchema,
  archetypeLabel: z.string(),
  startingNetWorth: z.number(),
  netWorth: z.number(),
  returnPct: z.number(),
  lastTurnChangePct: z.number(),
  reputation: z.number(),
}).strict();
const CareerBoardReviewSchema = z.object({
  id: z.string(),
  turn: z.number(),
  date: DateValueSchema,
  grade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']),
  score: z.number(),
  headline: z.string(),
  summary: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  objective: CareerObjectiveSchema.nullable(),
}).strict();
const CareerSeasonSchema = z.object({
  seasonNumber: z.number(),
  themeId: SeasonThemeIdSchema,
  title: z.string(),
  description: z.string(),
  challengeMode: ChallengeModeIdSchema,
  startTurn: z.number(),
  startDate: DateValueSchema,
  startingNetWorth: z.number(),
  targetNetWorth: z.number(),
  turnLimit: z.number(),
  completedAtTurn: z.number().optional(),
  completedAtDate: DateValueSchema.optional(),
  completedNetWorth: z.number().optional(),
  completedGrade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']).nullable().optional(),
}).strict();
const CareerUnlockSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  earnedAtTurn: z.number(),
  seasonNumber: z.number(),
}).strict();
const CareerStateSchema = z.object({
  style: CareerStyleSchema,
  archetypeLabel: z.string(),
  selectedAt: DateValueSchema,
  startingNetWorth: z.number(),
  seasonNumber: z.number().optional(),
  seasonStartTurn: z.number().optional(),
  seasonStartNetWorth: z.number().optional(),
  activeSeasonThemeId: SeasonThemeIdSchema.optional(),
  challengeMode: ChallengeModeIdSchema.optional(),
  seasons: z.array(CareerSeasonSchema).optional(),
  unlocks: z.array(CareerUnlockSchema).optional(),
  rivalFunds: z.array(CareerRivalFundSchema),
  boardReviews: z.array(CareerBoardReviewSchema),
  currentObjective: CareerObjectiveSchema.nullable(),
  nextBoardReviewTurn: z.number(),
}).strict();

// Version-tolerant for older saves, but strict about unknown keys at every
// modeled level so imports cannot smuggle arbitrary state into the engine.
const ImportSaveSchema = z.object({
  __saveVersion: z.number().int().nonnegative().optional(),
  saveSlot: z.union([z.literal('auto'), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  runId: z.string().optional(),
  leaderboardEntryId: z.string().nullable().optional(),
  playerName: z.string(),
  career: CareerStateSchema.optional(),
  difficulty: z.enum(['easy', 'normal', 'hard', 'expert']),
  currentTurn: z.number().int().nonnegative(),
  currentDate: DateValueSchema,
  cash: z.number(),
  portfolio: z.record(z.string(), PositionSchema),
  shortPositions: z.record(z.string(), ShortPositionSchema),
  limitOrders: z.array(LimitOrderSchema),
  conditionalOrders: z.array(ConditionalOrderSchema).optional(),
  marginUsed: z.number(),
  totalFeesPaid: z.number().optional(),
  totalDividendsReceived: z.number().optional(),
  transactionHistory: z.array(TransactionSchema).optional(),
  netWorthHistory: z.array(NetWorthSnapshotSchema).optional(),
  marketIndexHistory: z.array(MarketIndexSnapshotSchema).optional(),
  currentRegime: MarketRegimeSchema.nullable().optional(),
  riskHistory: z.array(RiskSnapshotSchema).optional(),
  activeMission: MissionSchema.nullable().optional(),
  completedMissions: z.array(MissionSchema).optional(),
  lastAdvisorFeedback: z.array(AdvisorFeedbackSchema).optional(),
  macroEnvironment: MacroEnvironmentSchema.optional(),
  macroHistory: z.array(MacroEnvironmentSchema).optional(),
  watchlist: z.array(z.string()).optional(),
  catalystCalendar: z.array(CatalystEventSchema).optional(),
  stocks: z.array(StockSchema),
  newsHistory: z.array(NewsEventSchema).optional(),
  currentScenario: ActiveScenarioSchema.nullable().optional(),
  isGameOver: z.boolean(),
  finalRank: z.string().nullable().optional(),
  finalGrade: z.enum(['S', 'A', 'B', 'C', 'D', 'F']).nullable().optional(),
  createdAt: DateValueSchema,
  updatedAt: DateValueSchema,
}).strict();

function reviveDates(state: GameState): GameState {
  const macroEnvironment = state.macroEnvironment || createInitialMacroEnvironment();
  const revived = {
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
    macroEnvironment,
    macroHistory: state.macroHistory?.length ? state.macroHistory : [macroEnvironment],
    currentScenario: state.currentScenario ? {
      ...state.currentScenario,
      events: state.currentScenario.events.map(e => ({
        ...e,
        date: new Date(e.date),
      })),
    } : null,
  };

  return {
    ...revived,
    career: ensureCareerState(revived),
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
  if (slot === 'auto') {
    scheduleAutoCloudSave(gameState);
    return;
  }

  await persistCloudSave(slot, gameState);
}

async function persistCloudSave(slot: 1 | 2 | 3 | 'auto', gameState: GameState): Promise<void> {
  try {
    await cloudSaveGame(slot, gameState);
  } catch (e) {
    console.warn('Cloud save failed; local save preserved:', e);
  }
}

function scheduleAutoCloudSave(gameState: GameState): void {
  const now = Date.now();
  if (lastAutoCloudSaveAt === null || now - lastAutoCloudSaveAt >= AUTO_CLOUD_SAVE_INTERVAL_MS) {
    lastAutoCloudSaveAt = now;
    void persistCloudSave('auto', gameState);
    return;
  }

  queuedAutoCloudSave = gameState;
  if (autoCloudSaveTimer !== null) return;

  const delay = AUTO_CLOUD_SAVE_INTERVAL_MS - (now - lastAutoCloudSaveAt);
  autoCloudSaveTimer = setTimeout(() => {
    autoCloudSaveTimer = null;
    const pending = queuedAutoCloudSave;
    queuedAutoCloudSave = null;
    if (!pending) return;

    lastAutoCloudSaveAt = Date.now();
    void persistCloudSave('auto', pending);
  }, delay);
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
    const autoWithCareer = { ...auto, career: ensureCareerState(auto) };
    const cash = auto.cash || 0;
    const portfolioValue = (auto.netWorthHistory?.[auto.netWorthHistory.length - 1]?.portfolioValue) || 0;
    slots.push({
      slot: 'auto',
      playerName: auto.playerName || 'Unknown',
      difficulty,
      currentTurn: auto.currentTurn || 0,
      turnLimit: getCareerSeasonTurnLimit(autoWithCareer),
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
      const dataWithCareer = { ...data, career: ensureCareerState(data as GameState) };
      const cash = data.cash || 0;
      const portfolioValue = (data.netWorthHistory?.[data.netWorthHistory.length - 1]?.portfolioValue) || 0;
      slots.push({
        slot: slotNum,
        playerName: data.playerName || 'Unknown',
        difficulty,
        currentTurn: data.currentTurn || 0,
        turnLimit: getCareerSeasonTurnLimit(dataWithCareer),
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

  // Run version migration first — imported file may be from an older build.
  if (!parsed || typeof parsed !== 'object') return null;
  const migrated = migrateToCurrent(parsed as Record<string, unknown>);
  if (!migrated) return null;

  // Schema-validate before treating it as a GameState. This prevents corrupt
  // or malicious imports from crashing the app on first access.
  const result = ImportSaveSchema.safeParse(migrated);
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
