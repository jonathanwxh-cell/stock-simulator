import type {
  CareerArchetype,
  CareerBoardReview,
  CareerLeagueEntry,
  CareerObjective,
  CareerRivalFund,
  CareerState,
  CareerStyle,
  ChallengeModeId,
  Difficulty,
  GameState,
  RiskLevel,
} from './types';
import { roundCurrency } from './financialMath';
import { getAlphaPct, getPlayerReturnPct } from './marketIndex';
import { createCareerSeasonRecord, getInitialSeasonThemeId } from './careerSeasons';

export const CAREER_ARCHETYPES: Record<CareerStyle, CareerArchetype> = {
  balanced: {
    style: 'balanced',
    label: 'Balanced Operator',
    shortLabel: 'Balanced',
    tagline: 'Win by staying nimble, diversified, and calm.',
    perk: 'Board reviews reward steady alpha and controlled drawdowns.',
    color: '#3B82F6',
  },
  growth_hunter: {
    style: 'growth_hunter',
    label: 'Growth Hunter',
    shortLabel: 'Growth',
    tagline: 'Chase compounding stories before the crowd wakes up.',
    perk: 'Board reviews lean toward upside capture and positive alpha.',
    color: '#22C55E',
  },
  dividend_baron: {
    style: 'dividend_baron',
    label: 'Dividend Baron',
    shortLabel: 'Income',
    tagline: 'Let cash flow do the bragging.',
    perk: 'Board reviews respect dividends, patience, and lower risk.',
    color: '#F59E0B',
  },
  macro_surfer: {
    style: 'macro_surfer',
    label: 'Macro Surfer',
    shortLabel: 'Macro',
    tagline: 'Read the weather, then ride the wave.',
    perk: 'Board reviews reward beating the benchmark during regime shifts.',
    color: '#06B6D4',
  },
  contrarian: {
    style: 'contrarian',
    label: 'Contrarian',
    shortLabel: 'Contrarian',
    tagline: 'Buy the groans, sell the applause.',
    perk: 'Board reviews forgive slower starts if drawdowns stay contained.',
    color: '#A855F7',
  },
  short_shark: {
    style: 'short_shark',
    label: 'Short Shark',
    shortLabel: 'Short',
    tagline: 'Make bear markets feel like feeding time.',
    perk: 'Board reviews reward alpha in rough markets and disciplined shorts.',
    color: '#EF4444',
  },
};

const RIVAL_PROFILES: Array<{ name: string; style: CareerStyle; seed: number }> = [
  { name: 'Aurora Capital', style: 'growth_hunter', seed: 11 },
  { name: 'Harbor Income', style: 'dividend_baron', seed: 17 },
  { name: 'Monsoon Macro', style: 'macro_surfer', seed: 23 },
  { name: 'Deep Value Lab', style: 'contrarian', seed: 31 },
  { name: 'Obsidian Shorts', style: 'short_shark', seed: 43 },
  { name: 'Northstar Blend', style: 'balanced', seed: 59 },
];

const STYLE_BETA: Record<CareerStyle, number> = {
  balanced: 0.9,
  growth_hunter: 1.25,
  dividend_baron: 0.7,
  macro_surfer: 1.05,
  contrarian: 0.85,
  short_shark: -0.35,
};

