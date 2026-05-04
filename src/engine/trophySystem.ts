import { getAlphaPct } from './marketIndex';
import { getNetWorth } from './marketSimulator';
import { getLatestRisk } from './riskSystem';
import type { ChallengeModeId, CareerStyle, GameState, PlayerTradeType, Sector } from './types';

const TROPHY_STORAGE_KEY = 'marketmaster_trophy_case_v1';

export type TrophyCollectionId =
  | 'first_steps'
  | 'trading_styles'
  | 'market_mastery'
  | 'risk_control'
  | 'collector_badges';

export type TrophyRarity = 'bronze' | 'silver' | 'gold' | 'prismatic';

export type TrophyArtKey =
  | 'opening_bell'
  | 'green_ticket'
  | 'profit_stamp'
  | 'watch_star'
  | 'calendar_gate'
  | 'board_table'
  | 'clock_order'
  | 'career_flame'
  | 'growth_vine'
  | 'coin_fountain'
  | 'macro_compass'
  | 'contrarian_mask'
  | 'short_anchor'
  | 'long_laurel'
  | 'small_rocket'
  | 'bear_shield'
  | 'dividend_tree'
  | 'alpha_arrow'
  | 'market_crown'
  | 'six_figure_vault'
  | 'million_tower'
  | 'crystal_grade'
  | 'season_bridge'
  | 'streak_obelisk'
  | 'calm_shield'
  | 'no_margin_wings'
  | 'long_only_crest'
  | 'phoenix_chart'
  | 'cash_cushion'
  | 'sector_wheel'
  | 'dividend_cup'
  | 'catalyst_spark'
  | 'explorer_map'
  | 'challenge_prism';

export interface TrophyDefinition {
  id: string;
  title: string;
  description: string;
  collectionId: TrophyCollectionId;
  rarity: TrophyRarity;
  artKey: TrophyArtKey;
  condition: (state: GameState) => boolean;
}

export interface TrophyCollectionDefinition {
  id: TrophyCollectionId;
  title: string;
  description: string;
}

export interface TrophyUnlock {
  trophyId: string;
  unlockedAt: string;
  unlockedTurn: number;
  runId?: string;
  seasonNumber: number;
}

export interface TrophyCase {
  unlocked: Record<string, TrophyUnlock>;
}

export interface TrophyEvaluation {
  trophyCase: TrophyCase;
  newUnlocks: TrophyUnlock[];
}

export interface TrophyCollectionSummary {
  id: TrophyCollectionId;
  title: string;
  description: string;
  unlocked: number;
  total: number;
  completionPct: number;
  trophies: Array<{
    definition: TrophyDefinition;
    unlock: TrophyUnlock | null;
  }>;
}

const PLAYER_TRADE_TYPES: PlayerTradeType[] = [
  'buy',
  'sell',
  'short',
  'cover',
  'limit_buy',
  'limit_sell',
  'stop_loss',
  'take_profit',
];

export const TROPHY_COLLECTIONS: TrophyCollectionDefinition[] = [
  {
    id: 'first_steps',
    title: 'First Steps',
    description: 'Early fund milestones that teach the core loop.',
  },
  {
    id: 'trading_styles',
    title: 'Trading Styles',
    description: 'Proof that you tried different fund identities and challenge rules.',
  },
  {
    id: 'market_mastery',
    title: 'Market Mastery',
    description: 'Big performance moments, season wins, and benchmark dominance.',
  },
  {
    id: 'risk_control',
    title: 'Risk Control',
    description: 'Calm, disciplined play under pressure.',
  },
  {
    id: 'collector_badges',
    title: 'Collector Badges',
    description: 'Breadth goals for sectors, catalysts, dividends, and modes.',
  },
];

function hasTransaction(state: GameState, types: Array<PlayerTradeType | 'dividend' | 'mission_reward'>): boolean {
  return state.transactionHistory.some((transaction) => types.includes(transaction.type as PlayerTradeType));
}

function isCompletedRun(state: GameState): boolean {
  return state.isGameOver && state.finalGrade !== null;
}

function isWinningGrade(state: GameState): boolean {
  return state.finalGrade === 'S' || state.finalGrade === 'A' || state.finalGrade === 'B' || state.finalGrade === 'C';
}

