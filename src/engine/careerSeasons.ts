import { DIFFICULTY_CONFIGS } from './config';
import { roundCurrency } from './financialMath';
import type {
  CareerSeason,
  CareerState,
  CareerUnlock,
  ChallengeModeId,
  Difficulty,
  GameState,
  SeasonThemeId,
  Sector,
} from './types';

export interface SeasonTheme {
  id: SeasonThemeId;
  title: string;
  description: string;
  coachLine: string;
  volatilityMultiplier: number;
  scenarioChanceBonus: number;
  broadDriftPct: number;
  sectorEffects: Partial<Record<Sector, number>>;
  turnLimitBonus: number;
}

export interface ChallengeMode {
  id: ChallengeModeId;
  title: string;
  description: string;
  badge: string;
}

export const CHALLENGE_MODES: Record<ChallengeModeId, ChallengeMode> = {
  standard: {
    id: 'standard',
    title: 'Standard Career',
    description: 'The main career loop with changing season themes and board pressure.',
    badge: 'Core',
  },
  bear_market: {
    id: 'bear_market',
    title: 'Bear Market Brief',
    description: 'Start under tighter credit and rougher tape. Survive first, flex later.',
    badge: 'Hard Tape',
  },
  dividend_focus: {
    id: 'dividend_focus',
    title: 'Dividend Builder',
    description: 'A calmer challenge that nudges you toward cash-flow stocks.',
    badge: 'Income',
  },
  no_shorts: {
    id: 'no_shorts',
    title: 'Long-Only Mandate',
    description: 'Bet Down is disabled. Win with long ideas, cash, and patience.',
    badge: 'Long Only',
  },
  small_cap_sprint: {
    id: 'small_cap_sprint',
    title: 'Small-Cap Sprint',
    description: 'Higher upside, louder volatility, and faster board expectations.',
    badge: 'Sprint',
  },
};

export const SEASON_THEMES: Record<SeasonThemeId, SeasonTheme> = {
  opening_bell: {
    id: 'opening_bell',
    title: 'Opening Bell',
    description: 'A balanced market where stock selection teaches the core loop.',
    coachLine: 'Build a clean first book, then let the board see your rhythm.',
    volatilityMultiplier: 1,
    scenarioChanceBonus: 0,
    broadDriftPct: 0,
    sectorEffects: {},
    turnLimitBonus: 0,
  },
  inflation_shock: {
    id: 'inflation_shock',
    title: 'Inflation Shock',
    description: 'Rates and input costs pressure expensive stories while hard assets get a bid.',
    coachLine: 'Pricing power matters. Watch margins, real estate, and commodity tailwinds.',
    volatilityMultiplier: 1.12,
    scenarioChanceBonus: 0.04,
    broadDriftPct: -0.0015,
    sectorEffects: {
      energy: 1.08,
      materials: 1.06,
      financials: 1.03,
      realestate: 0.92,
      consumer: 0.96,
    },
    turnLimitBonus: 6,
  },
  startup_boom: {
    id: 'startup_boom',
    title: 'Startup Boom',
    description: 'Risk appetite returns and speculative growth stories move fast.',
    coachLine: 'Momentum can pay, but size the swings before the hype train gets silly.',
    volatilityMultiplier: 1.18,
    scenarioChanceBonus: 0.03,
    broadDriftPct: 0.002,
    sectorEffects: {
      technology: 1.08,
      semiconductors: 1.07,
      biotech: 1.06,
      financials: 0.98,
    },
    turnLimitBonus: 6,
  },
  credit_crunch: {
    id: 'credit_crunch',
    title: 'Credit Crunch',
    description: 'Funding tightens, weak balance sheets wobble, and defensive positioning matters.',
    coachLine: 'Cash is not cowardice here. Keep room to act when forced sellers show up.',
    volatilityMultiplier: 1.28,
    scenarioChanceBonus: 0.08,
    broadDriftPct: -0.003,
    sectorEffects: {
      financials: 0.91,
      realestate: 0.88,
      biotech: 0.94,
      healthcare: 1.03,
      telecom: 1.02,
    },
    turnLimitBonus: 9,
  },
  dividend_decade: {
    id: 'dividend_decade',
    title: 'Dividend Decade',
    description: 'Slower markets reward yield, durability, and compounding through payouts.',
    coachLine: 'Let income carry part of the season so every turn is not a moonshot.',
    volatilityMultiplier: 0.9,
    scenarioChanceBonus: -0.03,
    broadDriftPct: 0.0005,
    sectorEffects: {
      telecom: 1.06,
      consumer: 1.04,
      realestate: 1.04,
      energy: 1.03,
      biotech: 0.95,
    },
    turnLimitBonus: 12,
  },
  ai_mania: {
    id: 'ai_mania',
    title: 'AI Mania',
    description: 'Automation stories dominate the tape and crowded winners can overshoot.',
    coachLine: 'The market loves a story. Your job is to not buy every story at once.',
    volatilityMultiplier: 1.22,
    scenarioChanceBonus: 0.05,
    broadDriftPct: 0.0018,
    sectorEffects: {
      technology: 1.1,
      semiconductors: 1.12,
      media: 1.04,
      industrial: 1.03,
      energy: 0.97,
    },
    turnLimitBonus: 9,
  },
  commodity_squeeze: {
    id: 'commodity_squeeze',
    title: 'Commodity Squeeze',
    description: 'Supply shocks push resource names around and squeeze downstream margins.',
    coachLine: 'Follow the input costs. Winners and losers can sit in different sectors.',
    volatilityMultiplier: 1.16,
    scenarioChanceBonus: 0.05,
    broadDriftPct: -0.0005,
    sectorEffects: {
      energy: 1.1,
      materials: 1.09,
      industrial: 0.96,
      consumer: 0.95,
    },
    turnLimitBonus: 6,
  },
};

