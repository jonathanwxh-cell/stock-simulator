import type { MarketRegime, Sector } from './types';
import type { RNG } from './rng';

const ALL_REGIMES: Omit<MarketRegime, 'startTurn' | 'remainingTurns'>[] = [
  {
    id: 'neutral',
    title: 'Neutral Market',
    description: 'No dominant macro force. Stock selection matters more than broad regime bets.',
    sectorEffects: {},
    volatilityMultiplier: 1,
  },
  {
    id: 'ai_boom',
    title: 'AI Boom',
    description: 'Semiconductors and technology have a tailwind while volatility is elevated.',
    sectorEffects: { semiconductors: 1.08, technology: 1.04, energy: 1.01 },
    volatilityMultiplier: 1.15,
    newsBias: { semiconductors: 'positive', technology: 'positive' },
  },
  {
    id: 'rate_hike',
    title: 'Rate Hike Pressure',
    description: 'Higher rates pressure long-duration technology, semiconductors, and real estate.',
    sectorEffects: { realestate: 0.93, technology: 0.96, semiconductors: 0.96, financials: 1.01 },
    volatilityMultiplier: 1.2,
    newsBias: { realestate: 'negative', technology: 'negative', semiconductors: 'negative' },
  },
  {
    id: 'energy_shock',
    title: 'Energy Shock',
    description: 'Energy producers benefit while consumers and industrials face cost pressure.',
    sectorEffects: { energy: 1.1, consumer: 0.96, industrial: 0.97, materials: 1.01 },
    volatilityMultiplier: 1.3,
    newsBias: { energy: 'positive', consumer: 'negative' },
  },
  {
    id: 'consumer_slowdown',
    title: 'Consumer Slowdown',
    description: 'Consumer demand weakens. Defensive healthcare and telecom are steadier.',
    sectorEffects: { consumer: 0.93, media: 0.96, healthcare: 1.02, telecom: 1.01 },
    volatilityMultiplier: 1.15,
    newsBias: { consumer: 'negative', healthcare: 'positive' },
  },
  {
    id: 'credit_stress',
    title: 'Credit Stress',
    description: 'Financials and real estate are under stress. Defensive sectors gain relative support.',
    sectorEffects: { financials: 0.92, realestate: 0.92, consumer: 0.96, healthcare: 1.02, telecom: 1.01 },
    volatilityMultiplier: 1.4,
    newsBias: { financials: 'negative', realestate: 'negative' },
  },
];

export function createInitialRegime(): MarketRegime {
  return {
    ...ALL_REGIMES[0],
    startTurn: 0,
    remainingTurns: 6,
  };
}

export function rollRegime(turn: number, rng: RNG): MarketRegime {
  const template = ALL_REGIMES[rng.int(0, ALL_REGIMES.length - 1)];
  return {
    ...template,
    sectorEffects: { ...template.sectorEffects },
    newsBias: template.newsBias ? { ...template.newsBias } : undefined,
    startTurn: turn,
    remainingTurns: rng.int(4, 10),
  };
}

export function advanceRegime(current: MarketRegime | null, turn: number, rng: RNG): MarketRegime {
  if (!current) return createInitialRegime();
  const next = { ...current, sectorEffects: { ...current.sectorEffects }, newsBias: current.newsBias ? { ...current.newsBias } : undefined };
  next.remainingTurns -= 1;
  if (next.remainingTurns <= 0) return rollRegime(turn, rng);
  return next;
}

export function getRegimeSectorMultiplier(regime: MarketRegime | null, sector: Sector): number {
  if (!regime) return 1;
  return regime.sectorEffects[sector] ?? 1;
}

export function getRegimeAverageEffect(regime: MarketRegime | null): number {
  if (!regime) return 1;
  const values = Object.values(regime.sectorEffects);
  if (values.length === 0) return 1;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