function completedSeasonCount(state: GameState): number {
  const completedCareerSeasons = state.career.seasons.filter((season) => season.completedAtTurn !== undefined).length;
  return completedCareerSeasons + (isCompletedRun(state) ? 1 : 0);
}

function hasStyle(state: GameState, style: CareerStyle): boolean {
  return state.career.style === style;
}

function hasChallenge(state: GameState, challengeMode: ChallengeModeId): boolean {
  return state.career.challengeMode === challengeMode || state.career.seasons.some((season) => season.challengeMode === challengeMode);
}

function sampledChallengeCount(state: GameState): number {
  return new Set([
    state.career.challengeMode,
    ...state.career.seasons.map((season) => season.challengeMode),
  ]).size;
}

function currentHoldingSectors(state: GameState): Set<Sector> {
  const sectors = new Set<Sector>();
  for (const stockId of Object.keys(state.portfolio)) {
    const stock = state.stocks.find((entry) => entry.id === stockId);
    if (stock && state.portfolio[stockId]?.shares > 0) sectors.add(stock.sector);
  }
  for (const stockId of Object.keys(state.shortPositions)) {
    const stock = state.stocks.find((entry) => entry.id === stockId);
    if (stock && state.shortPositions[stockId]?.shares > 0) sectors.add(stock.sector);
  }
  return sectors;
}

function everTouchedSectors(state: GameState): Set<Sector> {
  const sectors = currentHoldingSectors(state);
  for (const transaction of state.transactionHistory) {
    const stock = state.stocks.find((entry) => entry.id === transaction.stockId);
    if (stock) sectors.add(stock.sector);
  }
  return sectors;
}

function recoveredFromDrawdown(state: GameState): boolean {
  let peak = state.netWorthHistory[0]?.netWorth ?? getNetWorth(state);
  let drawdownExceeded = false;
  for (const snapshot of state.netWorthHistory) {
    if (snapshot.netWorth > peak) peak = snapshot.netWorth;
    if (peak > 0 && (peak - snapshot.netWorth) / peak >= 0.15) drawdownExceeded = true;
  }
  const latest = state.netWorthHistory[state.netWorthHistory.length - 1]?.netWorth ?? getNetWorth(state);
  return drawdownExceeded && latest >= peak * 0.98;
}

function latestCashRatio(state: GameState): number {
  const netWorth = Math.max(getNetWorth(state), 1);
  return state.cash / netWorth;
}