const NEXT_THEME_SEQUENCE: SeasonThemeId[] = [
  'inflation_shock',
  'startup_boom',
  'credit_crunch',
  'dividend_decade',
  'ai_mania',
  'commodity_squeeze',
];

const SEASON_GOAL_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 1.65,
  normal: 1.95,
  hard: 2.25,
  expert: 2.6,
};

export function getInitialSeasonThemeId(challengeMode: ChallengeModeId = 'standard'): SeasonThemeId {
  if (challengeMode === 'bear_market') return 'credit_crunch';
  if (challengeMode === 'dividend_focus') return 'dividend_decade';
  if (challengeMode === 'small_cap_sprint') return 'startup_boom';
  return 'opening_bell';
}

export function getNextSeasonThemeId(career: CareerState): SeasonThemeId {
  const nextSeasonNumber = Math.max(2, (career.seasonNumber || 1) + 1);
  return NEXT_THEME_SEQUENCE[(nextSeasonNumber - 2) % NEXT_THEME_SEQUENCE.length];
}

function latestNetWorth(state: GameState): number {
  return roundCurrency(state.netWorthHistory[state.netWorthHistory.length - 1]?.netWorth ?? state.cash);
}

function seasonLimitFor(difficulty: Difficulty, seasonNumber: number, themeId: SeasonThemeId): number {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const theme = SEASON_THEMES[themeId] ?? SEASON_THEMES.opening_bell;
  const careerBonus = seasonNumber <= 1 ? 0 : Math.min(24, (seasonNumber - 1) * 6);
  return config.turnLimit + theme.turnLimitBonus + careerBonus;
}

function seasonGoalFor(
  difficulty: Difficulty,
  seasonNumber: number,
  seasonStartNetWorth: number,
  challengeMode: ChallengeModeId,
): number {
  const config = DIFFICULTY_CONFIGS[difficulty];
  if (seasonNumber <= 1) return roundCurrency(config.startingCash * config.goalMultiplier);

  const challengeAdjustment = challengeMode === 'bear_market'
    ? -0.15
    : challengeMode === 'small_cap_sprint'
    ? 0.2
    : challengeMode === 'dividend_focus'
    ? -0.05
    : 0;
  const seasonRamp = Math.min(0.45, (seasonNumber - 2) * 0.1);
  const multiplier = Math.max(1.25, SEASON_GOAL_MULTIPLIERS[difficulty] + seasonRamp + challengeAdjustment);
  return roundCurrency(seasonStartNetWorth * multiplier);
}

