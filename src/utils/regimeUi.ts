import type { MarketRegime, Sector } from '../engine/types';

export type RegimeTone = 'tailwind' | 'headwind' | 'neutral';

export function getSectorRegimeTone(multiplier?: number): RegimeTone {
  if ((multiplier ?? 1) > 1) return 'tailwind';
  if ((multiplier ?? 1) < 1) return 'headwind';
  return 'neutral';
}

export function getTailwindSectors(regime: MarketRegime | null): Sector[] {
  if (!regime) return [];
  return Object.entries(regime.sectorEffects)
    .filter(([, multiplier]) => getSectorRegimeTone(multiplier) === 'tailwind')
    .sort((a, b) => (b[1] ?? 1) - (a[1] ?? 1))
    .map(([sector]) => sector as Sector);
}

export function getHeadwindSectors(regime: MarketRegime | null): Sector[] {
  if (!regime) return [];
  return Object.entries(regime.sectorEffects)
    .filter(([, multiplier]) => getSectorRegimeTone(multiplier) === 'headwind')
    .sort((a, b) => (a[1] ?? 1) - (b[1] ?? 1))
    .map(([sector]) => sector as Sector);
}
