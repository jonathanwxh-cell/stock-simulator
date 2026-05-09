import { getCareerSeasonGoal } from './careerSeasons';
import { getAlphaPct } from './marketIndex';
import { getNetWorth } from './marketSimulator';
import { getLatestRisk } from './riskSystem';
import type { ChallengeModeId, GameState, SeasonThemeId, Sector } from './types';

export type LegacyEndingTone = 'triumph' | 'survival' | 'collapse' | 'scandal' | 'legend';

export type LegacyEndingId =
  | 'market_crowned'
  | 'reckless_rocket'
  | 'cashflow_royalty'
  | 'short_squeeze_scar'
  | 'sector_prophet'
  | 'quiet_survivor'
  | 'boardroom_fire';

export type LegacyOfferTone = 'stable' | 'volatile' | 'redemption' | 'prestige' | 'weird';

export interface LegacyEnding {
  id: LegacyEndingId;
  title: string;
  tone: LegacyEndingTone;
  summary: string;
  tags: string[];
  grade: NonNullable<GameState['finalGrade']>;
  seasonNumber: number;
  runId: string;
  createdAtTurn: number;
  createdAtDate: string;
  drivers: {
    alphaPct: number;
    netWorth: number;
    riskLevel: ReturnType<typeof getLatestRisk>['level'];
    topSector: Sector | null;
    marginUsed: number;
    dividends: number;
  };
}

export interface LegacyPathOffer {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tone: LegacyOfferTone;
  arcId: 'boardroom_ascent' | 'redemption_tour' | 'mania_backlash' | 'credit_winter' | 'rival_grudge' | 'wildcard_market';
  nextThemeId: SeasonThemeId;
  challengeMode?: ChallengeModeId;
  modifierIds: string[];
  rivalFocusId?: string;
  rewardPreview: string;
}

export interface LegacyRecord {
  version: 1;
  fundId: string;
  endings: LegacyEnding[];
  chosenPaths: Array<{
    offerId: string;
    endingId: LegacyEndingId;
    chosenAt: string;
    seasonNumber: number;
  }>;
  seenEventIds: string[];
}