export function createCareerSeasonRecord(params: {
  seasonNumber: number;
  difficulty: Difficulty;
  themeId: SeasonThemeId;
  challengeMode: ChallengeModeId;
  startTurn: number;
  startDate: Date;
  startingNetWorth: number;
}): CareerSeason {
  const theme = SEASON_THEMES[params.themeId] ?? SEASON_THEMES.opening_bell;

  return {
    seasonNumber: params.seasonNumber,
    themeId: theme.id,
    title: theme.title,
    description: theme.description,
    challengeMode: params.challengeMode,
    startTurn: params.startTurn,
    startDate: new Date(params.startDate),
    startingNetWorth: roundCurrency(params.startingNetWorth),
    targetNetWorth: seasonGoalFor(
      params.difficulty,
      params.seasonNumber,
      params.startingNetWorth,
      params.challengeMode,
    ),
    turnLimit: seasonLimitFor(params.difficulty, params.seasonNumber, theme.id),
  };
}

export function getActiveSeasonTheme(state: GameState): SeasonTheme {
  return SEASON_THEMES[state.career?.activeSeasonThemeId] ?? SEASON_THEMES.opening_bell;
}

export function getCareerSeasonTurn(state: GameState): number {
  return Math.max(0, state.currentTurn - (state.career?.seasonStartTurn ?? 0));
}

export function getCareerSeasonTurnLimit(state: GameState): number {
  const activeSeason = state.career?.seasons?.find((season) => season.seasonNumber === state.career.seasonNumber);
  if (activeSeason?.turnLimit) return activeSeason.turnLimit;
  return seasonLimitFor(state.difficulty, state.career?.seasonNumber ?? 1, state.career?.activeSeasonThemeId ?? 'opening_bell');
}

export function getCareerSeasonGoal(state: GameState): number {
  const activeSeason = state.career?.seasons?.find((season) => season.seasonNumber === state.career.seasonNumber);
  if (activeSeason?.targetNetWorth) return activeSeason.targetNetWorth;
  return seasonGoalFor(
    state.difficulty,
    state.career?.seasonNumber ?? 1,
    state.career?.seasonStartNetWorth ?? DIFFICULTY_CONFIGS[state.difficulty].startingCash,
    state.career?.challengeMode ?? 'standard',
  );
}

export function getCareerUnlocks(state: GameState): CareerUnlock[] {
  return [...(state.career?.unlocks || [])].sort((left, right) => left.earnedAtTurn - right.earnedAtTurn);
}

function mergeUnlocks(existing: CareerUnlock[], awards: CareerUnlock[]): CareerUnlock[] {
  const byId = new Map<string, CareerUnlock>();
  for (const unlock of existing) byId.set(unlock.id, unlock);
  for (const unlock of awards) if (!byId.has(unlock.id)) byId.set(unlock.id, unlock);
  return [...byId.values()];
}

function awardsForCompletedSeason(state: GameState, seasonNumber: number): CareerUnlock[] {
  const turn = state.currentTurn;
  const awards: CareerUnlock[] = [];

  if (seasonNumber >= 1) {
    awards.push({
      id: 'expanded_watchlist',
      title: 'Expanded Watchlist',
      description: 'Career desk unlocked: more room to track favorite tickers across seasons.',
      earnedAtTurn: turn,
      seasonNumber,
    });
  }
  if (seasonNumber >= 2) {
    awards.push({
      id: 'season_modifiers',
      title: 'Season Modifiers',
      description: 'Career briefings now call out the market regime shaping each new season.',
      earnedAtTurn: turn,
      seasonNumber,
    });
  }
  if ((state.finalGrade === 'S' || state.finalGrade === 'A') && seasonNumber >= 1) {
    awards.push({
      id: 'board_favorite',
      title: 'Board Favorite',
      description: 'Strong board grades add prestige to the career profile.',
      earnedAtTurn: turn,
      seasonNumber,
    });
  }

  return awards;
}