export const TROPHY_DEFINITIONS: TrophyDefinition[] = [
  {
    id: 'first_trade',
    title: 'Ticket Punched',
    description: 'Place your first trade.',
    collectionId: 'first_steps',
    rarity: 'bronze',
    artKey: 'green_ticket',
    condition: (state) => hasTransaction(state, PLAYER_TRADE_TYPES),
  },
  {
    id: 'first_buy',
    title: 'Opening Bell',
    description: 'Buy your first share.',
    collectionId: 'first_steps',
    rarity: 'bronze',
    artKey: 'opening_bell',
    condition: (state) => hasTransaction(state, ['buy', 'limit_buy']),
  },
  {
    id: 'first_sale',
    title: 'Profit Stamp',
    description: 'Sell shares or trigger a planned exit.',
    collectionId: 'first_steps',
    rarity: 'bronze',
    artKey: 'profit_stamp',
    condition: (state) => hasTransaction(state, ['sell', 'limit_sell', 'stop_loss', 'take_profit']),
  },
  {
    id: 'first_watch',
    title: 'On The Radar',
    description: 'Add a stock to the watchlist.',
    collectionId: 'first_steps',
    rarity: 'bronze',
    artKey: 'watch_star',
    condition: (state) => state.watchlist.length > 0,
  },
  {
    id: 'first_turn',
    title: 'One More Month',
    description: 'Advance the market by one turn.',
    collectionId: 'first_steps',
    rarity: 'bronze',
    artKey: 'calendar_gate',
    condition: (state) => state.currentTurn >= 1,
  },
  {
    id: 'first_board_review',
    title: 'Boardroom Debut',
    description: 'Receive your first board review.',
    collectionId: 'first_steps',
    rarity: 'silver',
    artKey: 'board_table',
    condition: (state) => state.career.boardReviews.length > 0,
  },
  {
    id: 'plan_ahead',
    title: 'Clockwork Order',
    description: 'Use a future order or protective exit.',
    collectionId: 'first_steps',
    rarity: 'silver',
    artKey: 'clock_order',
    condition: (state) =>
      state.limitOrders.length > 0 ||
      (state.conditionalOrders?.length ?? 0) > 0 ||
      hasTransaction(state, ['limit_buy', 'limit_sell', 'stop_loss', 'take_profit']),
  },
  {
    id: 'first_season_complete',
    title: 'Season Signed',
    description: 'Complete your first season.',
    collectionId: 'first_steps',
    rarity: 'silver',
    artKey: 'career_flame',
    condition: (state) => completedSeasonCount(state) >= 1,
  },
  {
    id: 'growth_hunter',
    title: 'Growth Vine',
    description: 'Start a fund as a Growth Hunter.',
    collectionId: 'trading_styles',
    rarity: 'bronze',
    artKey: 'growth_vine',
    condition: (state) => hasStyle(state, 'growth_hunter'),
  },
  {
    id: 'dividend_baron',
    title: 'Coin Fountain',
    description: 'Start a fund as a Dividend Baron.',
    collectionId: 'trading_styles',
    rarity: 'bronze',
    artKey: 'coin_fountain',
    condition: (state) => hasStyle(state, 'dividend_baron'),
  },
  {
    id: 'macro_surfer',
    title: 'Macro Compass',
    description: 'Start a fund as a Macro Surfer.',
    collectionId: 'trading_styles',
    rarity: 'bronze',
    artKey: 'macro_compass',
    condition: (state) => hasStyle(state, 'macro_surfer'),
  },
  {
    id: 'contrarian',
    title: 'Contrarian Mask',
    description: 'Start a fund as a Contrarian.',
    collectionId: 'trading_styles',
    rarity: 'bronze',
    artKey: 'contrarian_mask',
    condition: (state) => hasStyle(state, 'contrarian'),
  },
  {
    id: 'short_shark',
    title: 'Short Anchor',
    description: 'Start a fund as a Short Shark.',
    collectionId: 'trading_styles',
    rarity: 'silver',
    artKey: 'short_anchor',
    condition: (state) => hasStyle(state, 'short_shark'),
  },
  {
    id: 'long_only_player',
    title: 'Long Laurel',
    description: 'Play a Long-Only Mandate challenge.',
    collectionId: 'trading_styles',
    rarity: 'silver',
    artKey: 'long_laurel',
    condition: (state) => hasChallenge(state, 'no_shorts'),
  },
  {
    id: 'small_cap_player',
    title: 'Small-Cap Rocket',
    description: 'Play a Small-Cap Sprint challenge.',
    collectionId: 'trading_styles',
    rarity: 'silver',
    artKey: 'small_rocket',
    condition: (state) => hasChallenge(state, 'small_cap_sprint'),
  },
  {
    id: 'bear_market_player',
    title: 'Bear Shield',
    description: 'Play a Bear Market Brief challenge.',
    collectionId: 'trading_styles',
    rarity: 'silver',
    artKey: 'bear_shield',
    condition: (state) => hasChallenge(state, 'bear_market'),
  },
  {
    id: 'dividend_builder_player',
    title: 'Dividend Tree',
    description: 'Play a Dividend Builder challenge.',
    collectionId: 'trading_styles',
    rarity: 'silver',
    artKey: 'dividend_tree',
    condition: (state) => hasChallenge(state, 'dividend_focus'),
  },
  {
    id: 'positive_alpha',
    title: 'Alpha Arrow',
    description: 'Outperform the market benchmark.',
    collectionId: 'market_mastery',
    rarity: 'silver',
    artKey: 'alpha_arrow',
    condition: (state) => state.currentTurn > 0 && getAlphaPct(state) > 0,
  },
  {
    id: 'market_beater_10',
    title: 'Market Crown',
    description: 'Beat the market by at least 10 percentage points.',
    collectionId: 'market_mastery',
    rarity: 'gold',
    artKey: 'market_crown',
    condition: (state) => state.currentTurn > 0 && getAlphaPct(state) >= 10,
  },
  {
    id: 'six_figure_fund',
    title: 'Six-Figure Vault',
    description: 'Grow net worth to at least $100,000.',
    collectionId: 'market_mastery',
    rarity: 'gold',
    artKey: 'six_figure_vault',
    condition: (state) => getNetWorth(state) >= 100_000,
  },
  {
    id: 'millionaire_fund',
    title: 'Million-Dollar Tower',
    description: 'Grow net worth to at least $1,000,000.',
    collectionId: 'market_mastery',
    rarity: 'prismatic',
    artKey: 'million_tower',
    condition: (state) => getNetWorth(state) >= 1_000_000,
  },
  {
    id: 's_rank_season',
    title: 'Crystal S-Rank',
    description: 'Finish a season with an S grade.',
    collectionId: 'market_mastery',
    rarity: 'prismatic',
    artKey: 'crystal_grade',
    condition: (state) => state.finalGrade === 'S',
  },
  {
    id: 'season_two',
    title: 'Season Bridge',
    description: 'Continue into a second career season.',
    collectionId: 'market_mastery',
    rarity: 'gold',
    artKey: 'season_bridge',
    condition: (state) => state.career.seasonNumber >= 2,
  },
  {
    id: 'three_season_streak',
    title: 'Streak Obelisk',
    description: 'Complete three career seasons.',
    collectionId: 'market_mastery',
    rarity: 'prismatic',
    artKey: 'streak_obelisk',
    condition: (state) => completedSeasonCount(state) >= 3,
  },
  {
    id: 'calm_hands',
    title: 'Calm Hands',
    description: 'Hold a low-risk profile after the first few turns.',
    collectionId: 'risk_control',
    rarity: 'silver',
    artKey: 'calm_shield',
    condition: (state) => state.currentTurn >= 3 && getLatestRisk(state).level === 'low',
  },
  {
    id: 'no_margin_win',
    title: 'No-Margin Wings',
    description: 'Finish a winning season without active margin pressure.',
    collectionId: 'risk_control',
    rarity: 'gold',
    artKey: 'no_margin_wings',
    condition: (state) => isCompletedRun(state) && isWinningGrade(state) && state.marginUsed <= 0,
  },
  {
    id: 'long_only_legend',
    title: 'Long-Only Legend',
    description: 'Finish a winning Long-Only Mandate season.',
    collectionId: 'risk_control',
    rarity: 'gold',
    artKey: 'long_only_crest',
    condition: (state) => isCompletedRun(state) && isWinningGrade(state) && hasChallenge(state, 'no_shorts'),
  },
  {
    id: 'phoenix_chart',
    title: 'Phoenix Chart',
    description: 'Recover from a 15% drawdown and reclaim the high-water mark.',
    collectionId: 'risk_control',
    rarity: 'gold',
    artKey: 'phoenix_chart',
    condition: recoveredFromDrawdown,
  },
  {
    id: 'cash_cushion',
    title: 'Cash Cushion',
    description: 'Keep at least 25% of net worth in cash after turn six.',
    collectionId: 'risk_control',
    rarity: 'silver',
    artKey: 'cash_cushion',
    condition: (state) => state.currentTurn >= 6 && latestCashRatio(state) >= 0.25,
  },
  {
    id: 'sector_wheel',
    title: 'Sector Wheel',
    description: 'Touch at least six different sectors through holdings or trades.',
    collectionId: 'collector_badges',
    rarity: 'gold',
    artKey: 'sector_wheel',
    condition: (state) => everTouchedSectors(state).size >= 6,
  },
  {
    id: 'dividend_cup',
    title: 'Dividend Cup',
    description: 'Collect your first dividend payout.',
    collectionId: 'collector_badges',
    rarity: 'silver',
    artKey: 'dividend_cup',
    condition: (state) => state.totalDividendsReceived > 0 || hasTransaction(state, ['dividend']),
  },
  {
    id: 'catalyst_spark',
    title: 'Catalyst Spark',
    description: 'See at least three catalyst-driven news events.',
    collectionId: 'collector_badges',
    rarity: 'silver',
    artKey: 'catalyst_spark',
    condition: (state) => state.newsHistory.filter((event) => event.source === 'catalyst').length >= 3,
  },
  {
    id: 'explorer_map',
    title: 'Explorer Map',
    description: 'Track at least five stocks on the watchlist.',
    collectionId: 'collector_badges',
    rarity: 'silver',
    artKey: 'explorer_map',
    condition: (state) => state.watchlist.length >= 5,
  },
  {
    id: 'challenge_prism',
    title: 'Challenge Prism',
    description: 'Sample at least three different challenge modes.',
    collectionId: 'collector_badges',
    rarity: 'prismatic',
    artKey: 'challenge_prism',
    condition: (state) => sampledChallengeCount(state) >= 3,
  },
];

