import type { CompanyTrait, Sector } from './types';

type TraitInput = {
  sector: Sector;
  marketCap: 'small' | 'mid' | 'large' | 'mega';
  dividendYield: number;
  volatility: number;
  beta: number;
  basePrice: number;
};

const TRAIT_LABELS: Record<CompanyTrait, string> = {
  growth: 'Growth',
  value: 'Value',
  defensive: 'Defensive',
  cyclical: 'Cyclical',
  income: 'Income',
  speculative: 'Speculative',
  turnaround: 'Turnaround',
  momentum: 'Momentum',
};

function addTrait(traits: CompanyTrait[], trait: CompanyTrait) {
  if (!traits.includes(trait)) traits.push(trait);
}

export function deriveCompanyTraits(stock: TraitInput): CompanyTrait[] {
  const traits: CompanyTrait[] = [];

  if (['technology', 'semiconductors', 'biotech', 'media'].includes(stock.sector)) addTrait(traits, 'growth');
  if (['energy', 'financials', 'industrial', 'materials', 'realestate'].includes(stock.sector)) addTrait(traits, 'cyclical');
  if (['healthcare', 'consumer', 'telecom'].includes(stock.sector)) addTrait(traits, 'defensive');
  if (stock.dividendYield >= 0.025) addTrait(traits, 'income');
  if (stock.volatility >= 0.34 || stock.beta >= 1.45) addTrait(traits, 'speculative');
  if (stock.beta >= 1.15 && stock.volatility >= 0.2) addTrait(traits, 'momentum');
  if (stock.marketCap === 'small' || (stock.marketCap === 'mid' && stock.volatility >= 0.28)) addTrait(traits, 'turnaround');
  if (stock.basePrice < 90 || stock.dividendYield >= 0.018) addTrait(traits, 'value');
  if ((stock.beta <= 0.85 || stock.volatility <= 0.18) && !traits.includes('speculative')) addTrait(traits, 'defensive');

  if (traits.length < 2) {
    addTrait(traits, stock.marketCap === 'mega' || stock.marketCap === 'large' ? 'defensive' : 'turnaround');
  }
  if (traits.length < 2) addTrait(traits, 'value');

  return traits.slice(0, 4);
}

export function getTraitLabel(trait: CompanyTrait): string {
  return TRAIT_LABELS[trait];
}

export function getTraitSummary(traits: CompanyTrait[]): string {
  return traits.map(getTraitLabel).join(' / ');
}