export function finalizeCareerSeason(state: GameState): CareerState {
  const career = state.career;
  const activeSeasonNumber = career.seasonNumber || 1;
  const existingSeason = career.seasons?.find((season) => season.seasonNumber === activeSeasonNumber);
  const fallbackSeason = createCareerSeasonRecord({
    seasonNumber: activeSeasonNumber,
    difficulty: state.difficulty,
    themeId: career.activeSeasonThemeId || 'opening_bell',
    challengeMode: career.challengeMode || 'standard',
    startTurn: career.seasonStartTurn || 0,
    startDate: existingSeason?.startDate || state.createdAt,
    startingNetWorth: career.seasonStartNetWorth || career.startingNetWorth,
  });
  const completedSeason: CareerSeason = {
    ...fallbackSeason,
    ...existingSeason,
    completedAtTurn: state.currentTurn,
    completedAtDate: new Date(state.currentDate),
    completedNetWorth: latestNetWorth(state),
    completedGrade: state.finalGrade || null,
  };
  const seasons = [
    ...(career.seasons || []).filter((season) => season.seasonNumber !== activeSeasonNumber),
    completedSeason,
  ].sort((left, right) => left.seasonNumber - right.seasonNumber);

  return {
    ...career,
    seasons,
    unlocks: mergeUnlocks(career.unlocks || [], awardsForCompletedSeason(state, activeSeasonNumber)),
  };
}

export type ContinueCareerOptions = ChallengeModeId | {
  challengeMode?: ChallengeModeId;
  themeId?: SeasonThemeId;
};

function resolveContinueCareerOptions(career: CareerState, options?: ContinueCareerOptions): {
  challengeMode: ChallengeModeId;
  themeId: SeasonThemeId;
} {
  if (typeof options === 'string') {
    return {
      challengeMode: options,
      themeId: getInitialSeasonThemeId(options),
    };
  }

  const challengeMode = options?.challengeMode || career.challengeMode || 'standard';
  return {
    challengeMode,
    themeId: options?.themeId || getNextSeasonThemeId(career),
  };
}

export function continueCareer(state: GameState, options?: ContinueCareerOptions): GameState {
  const finalizedCareer = finalizeCareerSeason(state);
  const nextSeasonNumber = finalizedCareer.seasonNumber + 1;
  const { challengeMode: nextChallengeMode, themeId: nextThemeId } = resolveContinueCareerOptions(finalizedCareer, options);
  const nextNetWorth = latestNetWorth(state);
  const nextSeason = createCareerSeasonRecord({
    seasonNumber: nextSeasonNumber,
    difficulty: state.difficulty,
    themeId: nextThemeId,
    challengeMode: nextChallengeMode,
    startTurn: state.currentTurn,
    startDate: new Date(state.currentDate),
    startingNetWorth: nextNetWorth,
  });
  const nextCareer: CareerState = {
    ...finalizedCareer,
    seasonNumber: nextSeasonNumber,
    seasonStartTurn: state.currentTurn,
    seasonStartNetWorth: nextNetWorth,
    activeSeasonThemeId: nextThemeId,
    challengeMode: nextChallengeMode,
    seasons: [...finalizedCareer.seasons, nextSeason],
    currentObjective: null,
    nextBoardReviewTurn: state.currentTurn + 3,
  };

  return {
    ...state,
    runId: crypto.randomUUID(),
    leaderboardEntryId: null,
    career: nextCareer,
    activeMission: null,
    currentScenario: null,
    isGameOver: false,
    finalRank: null,
    finalGrade: null,
    updatedAt: new Date(),
  };
}

export function getSeasonSectorMultiplier(state: GameState, sector: Sector): number {
  return getActiveSeasonTheme(state).sectorEffects[sector] ?? 1;
}

export function getSeasonScenarioChanceBonus(state: GameState): number {
  return getActiveSeasonTheme(state).scenarioChanceBonus;
}

export function getSeasonVolatilityMultiplier(state: GameState): number {
  return getActiveSeasonTheme(state).volatilityMultiplier;
}

export function getSeasonBroadDriftPct(state: GameState): number {
  return getActiveSeasonTheme(state).broadDriftPct;
}
