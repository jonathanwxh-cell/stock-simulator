import { getPostTurnDestination } from './completion';
import { getLatestRisk } from './riskSystem';
import { getLatestTurnPerformance } from './turnPerformance';
import type { GameState, Screen } from './types';

export type PostTurnDigestTone = 'positive' | 'neutral' | 'warning' | 'danger';

export interface PostTurnDigestStat {
  label: string;
  value: string;
  tone: PostTurnDigestTone;
}

export interface PostTurnDigestAction {
  label: string;
  screen: Screen;
}

export interface PostTurnDigest {
  headline: string;
  body: string;
  tone: PostTurnDigestTone;
  stats: PostTurnDigestStat[];
  notes: string[];
  nextAction: PostTurnDigestAction;
}

function signedPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function statTone(value: number): PostTurnDigestTone {
  if (value > 0.2) return 'positive';
  if (value < -1.5) return 'warning';
  if (value < 0) return 'neutral';
  return 'positive';
}

export function buildPostTurnDigest(state: GameState): PostTurnDigest {
  const performance = getLatestTurnPerformance(state);
  const risk = getLatestRisk(state);
  const defaultDestination = getPostTurnDestination(state);
  const beatMarket = performance.turnAlphaPct >= 0;
  const riskNeedsWork = risk.level === 'high' || risk.level === 'extreme';
  const tone: PostTurnDigestTone = riskNeedsWork
    ? risk.level === 'extreme' ? 'danger' : 'warning'
    : performance.playerMovePct >= 0
    ? 'positive'
    : 'neutral';

  const headline = riskNeedsWork
    ? 'Risk needs a quick tune-up'
    : beatMarket
    ? 'You beat the market this turn'
    : 'The market had the edge this turn';

  const notes = [
    ...(risk.warnings.length > 0 ? [risk.warnings[0]] : []),
    ...(state.lastAdvisorFeedback?.[0] ? [state.lastAdvisorFeedback[0].headline] : []),
  ].slice(0, 2);

  return {
    headline,
    body: `Your fund moved ${signedPct(performance.playerMovePct)} while the market moved ${signedPct(performance.marketMovePct)}.`,
    tone,
    stats: [
      { label: 'You', value: signedPct(performance.playerMovePct), tone: statTone(performance.playerMovePct) },
      { label: 'Market', value: signedPct(performance.marketMovePct), tone: statTone(performance.marketMovePct) },
      { label: 'Alpha', value: signedPct(performance.turnAlphaPct), tone: statTone(performance.turnAlphaPct) },
    ],
    notes,
    nextAction: state.isGameOver
      ? { label: 'View Results', screen: defaultDestination }
      : riskNeedsWork
      ? { label: 'Review Portfolio', screen: 'portfolio' }
      : { label: 'Continue', screen: defaultDestination },
  };
}
