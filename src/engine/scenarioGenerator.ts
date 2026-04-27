import type { Sector, ActiveScenario, NewsEvent, GameState } from './types';
import { DIFFICULTY_CONFIGS } from './config';
import { getNetWorth } from './marketSimulator';
import templatesData from './data/news-templates.json';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

interface NewsTemplate {
  headline: string;
  description: string;
  sector: Sector | 'all';
  impact: 'positive' | 'negative' | 'neutral';
  magnitudeRange: [number, number];
}

function rng(): number {
  return Math.random();
}

function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randRange(min: number, max: number): number {
  return rng() * (max - min) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  // Fisher-Yates partial shuffle: produces a uniformly random sample of size n.
  const copy = [...arr];
  const k = Math.min(n, copy.length);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, k);
}

function getStocksBySector(state: GameState, sector: Sector | 'all'): string[] {
  if (sector === 'all') return state.stocks.map(s => s.id);
  return state.stocks.filter(s => s.sector === sector).map(s => s.id);
}

function fillTemplate(template: string, company: string, sector: string): string {
  return template.replace(/\{company\}/g, company).replace(/\{sector\}/g, sector);
}


const TEMPLATES_BY_SECTOR = templatesData as unknown as Record<string, {
  positive: NewsTemplate[];
  negative: NewsTemplate[];
}>;

// ── Scenario Titles ───────────────────────────────────────────────────

const POSITIVE_SCENARIO_TITLES = [
  'Bull Market Rally', 'Economic Boom', 'Innovation Wave',
  'Sector Renaissance', 'Market Expansion', 'Growth Surge',
  'Prosperity Cycle', 'Golden Age',
];

const NEGATIVE_SCENARIO_TITLES = [
  'Market Correction', 'Economic Downturn', 'Sector Crisis',
  'Global Recession', 'Financial Turmoil', 'Bear Market',
  'Systemic Shock', 'Contagion Event',
];

const MIXED_SCENARIO_TITLES = [
  'Sector Rotation', 'Market Rebalancing', 'Regulatory Shift',
  'Technological Disruption', 'Policy Transformation', 'Industry Restructuring',
];

// ── Public API ────────────────────────────────────────────────────────

export function generateScenario(gameState: GameState): ActiveScenario {
  const netWorthRatio = getNetWorthRatio(gameState);

  let scenarioType: 'positive' | 'negative' | 'mixed';
  const r = rng();
  if (netWorthRatio > 1.5) {
    scenarioType = r < 0.45 ? 'negative' : r < 0.75 ? 'mixed' : 'positive';
  } else if (netWorthRatio < 0.8) {
    scenarioType = r < 0.45 ? 'positive' : r < 0.75 ? 'mixed' : 'negative';
  } else {
    scenarioType = r < 0.35 ? 'positive' : r < 0.7 ? 'negative' : 'mixed';
  }

  const numEvents = randInt(2, 5);
  const events: NewsEvent[] = [];
  const sectors: (Sector | 'all')[] = [
    'technology', 'semiconductors', 'healthcare', 'biotech', 'energy',
    'financials', 'consumer', 'media', 'industrial', 'realestate',
    'telecom', 'materials', 'all',
  ];

  const sectorEffects: Record<Sector, number> = {
    technology: 1.0, semiconductors: 1.0, healthcare: 1.0, biotech: 1.0,
    energy: 1.0, financials: 1.0, consumer: 1.0, media: 1.0,
    industrial: 1.0, realestate: 1.0, telecom: 1.0, materials: 1.0,
  };

  for (let i = 0; i < numEvents; i++) {
    const sector = pickRandom(sectors);
    const impact = scenarioType === 'mixed' ? undefined : scenarioType;
    const event = generateNewsEvent(gameState, sector, impact);
    events.push(event);

    if (event.sector === 'all') {
      (Object.keys(sectorEffects) as Sector[]).forEach(s => {
        sectorEffects[s] += event.impact === 'positive' ? randRange(0.02, 0.08)
          : event.impact === 'negative' ? -randRange(0.02, 0.08) : 0;
      });
    } else {
      sectorEffects[event.sector] += event.impact === 'positive' ? randRange(0.03, 0.12)
        : event.impact === 'negative' ? -randRange(0.03, 0.12) : 0;
    }
  }

  const title = scenarioType === 'positive'
    ? pickRandom(POSITIVE_SCENARIO_TITLES)
    : scenarioType === 'negative'
    ? pickRandom(NEGATIVE_SCENARIO_TITLES)
    : pickRandom(MIXED_SCENARIO_TITLES);

  const duration = randInt(3, 8);

  return {
    id: genId('scenario'),
    title,
    description: `A ${scenarioType} market scenario unfolds over the next ${duration} turns. ${events[0]?.headline || 'Watch the markets closely.'}`,
    duration,
    totalDuration: duration,
    sectorEffects,
    events,
  };
}

export function generateNewsEvent(
  gameState: GameState,
  forcedSector?: Sector | 'all',
  forcedImpact?: 'positive' | 'negative' | 'neutral',
): NewsEvent {
  const sector = forcedSector || pickRandom(
    ['technology', 'semiconductors', 'healthcare', 'biotech', 'energy',
     'financials', 'consumer', 'media', 'industrial', 'realestate',
     'telecom', 'materials', 'all'] as (Sector | 'all')[]
  );
  const sectorTemplates = TEMPLATES_BY_SECTOR[sector];
  if (!sectorTemplates) {
    throw new Error(`No templates for sector: ${sector}`);
  }

  const impact = forcedImpact || (rng() < 0.45 ? 'positive' : rng() < 0.9 ? 'negative' : 'neutral');
  const templateList = impact === 'positive'
    ? sectorTemplates.positive
    : impact === 'negative'
    ? sectorTemplates.negative
    : [...sectorTemplates.positive, ...sectorTemplates.negative];
  const template = pickRandom(templateList);
  const magnitude = randRange(template.magnitudeRange[0], template.magnitudeRange[1]);

  const affectedStocks = pickRandomN(
    getStocksBySector(gameState, sector),
    randInt(1, 3)
  );

  const stockName = affectedStocks.length > 0
    ? gameState.stocks.find(s => s.id === affectedStocks[0])?.name || 'the company'
    : 'the company';

  return {
    id: genId('news'),
    turn: gameState.currentTurn,
    date: new Date(gameState.currentDate),
    headline: fillTemplate(template.headline, stockName, sector),
    description: fillTemplate(template.description, stockName, sector),
    sector,
    impact,
    magnitude,
    affectedStocks,
  };
}

function getNetWorthRatio(state: GameState): number {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const goal = config.startingCash * config.goalMultiplier;
  return getNetWorth(state) / goal;
}
