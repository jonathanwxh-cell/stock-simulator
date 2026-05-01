import type { MarketRegime, Sector } from '../engine/types';

export type RegimeTone = 'tailwind' | 'headwind' | 'neutral';

export function getRegimeToneForSector(regime: MarketRegime | null, sector: Sector): RegimeTone {
  const multiplier = regime?.sectorEffects[sector];
  if (multiplier === undefined || multiplier === 1) return 'neutral';
  return multiplier > 1 ? 'tailwind' : 'headwind';
}

export function getRegimeTailwindSectors(regime: MarketRegime | null): Sector[] {
  if (!regime) return [];
  return Object.entries(regime.sectorEffects)
    .filter(([, multiplier]) => multiplier > 1)
    .sort((a, b) => (b[1] ?? 1) - (a[1] ?? 1))
    .map(([sector]) => sector as Sector);
}

export function getRegimeHeadwindSectors(regime: MarketRegime | null): Sector[] {
  if (!regime) return [];
  return Object.entries(regime.sectorEffects)
    .filter(([, multiplier]) => multiplier < 1)
    .sort((a, b) => (a[1] ?? 1) - (b[1] ?? 1))
    .map(([sector]) => sector as Sector);
}

export function getSectorRegimeTone(multiplier?: number): RegimeTone {
  if (multiplier === undefined || multiplier === 1) return 'neutral';
  return multiplier > 1 ? 'tailwind' : 'headwind';
}

export const getTailwindSectors = getRegimeTailwindSectors;
export const getHeadwindSectors = getRegimeHeadwindSectors;