export function createEmptyTrophyCase(): TrophyCase {
  return { unlocked: {} };
}

function normalizeTrophyCase(input: unknown): TrophyCase {
  if (!input || typeof input !== 'object') return createEmptyTrophyCase();
  const maybeCase = input as Partial<TrophyCase>;
  if (!maybeCase.unlocked || typeof maybeCase.unlocked !== 'object') return createEmptyTrophyCase();

  const knownIds = new Set(TROPHY_DEFINITIONS.map((definition) => definition.id));
  const unlocked: Record<string, TrophyUnlock> = {};
  for (const [id, unlock] of Object.entries(maybeCase.unlocked)) {
    if (!knownIds.has(id) || !unlock || typeof unlock !== 'object') continue;
    const candidate = unlock as Partial<TrophyUnlock>;
    if (candidate.trophyId !== id || typeof candidate.unlockedAt !== 'string') continue;
    unlocked[id] = {
      trophyId: id,
      unlockedAt: candidate.unlockedAt,
      unlockedTurn: typeof candidate.unlockedTurn === 'number' ? candidate.unlockedTurn : 0,
      runId: typeof candidate.runId === 'string' ? candidate.runId : undefined,
      seasonNumber: typeof candidate.seasonNumber === 'number' ? candidate.seasonNumber : 1,
    };
  }
  return { unlocked };
}