const STYLE_EDGE: Record<CareerStyle, number> = {
  balanced: 0.18,
  growth_hunter: 0.3,
  dividend_baron: 0.2,
  macro_surfer: 0.24,
  contrarian: 0.16,
  short_shark: 0.12,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function latestNetWorth(state: GameState): number {
  return state.netWorthHistory[state.netWorthHistory.length - 1]?.netWorth ?? state.cash;
}

function startingNetWorth(state: GameState): number {
  return state.netWorthHistory[0]?.netWorth ?? state.cash;
}

function riskPenalty(level?: RiskLevel): number {
  if (level === 'extreme') return 18;
  if (level === 'high') return 10;
  if (level === 'medium') return 4;
  return 0;
}

function getMaxDrawdownPct(state: GameState): number {
  let peak = state.netWorthHistory[0]?.netWorth ?? 0;
  let drawdown = 0;

  for (const snapshot of state.netWorthHistory) {
    peak = Math.max(peak, snapshot.netWorth);
    if (peak <= 0) continue;
    drawdown = Math.max(drawdown, ((peak - snapshot.netWorth) / peak) * 100);
  }

  return roundCurrency(drawdown);
}

function getLatestMarketMovePct(state: GameState): number {
  return state.marketIndexHistory[state.marketIndexHistory.length - 1]?.changePct ?? 0;
}

function nextReviewTurn(currentTurn: number): number {
  if (currentTurn <= 0) return 3;
  return Math.ceil((currentTurn + 1) / 3) * 3;
}

function buildRivals(style: CareerStyle, startingValue: number): CareerRivalFund[] {
  return RIVAL_PROFILES
    .filter((profile) => profile.style !== style)
    .slice(0, 5)
    .map((profile, index) => {
      const offset = 1 + ((profile.seed % 7) - 3) * 0.003 + index * 0.001;
      const netWorth = roundCurrency(startingValue * offset);
      const archetype = CAREER_ARCHETYPES[profile.style];

      return {
        id: `rival_${profile.style}`,
        name: profile.name,
        style: profile.style,
        archetypeLabel: archetype.label,
        startingNetWorth: startingValue,
        netWorth,
        returnPct: roundCurrency(((netWorth - startingValue) / startingValue) * 100),
        lastTurnChangePct: 0,
        reputation: 50,
      };
    });
}

export function createCareerState(
  style: CareerStyle = 'balanced',
  startingValue = 100_000,
  selectedAt: Date = new Date(),
  difficulty: Difficulty = 'normal',
  challengeMode: ChallengeModeId = 'standard',
): CareerState {
  const archetype = CAREER_ARCHETYPES[style] ?? CAREER_ARCHETYPES.balanced;
  const themeId = getInitialSeasonThemeId(challengeMode);
  const firstSeason = createCareerSeasonRecord({
    seasonNumber: 1,
    difficulty,
    themeId,
    challengeMode,
    startTurn: 0,
    startDate: new Date(selectedAt),
    startingNetWorth: startingValue,
  });

  return {
    style,
    archetypeLabel: archetype.label,
    selectedAt: new Date(selectedAt),
    startingNetWorth: startingValue,
    seasonNumber: 1,
    seasonStartTurn: 0,
    seasonStartNetWorth: startingValue,
    activeSeasonThemeId: themeId,
    challengeMode,
    seasons: [firstSeason],
    unlocks: [],
    rivalFunds: buildRivals(style, startingValue),
    boardReviews: [],
    currentObjective: null,
    nextBoardReviewTurn: 3,
  };
}

export function ensureCareerState(state: GameState): CareerState {
  const existing = (state as GameState & { career?: CareerState }).career;
  if (!existing || !CAREER_ARCHETYPES[existing.style]) {
    return createCareerState('balanced', startingNetWorth(state), new Date(state.createdAt));
  }

  const startingValue = existing.startingNetWorth || startingNetWorth(state);
  const challengeMode = existing.challengeMode || 'standard';
  const activeSeasonThemeId = existing.activeSeasonThemeId || getInitialSeasonThemeId(challengeMode);
  const seasonNumber = existing.seasonNumber || 1;
  const seasonStartTurn = Number.isFinite(existing.seasonStartTurn) ? existing.seasonStartTurn : 0;
  const seasonStartNetWorth = existing.seasonStartNetWorth || startingValue;
  const defaultSeason = createCareerSeasonRecord({
    seasonNumber,
    difficulty: state.difficulty,
    themeId: activeSeasonThemeId,
    challengeMode,
    startTurn: seasonStartTurn,
    startDate: new Date(existing.selectedAt || state.createdAt),
    startingNetWorth: seasonStartNetWorth,
  });

  return {
    ...existing,
    archetypeLabel: CAREER_ARCHETYPES[existing.style].label,
    selectedAt: new Date(existing.selectedAt),
    startingNetWorth: startingValue,
    seasonNumber,
    seasonStartTurn,
    seasonStartNetWorth,
    activeSeasonThemeId,
    challengeMode,
    seasons: existing.seasons?.length ? existing.seasons.map((season) => ({
      ...season,
      startDate: new Date(season.startDate),
      completedAtDate: season.completedAtDate ? new Date(season.completedAtDate) : undefined,
    })) : [defaultSeason],
    unlocks: (existing.unlocks || []).map((unlock) => ({ ...unlock })),
    rivalFunds: existing.rivalFunds?.length ? existing.rivalFunds.map((rival) => ({
      ...rival,
      archetypeLabel: CAREER_ARCHETYPES[rival.style]?.label ?? rival.archetypeLabel,
      startingNetWorth: rival.startingNetWorth || startingValue,
    })) : buildRivals(existing.style, startingValue),
    boardReviews: (existing.boardReviews || []).map((review) => ({
      ...review,
      date: new Date(review.date),
      strengths: [...review.strengths],
      concerns: [...review.concerns],
      objective: review.objective ? { ...review.objective } : null,
    })),
    currentObjective: existing.currentObjective ? { ...existing.currentObjective } : null,
    nextBoardReviewTurn: existing.nextBoardReviewTurn || nextReviewTurn(state.currentTurn),
  };
}

function updateRivalFunds(career: CareerState, state: GameState): CareerRivalFund[] {
  const marketMove = getLatestMarketMovePct(state);

  return career.rivalFunds.map((rival, index) => {
    const cycle = Math.sin((state.currentTurn + 1) * (index + 2) + rival.id.length) * 0.55;
    const bearBoost = marketMove < 0 && rival.style === 'short_shark' ? Math.abs(marketMove) * 0.7 : 0;
    const incomeCushion = marketMove < 0 && rival.style === 'dividend_baron' ? Math.abs(marketMove) * 0.25 : 0;
    const monthlyReturnPct = clamp(
      STYLE_EDGE[rival.style] + marketMove * STYLE_BETA[rival.style] + cycle + bearBoost + incomeCushion,
      -8,
      10,
    );
    const netWorth = roundCurrency(rival.netWorth * (1 + monthlyReturnPct / 100));
    const returnPct = rival.startingNetWorth > 0
      ? roundCurrency(((netWorth - rival.startingNetWorth) / rival.startingNetWorth) * 100)
      : 0;

    return {
      ...rival,
      netWorth,
      returnPct,
      lastTurnChangePct: roundCurrency(monthlyReturnPct),
      reputation: roundCurrency(clamp(50 + returnPct * 1.8 + monthlyReturnPct * 1.2, 0, 100)),
    };
  });
}

function scoreCareerReview(state: GameState): number {
  const playerReturn = getPlayerReturnPct(state);
  const alpha = getAlphaPct(state);
  const drawdown = getMaxDrawdownPct(state);
  const latestRisk = state.riskHistory[state.riskHistory.length - 1]?.level;
  const objectiveBonus = state.career?.currentObjective?.status === 'completed' ? 6 : 0;

  return roundCurrency(clamp(58 + playerReturn * 0.8 + alpha * 2.2 - drawdown * 0.55 - riskPenalty(latestRisk) + objectiveBonus, 0, 100));
}

function gradeFromScore(score: number): CareerBoardReview['grade'] {
  if (score >= 90) return 'S';
  if (score >= 78) return 'A';
  if (score >= 64) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function buildObjective(style: CareerStyle, currentTurn: number): CareerObjective {
  const expiresTurn = currentTurn + 3;
  const common = {
    id: `objective_${style}_${expiresTurn}`,
    expiresTurn,
    status: 'active' as const,
    rewardLabel: 'Board reputation boost',
  };

  switch (style) {
    case 'growth_hunter':
      return {
        ...common,
        title: 'Find the Next Rocket',
        description: 'Beat the market by at least 2 percentage points before the next board review.',
        targetLabel: 'Alpha >= +2.0%',
      };
    case 'dividend_baron':
      return {
        ...common,
        title: 'Make Cash Flow Sing',
        description: 'Collect dividends or keep the fund at medium risk or better before the next review.',
        targetLabel: 'Dividends or <= medium risk',
      };
    case 'macro_surfer':
      return {
        ...common,
        title: 'Ride the Regime',
        description: 'Finish the quarter with positive alpha while the macro backdrop shifts.',
        targetLabel: 'Alpha >= +0.0%',
      };
    case 'contrarian':
      return {
        ...common,
        title: 'Hold the Weird Line',
        description: 'Keep max drawdown below 12% while hunting unloved opportunities.',
        targetLabel: 'Drawdown < 12%',
      };
    case 'short_shark':
      return {
        ...common,
        title: 'Smell Blood, Stay Solvent',
        description: 'Generate positive alpha or maintain an active short before the next review.',
        targetLabel: 'Alpha > 0 or active short',
      };
    default:
      return {
        ...common,
        title: 'Run a Clean Book',
        description: 'Keep drawdown below 10% and avoid trailing the benchmark badly.',
        targetLabel: 'Drawdown < 10%, alpha > -1%',
      };
  }
}

function objectiveCompleted(objective: CareerObjective, state: GameState): boolean {
  const alpha = getAlphaPct(state);
  const drawdown = getMaxDrawdownPct(state);
  const risk = state.riskHistory[state.riskHistory.length - 1]?.level;

  if (objective.id.includes('growth_hunter')) return alpha >= 2;
  if (objective.id.includes('dividend_baron')) return state.totalDividendsReceived > 0 || risk === 'low' || risk === 'medium';
  if (objective.id.includes('macro_surfer')) return alpha >= 0;
  if (objective.id.includes('contrarian')) return drawdown < 12;
  if (objective.id.includes('short_shark')) return alpha > 0 || Object.keys(state.shortPositions).length > 0;
  return drawdown < 10 && alpha > -1;
}

function updateObjective(objective: CareerObjective | null, state: GameState): CareerObjective | null {
  if (!objective || objective.status !== 'active') return objective;
  if (state.currentTurn < objective.expiresTurn) return objective;

  return {
    ...objective,
    status: objectiveCompleted(objective, state) ? 'completed' : 'failed',
  };
}

function buildStrengths(state: GameState): string[] {
  const alpha = getAlphaPct(state);
  const playerReturn = getPlayerReturnPct(state);
  const drawdown = getMaxDrawdownPct(state);
  const strengths: string[] = [];

  if (alpha >= 0) strengths.push(`Outpaced the benchmark by ${alpha.toFixed(1)}%.`);
  if (playerReturn > 0) strengths.push(`Compounded capital to a ${playerReturn.toFixed(1)}% run return.`);
  if (drawdown < 8) strengths.push('Kept drawdowns calm enough for the board to keep sipping coffee.');
  if (state.totalDividendsReceived > 0) strengths.push('Generated dividend income without extra player bookkeeping.');

  return strengths.length ? strengths.slice(0, 2) : ['Kept the fund alive and liquid for the next quarter.'];
}

function buildConcerns(state: GameState): string[] {
  const alpha = getAlphaPct(state);
  const drawdown = getMaxDrawdownPct(state);
  const risk = state.riskHistory[state.riskHistory.length - 1]?.level;
  const concerns: string[] = [];

  if (alpha < 0) concerns.push(`Lagged the benchmark by ${Math.abs(alpha).toFixed(1)}%.`);
  if (drawdown >= 10) concerns.push(`Max drawdown reached ${drawdown.toFixed(1)}%.`);
  if (risk === 'high' || risk === 'extreme') concerns.push(`Risk meter is ${risk}; the board noticed.`);

  return concerns.length ? concerns.slice(0, 2) : ['No major objections. Suspiciously adult behavior from a trading desk.'];
}

function buildBoardReview(state: GameState, score: number, objective: CareerObjective | null): CareerBoardReview {
  const grade = gradeFromScore(score);
  const alpha = getAlphaPct(state);

  return {
    id: `board_${state.currentTurn}`,
    turn: state.currentTurn,
    date: new Date(state.currentDate),
    grade,
    score,
    headline: grade === 'S' || grade === 'A'
      ? 'The board is leaning forward'
      : grade === 'B' || grade === 'C'
      ? 'The board wants sharper execution'
      : 'The board is tapping the risk report',
    summary: `Quarterly score ${score.toFixed(0)}/100 with ${alpha >= 0 ? '+' : ''}${alpha.toFixed(1)}% alpha.`,
    strengths: buildStrengths(state),
    concerns: buildConcerns(state),
    objective,
  };
}

export function advanceCareerState(previousState: GameState, currentState: GameState): CareerState {
  const previousCareer = ensureCareerState(previousState);
  const currentCareer = ensureCareerState({ ...currentState, career: previousCareer });
  const rivalFunds = updateRivalFunds(currentCareer, currentState);
  let currentObjective = updateObjective(currentCareer.currentObjective, currentState);
  let boardReviews = currentCareer.boardReviews;

  const hasReviewForTurn = boardReviews.some((review) => review.turn === currentState.currentTurn);
  if (currentState.currentTurn > 0 && currentState.currentTurn >= currentCareer.nextBoardReviewTurn && !hasReviewForTurn) {
    const nextObjective = buildObjective(currentCareer.style, currentState.currentTurn);
    const reviewState = { ...currentState, career: { ...currentCareer, currentObjective } };
    const score = scoreCareerReview(reviewState);
    boardReviews = [
      ...boardReviews,
      buildBoardReview(reviewState, score, nextObjective),
    ];
    currentObjective = nextObjective;
  }

  return {
    ...currentCareer,
    rivalFunds,
    boardReviews,
    currentObjective,
    nextBoardReviewTurn: nextReviewTurn(currentState.currentTurn),
  };
}

export function getCareerLeague(state: GameState): CareerLeagueEntry[] {
  const career = ensureCareerState(state);
  const playerStart = career.startingNetWorth || startingNetWorth(state);
  const playerNetWorth = latestNetWorth(state);
  const playerEntry: CareerLeagueEntry = {
    id: 'player',
    name: state.playerName || 'Your Fund',
    style: career.style,
    archetypeLabel: career.archetypeLabel,
    netWorth: playerNetWorth,
    returnPct: playerStart > 0 ? roundCurrency(((playerNetWorth - playerStart) / playerStart) * 100) : 0,
    lastTurnChangePct: state.netWorthHistory.length > 1
      ? roundCurrency(((playerNetWorth - state.netWorthHistory[state.netWorthHistory.length - 2].netWorth) / state.netWorthHistory[state.netWorthHistory.length - 2].netWorth) * 100)
      : 0,
    reputation: roundCurrency(clamp(50 + getPlayerReturnPct(state) * 1.8 + getAlphaPct(state), 0, 100)),
    isPlayer: true,
  };

  return [
    playerEntry,
    ...career.rivalFunds.map((rival) => ({ ...rival, isPlayer: false })),
  ].sort((a, b) => b.netWorth - a.netWorth);
}