const WINNING_GRADES = new Set(['S', 'A', 'B']);
const FAILURE_GRADES = new Set(['D', 'F']);

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function topExposureSector(state: GameState): Sector | null {
  const exposure = new Map<Sector, number>();
  for (const position of Object.values(state.portfolio)) {
    const stock = state.stocks.find((entry) => entry.id === position.stockId);
    if (!stock || position.shares <= 0) continue;
    exposure.set(stock.sector, (exposure.get(stock.sector) || 0) + stock.currentPrice * position.shares);
  }
  for (const position of Object.values(state.shortPositions)) {
    const stock = state.stocks.find((entry) => entry.id === position.stockId);
    if (!stock || position.shares <= 0) continue;
    exposure.set(stock.sector, (exposure.get(stock.sector) || 0) + stock.currentPrice * position.shares);
  }

  return [...exposure.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function hasShortScar(state: GameState): boolean {
  return state.transactionHistory.some((transaction) => transaction.type === 'margin_call')
    || Object.keys(state.shortPositions).length > 0;
}

function hasSectorConcentration(state: GameState): boolean {
  const sectors = new Set<Sector>();
  let positions = 0;
  for (const position of Object.values(state.portfolio)) {
    if (position.shares <= 0) continue;
    const stock = state.stocks.find((entry) => entry.id === position.stockId);
    if (stock) sectors.add(stock.sector);
    positions += 1;
  }
  return positions >= 3 && sectors.size === 1;
}

function baseEnding(state: GameState): Pick<LegacyEnding, 'id' | 'title' | 'tone' | 'summary' | 'tags'> {
  const grade = state.finalGrade || 'F';
  const risk = getLatestRisk(state);
  const alphaPct = getAlphaPct(state);
  const highRisk = risk.level === 'high' || risk.level === 'extreme' || state.marginUsed > getNetWorth(state) * 0.2;

  if (FAILURE_GRADES.has(grade) && (highRisk || state.marginUsed > 0)) {
    return {
      id: 'boardroom_fire',
      title: 'Boardroom Fire',
      tone: 'collapse',
      summary: 'The board is not angry because you lost money. They are angry because the fund made the loss look avoidable.',
      tags: ['Board Pressure', 'Reputation Scar', 'Risk Review'],
    };
  }

  if (hasShortScar(state) && FAILURE_GRADES.has(grade)) {
    return {
      id: 'short_squeeze_scar',
      title: 'Short Squeeze Scar',
      tone: 'scandal',
      summary: 'Your bearish book became the story. Rivals will remember the squeeze long after the tape closes.',
      tags: ['Short Scar', 'Rival Fuel', 'Redemption Hook'],
    };
  }

  if (WINNING_GRADES.has(grade) && highRisk) {
    return {
      id: 'reckless_rocket',
      title: 'Reckless Rocket',
      tone: 'legend',
      summary: 'The fund launched like a rocket and left risk officers clutching their coffee. The question is whether it was genius or gravity delayed.',
      tags: ['High Wire', 'Board Buzz', 'Volatility Myth'],
    };
  }

  if (state.totalDividendsReceived > getNetWorth(state) * 0.03 && !FAILURE_GRADES.has(grade)) {
    return {
      id: 'cashflow_royalty',
      title: 'Cashflow Royalty',
      tone: 'triumph',
      summary: 'While others chased fireworks, your fund built a cash machine. Slow money started looking suspiciously heroic.',
      tags: ['Dividend Crown', 'Patient Capital', 'Income Legend'],
    };
  }

  if (WINNING_GRADES.has(grade) && hasSectorConcentration(state)) {
    return {
      id: 'sector_prophet',
      title: 'Sector Prophet',
      tone: 'legend',
      summary: 'You called one corner of the market before the crowd caught up. Now everyone wants to know if it was insight or obsession.',
      tags: ['Sector Call', 'Crowded Trade', 'Market Myth'],
    };
  }

  if (WINNING_GRADES.has(grade) && alphaPct >= 0) {
    return {
      id: 'market_crowned',
      title: 'Market Crowned',
      tone: 'triumph',
      summary: 'The fund beat the tape and kept enough discipline to make the win look repeatable.',
      tags: ['Alpha Crown', 'Board Confidence', 'Prestige Path'],
    };
  }

  return {
    id: 'quiet_survivor',
    title: 'Quiet Survivor',
    tone: 'survival',
    summary: 'It was not glamorous, but the fund lived to trade another tape. Sometimes survival is the first chapter of a legend.',
    tags: ['Survivor', 'Second Chance', 'Steady Hands'],
  };
}

export function buildLegacyEnding(state: GameState): LegacyEnding {
  const ending = baseEnding(state);
  return {
    ...ending,
    grade: state.finalGrade || 'F',
    seasonNumber: state.career.seasonNumber || 1,
    runId: state.runId || `legacy:${state.playerName}:${state.currentTurn}`,
    createdAtTurn: state.currentTurn,
    createdAtDate: new Date(state.currentDate).toISOString(),
    drivers: {
      alphaPct: getAlphaPct(state),
      netWorth: getNetWorth(state),
      riskLevel: getLatestRisk(state).level,
      topSector: topExposureSector(state),
      marginUsed: state.marginUsed,
      dividends: state.totalDividendsReceived,
    },
  };
}

export type LossEpilogueVariant = 'bankruptcy' | 'missed_goal' | 'barely_missed';

export interface LossEpilogue {
  variant: LossEpilogueVariant;
  headline: string;
  body: string;
  closer: string;
  marginCallCount: number;
  goalRatio: number;
}

export function buildLossEpilogue(state: GameState): LossEpilogue {
  const netWorth = getNetWorth(state);
  const goal = getCareerSeasonGoal(state);
  const goalRatio = goal > 0 ? netWorth / goal : 0;
  const marginCallCount = state.transactionHistory.filter((t) => t.type === 'margin_call').length;

  if (netWorth <= 0) {
    const liquidationLine = marginCallCount > 0
      ? ` after ${marginCallCount} forced liquidation${marginCallCount > 1 ? 's' : ''}`
      : '';
    return {
      variant: 'bankruptcy',
      headline: 'The Fund Goes Dark',
      body: `Your equity reached zero${liquidationLine}. One concentrated position turned against the clock and the margin calls compounded faster than the recovery could. By the time the dust settled there was nothing left to work with.`,
      closer: "The market doesn't remember the fund's thesis — only that there was a fund, and then there wasn't. That distinction will outlast any single trade.",
      marginCallCount,
      goalRatio,
    };
  }

  if (goalRatio < 0.6) {
    const marginLine = marginCallCount > 0
      ? ` ${marginCallCount} margin call${marginCallCount > 1 ? 's' : ''} during the run cost both capital and confidence at the worst possible moments.`
      : ' The positions moved, but not enough, and not fast enough.';
    return {
      variant: 'missed_goal',
      headline: 'Out of Turns, Well Short',
      body: `The season clock ran out at ${Math.round(goalRatio * 100)}% of the target. The thesis was there but the timeline wasn't.${marginLine}`,
      closer: 'Every fund manager has this loss — the one that teaches them conviction without timing is just stubbornness. Now you have yours.',
      marginCallCount,
      goalRatio,
    };
  }

  // 0.6 ≤ goalRatio < 1.0 — the most poignant variant per #30
  const gapAmount = Math.max(0, Math.round(goal - netWorth));
  return {
    variant: 'barely_missed',
    headline: 'The Wall You Almost Scaled',
    body: `You finished ${Math.round((1 - goalRatio) * 100)}% short — $${gapAmount.toLocaleString()} from the target. The thesis was sound, the position sizing reasonable, the executions clean. The market simply didn't cooperate with the calendar.`,
    closer: 'Of all the loss variants, this one stings longest. Not because of what went wrong, but because of what almost went right. The next season will remember it.',
    marginCallCount,
    goalRatio,
  };
}

function offerPool(state: GameState, ending: LegacyEnding): LegacyPathOffer[] {
  const rival = state.career.rivalFunds[0];
  const topSector = ending.drivers.topSector;
  return [
    {
      id: 'board_confidence_mandate',
      title: 'Board Confidence Mandate',
      subtitle: 'Prestige capital, sharper expectations',
      description: 'The board gives you a cleaner mandate and expects the next season to prove this was not a lucky tape.',
      tone: 'prestige',
      arcId: 'boardroom_ascent',
      nextThemeId: 'dividend_decade',
      modifierIds: ['board_pressure', 'prestige_capital'],
      rewardPreview: 'Board Favorite progress and steadier objectives',
    },
    {
      id: 'ai_bubble_backlash',
      title: 'AI Bubble Backlash',
      subtitle: topSector === 'technology' || topSector === 'semiconductors' ? 'Your favorite trade gets crowded' : 'The market chases a new machine dream',
      description: 'Automation hype floods the tape. Winners can run hard, but crowded stories may snap back late.',
      tone: 'volatile',
      arcId: 'mania_backlash',
      nextThemeId: 'ai_mania',
      modifierIds: ['tech_volatility', 'late_season_snapback'],
      rewardPreview: 'Rare mania trophies and bigger alpha swings',
    },
    {
      id: 'redemption_tour',
      title: 'Redemption Tour',
      subtitle: 'Win back trust without hiding from the tape',
      description: 'A humbler brief gives the fund room to repair reputation, but the board watches risk like a hawk.',
      tone: 'redemption',
      arcId: 'redemption_tour',
      nextThemeId: 'opening_bell',
      challengeMode: 'no_shorts',
      modifierIds: ['risk_review', 'comeback_bonus'],
      rewardPreview: 'Comeback legacy tag if you finish with positive alpha',
    },
    {
      id: 'credit_winter_brief',
      title: 'Credit Winter Brief',
      subtitle: 'Cash matters when liquidity disappears',
      description: 'Funding gets tighter, defensive stocks get a bid, and reckless balance sheets start making strange noises.',
      tone: 'stable',
      arcId: 'credit_winter',
      nextThemeId: 'credit_crunch',
      challengeMode: 'bear_market',
      modifierIds: ['cash_discipline', 'credit_stress'],
      rewardPreview: 'Survival prestige and risk-control trophy routes',
    },
    {
      id: 'rival_grudge_match',
      title: 'Rival Grudge Match',
      subtitle: rival ? `${rival.name} wants the headline back` : 'A rival fund circles your story',
      description: 'One rival turns your last ending into motivation. Beat them this season and the league starts whispering.',
      tone: 'weird',
      arcId: 'rival_grudge',
      nextThemeId: 'startup_boom',
      rivalFocusId: rival?.id,
      modifierIds: ['rival_focus', 'league_heat'],
      rewardPreview: 'Rival Slayer legacy progress',
    },
  ];
}

function preferredOfferIds(ending: LegacyEnding): string[] {
  if (ending.id === 'boardroom_fire' || ending.id === 'short_squeeze_scar' || ending.id === 'quiet_survivor') {
    return ['redemption_tour', 'credit_winter_brief', 'rival_grudge_match'];
  }
  if (ending.id === 'reckless_rocket' || ending.id === 'sector_prophet') {
    return ['ai_bubble_backlash', 'rival_grudge_match', 'board_confidence_mandate'];
  }
  if (ending.id === 'cashflow_royalty') {
    return ['board_confidence_mandate', 'credit_winter_brief', 'rival_grudge_match'];
  }
  return ['board_confidence_mandate', 'ai_bubble_backlash', 'rival_grudge_match'];
}

export function buildLegacyOffers(state: GameState, ending: LegacyEnding, legacy?: LegacyRecord): LegacyPathOffer[] {
  const pool = new Map(offerPool(state, ending).map((offer) => [offer.id, offer]));
  const preferred = preferredOfferIds(ending)
    .map((id) => pool.get(id))
    .filter((offer): offer is LegacyPathOffer => Boolean(offer));

  const seed = hashString(`${ending.runId}:${ending.seasonNumber}:${ending.id}`);
  const ordered = [...preferred].sort((left, right) => {
    const leftScore = hashString(`${left.id}:${seed}`);
    const rightScore = hashString(`${right.id}:${seed}`);
    return leftScore - rightScore;
  });

  const recent = legacy?.chosenPaths.at(-1)?.offerId;
  if (recent && ordered[0]?.id === recent && ordered.length > 1) {
    ordered.push(ordered.shift()!);
  }

  return ordered.slice(0, 3);
}

export function findLegacyOffer(offers: LegacyPathOffer[], offerId: string): LegacyPathOffer | null {
  return offers.find((offer) => offer.id === offerId) || null;
}