export function loadTrophyCase(): TrophyCase {
  if (typeof localStorage === 'undefined') return createEmptyTrophyCase();
  try {
    return normalizeTrophyCase(JSON.parse(localStorage.getItem(TROPHY_STORAGE_KEY) || 'null'));
  } catch {
    return createEmptyTrophyCase();
  }
}

export function saveTrophyCase(trophyCase: TrophyCase): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(TROPHY_STORAGE_KEY, JSON.stringify(normalizeTrophyCase(trophyCase)));
  } catch {
    // Trophy collection should never block the core trading loop.
  }
}

export function evaluateTrophies(
  state: GameState,
  trophyCase: TrophyCase = loadTrophyCase(),
  now: Date = new Date(),
): TrophyEvaluation {
  const normalized = normalizeTrophyCase(trophyCase);
  const unlocked = { ...normalized.unlocked };
  const newUnlocks: TrophyUnlock[] = [];

  for (const definition of TROPHY_DEFINITIONS) {
    if (unlocked[definition.id]) continue;
    if (!definition.condition(state)) continue;

    const unlock: TrophyUnlock = {
      trophyId: definition.id,
      unlockedAt: now.toISOString(),
      unlockedTurn: state.currentTurn,
      runId: state.runId,
      seasonNumber: state.career?.seasonNumber ?? 1,
    };
    unlocked[definition.id] = unlock;
    newUnlocks.push(unlock);
  }

  return {
    trophyCase: { unlocked },
    newUnlocks,
  };
}

export function recordTrophyProgress(state: GameState): TrophyEvaluation {
  const result = evaluateTrophies(state, loadTrophyCase());
  if (result.newUnlocks.length > 0) saveTrophyCase(result.trophyCase);
  return result;
}

export function getTrophyDefinition(trophyId: string): TrophyDefinition | null {
  return TROPHY_DEFINITIONS.find((definition) => definition.id === trophyId) ?? null;
}

export function summarizeTrophyCollections(trophyCase: TrophyCase = loadTrophyCase()): TrophyCollectionSummary[] {
  const normalized = normalizeTrophyCase(trophyCase);
  return TROPHY_COLLECTIONS.map((collection) => {
    const trophies = TROPHY_DEFINITIONS
      .filter((definition) => definition.collectionId === collection.id)
      .map((definition) => ({
        definition,
        unlock: normalized.unlocked[definition.id] ?? null,
      }));
    const unlocked = trophies.filter((trophy) => trophy.unlock).length;
    const total = trophies.length;
    return {
      ...collection,
      unlocked,
      total,
      completionPct: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      trophies,
    };
  });
}
