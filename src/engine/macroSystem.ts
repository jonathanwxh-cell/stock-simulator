import type { MacroBackdrop, MacroEnvironment, MacroFactor, MacroTrend, Sector, Stock } from './types';
import type { RNG } from './rng';
import { defaultRNG } from './rng';

const FACTORS: MacroFactor[] = ['interestRate', 'inflation', 'growth', 'creditStress', 'oilPrice', 'sentiment'];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function trendFor(delta: number): MacroTrend {
  if (delta > 2) return 'rising';
  if (delta < -2) return 'falling';
  return 'stable';
}

function score(value: number): number {
  return (value - 50) / 50;
}

function inverseScore(value: number): number {
  return (50 - value) / 50;
}

function buildTrends(prev: MacroEnvironment | null, next: Omit<MacroEnvironment, 'trends' | 'narrative'>): Record<MacroFactor, MacroTrend> {
  const trends = {} as Record<MacroFactor, MacroTrend>;
  for (const factor of FACTORS) {
    trends[factor] = prev ? trendFor(next[factor] - prev[factor]) : 'stable';
  }
  return trends;
}

function buildNarrative(env: Omit<MacroEnvironment, 'narrative'>): string {
  if (env.growth >= 65 && env.interestRate <= 40 && env.sentiment >= 60) {
    return 'Easy money and firm growth are giving risk assets a bid.';
  }
  if (env.inflation >= 65 && env.interestRate >= 65) {
    return 'Inflation and tight policy are pressuring long-duration growth.';
  }
  if (env.creditStress >= 65 || env.sentiment <= 35) {
    return 'Credit stress and weak confidence are pushing investors toward quality.';
  }
  if (env.oilPrice >= 70) {
    return 'Elevated oil prices are reshuffling sector leadership.';
  }
  return 'The macro tape is mixed, so stock selection and catalysts matter most.';
}

export function createInitialMacroEnvironment(): MacroEnvironment {
  const base = {
    turn: 0,
    interestRate: 48,
    inflation: 44,
    growth: 54,
    creditStress: 36,
    oilPrice: 50,
    sentiment: 56,
  };
  const withTrends = { ...base, trends: buildTrends(null, base) };
  return { ...withTrends, narrative: buildNarrative(withTrends) };
}

function advanceFactor(value: number, anchor: number, rng: RNG, shock = 7): number {
  const meanReversion = (anchor - value) * 0.08;
  return clamp(value + meanReversion + rng.range(-shock, shock));
}

export function advanceMacroEnvironment(prev: MacroEnvironment, turn: number, rng: RNG = defaultRNG): MacroEnvironment {
  const base = {
    turn,
    interestRate: advanceFactor(prev.interestRate, 48, rng, 6),
    inflation: advanceFactor(prev.inflation, 44, rng, 7),
    growth: advanceFactor(prev.growth, 54, rng, 8),
    creditStress: advanceFactor(prev.creditStress, 36, rng, 7),
    oilPrice: advanceFactor(prev.oilPrice, 50, rng, 9),
    sentiment: advanceFactor(prev.sentiment, 56, rng, 8),
  };
  const withTrends = { ...base, trends: buildTrends(prev, base) };
  return { ...withTrends, narrative: buildNarrative(withTrends) };
}

function sectorMacroScore(sector: Sector, macro: MacroEnvironment): number {
  const growth = score(macro.growth);
  const lowRates = inverseScore(macro.interestRate);
  const lowInflation = inverseScore(macro.inflation);
  const calmCredit = inverseScore(macro.creditStress);
  const oil = score(macro.oilPrice);
  const sentiment = score(macro.sentiment);

  const map: Record<Sector, number> = {
    technology: growth * 0.28 + lowRates * 0.32 + sentiment * 0.22 + lowInflation * 0.18,
    semiconductors: growth * 0.34 + lowRates * 0.2 + sentiment * 0.22 + lowInflation * 0.1 - oil * 0.1,
    healthcare: calmCredit * 0.25 + lowInflation * 0.2 + sentiment * 0.08,
    biotech: growth * 0.24 + lowRates * 0.34 + sentiment * 0.22 - score(macro.creditStress) * 0.2,
    energy: oil * 0.52 + growth * 0.16 + score(macro.inflation) * 0.12,
    financials: growth * 0.2 + calmCredit * 0.34 + score(macro.interestRate) * 0.1,
    consumer: sentiment * 0.36 + growth * 0.26 + lowInflation * 0.22,
    media: sentiment * 0.32 + growth * 0.24 + lowRates * 0.2,
    industrial: growth * 0.34 + calmCredit * 0.2 - oil * 0.08,
    realestate: lowRates * 0.38 + calmCredit * 0.24 + lowInflation * 0.16,
    telecom: calmCredit * 0.24 + lowRates * 0.16 + lowInflation * 0.12,
    materials: growth * 0.24 + oil * 0.12 + score(macro.inflation) * 0.1,
  };

  return map[sector] ?? 0;
}

function traitMacroScore(stock: Stock, macro: MacroEnvironment): number {
  const traits = stock.traits || [];
  let value = 0;
  if (traits.includes('growth')) value += score(macro.growth) * 0.24 + inverseScore(macro.interestRate) * 0.34 + score(macro.sentiment) * 0.2;
  if (traits.includes('speculative')) value += inverseScore(macro.creditStress) * 0.34 + score(macro.sentiment) * 0.22 + inverseScore(macro.interestRate) * 0.16;
  if (traits.includes('income')) value += inverseScore(macro.interestRate) * 0.24 + inverseScore(macro.inflation) * 0.2;
  if (traits.includes('defensive')) value += inverseScore(macro.creditStress) * 0.16 + inverseScore(macro.inflation) * 0.12 - score(macro.sentiment) * 0.04;
  if (traits.includes('cyclical')) value += score(macro.growth) * 0.28 + score(macro.sentiment) * 0.16;
  if (traits.includes('value')) value += inverseScore(macro.creditStress) * 0.12 + inverseScore(macro.interestRate) * 0.08;
  if (traits.includes('turnaround')) value += inverseScore(macro.creditStress) * 0.26 + score(macro.sentiment) * 0.18;
  if (traits.includes('momentum')) value += score(macro.sentiment) * 0.24 + score(macro.growth) * 0.12;
  return value;
}

export function getMacroStockDrift(stock: Stock, macro: MacroEnvironment): number {
  const raw = sectorMacroScore(stock.sector, macro) + traitMacroScore(stock, macro);
  return Math.max(-0.045, Math.min(0.045, raw * 0.035));
}

export function getMacroSectorMultiplier(macro: MacroEnvironment, sector: Sector): number {
  return 1 + Math.max(-0.05, Math.min(0.05, sectorMacroScore(sector, macro) * 0.04));
}

export function getMacroBackdrop(macro: MacroEnvironment): MacroBackdrop {
  const tone =
    macro.growth >= 60 && macro.sentiment >= 55 && macro.creditStress <= 45
      ? 'positive'
      : macro.inflation >= 65 || macro.creditStress >= 65 || macro.sentiment <= 35
      ? 'negative'
      : 'neutral';

  return {
    headline: macro.narrative,
    tone,
    details: [
      `Rates ${macro.trends.interestRate}: ${macro.interestRate}/100`,
      `Inflation ${macro.trends.inflation}: ${macro.inflation}/100`,
      `Growth ${macro.trends.growth}: ${macro.growth}/100`,
      `Credit stress ${macro.trends.creditStress}: ${macro.creditStress}/100`,
    ],
  };
}
