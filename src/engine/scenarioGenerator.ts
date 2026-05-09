import type { Sector, ActiveScenario, NewsEvent, GameState } from './types';
import type { RNG } from './rng';
import { defaultRNG } from './rng';
import templatesData from './data/news-templates.json';
import companyTemplatesData from './data/company-news-templates.json';

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

// Company-specific templates keyed by stock id (e.g. "aapl"). Selected with
// 25% probability when a template exists for the primary affected stock; falls
// back to the sector pool otherwise. See issue #31 for rationale and scope.
const COMPANY_TEMPLATES_BY_ID = companyTemplatesData as unknown as Record<string, {
  positive: NewsTemplate[];
  negative: NewsTemplate[];
}>;

export const COMPANY_TEMPLATE_SELECTION_PROBABILITY = 0.25;

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

export function generateScenario(gameState: GameState, rng: RNG = defaultRNG): ActiveScenario {
  // Scenario polarity is determined by RNG and difficulty alone — never by the
  // player's current net worth. A previous version biased toward negative
  // scenarios when the player was winning and toward positive when losing,
  // which made successful runs feel unearned and was opaque to players.
  // See issue #27 for the full rationale.
  let scenarioType: 'positive' | 'negative' | 'mixed';
  const r = rng.next();
  if (r < 0.35) scenarioType = 'positive';
  else if (r < 0.7) scenarioType = 'negative';
  else scenarioType = 'mixed';

  const numEvents = rng.int(2, 5);
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
  const seenEvents = new Set<string>();

  for (let i = 0; i < numEvents; i++) {
    const sector = rng.pick(sectors);
    const impact = scenarioType === 'mixed' ? undefined : scenarioType;
    const event = generateUniqueNewsEvent(gameState, seenEvents, rng, sector, impact);
    if (!event) continue;
    events.push(event);

    if (event.sector === 'all') {
      (Object.keys(sectorEffects) as Sector[]).forEach(s => {
        sectorEffects[s] += event.impact === 'positive' ? rng.range(0.02, 0.08)
          : event.impact === 'negative' ? -rng.range(0.02, 0.08) : 0;
      });
    } else {
      sectorEffects[event.sector] += event.impact === 'positive' ? rng.range(0.03, 0.12)
        : event.impact === 'negative' ? -rng.range(0.03, 0.12) : 0;
    }
  }

  const title = scenarioType === 'positive'
    ? rng.pick(POSITIVE_SCENARIO_TITLES)
    : scenarioType === 'negative'
    ? rng.pick(NEGATIVE_SCENARIO_TITLES)
    : rng.pick(MIXED_SCENARIO_TITLES);

  const duration = rng.int(3, 8);

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
  rng: RNG = defaultRNG,
): NewsEvent {
  const sector = forcedSector || rng.pick(
    ['technology', 'semiconductors', 'healthcare', 'biotech', 'energy',
     'financials', 'consumer', 'media', 'industrial', 'realestate',
     'telecom', 'materials', 'all'] as (Sector | 'all')[]
  );
  const sectorTemplates = TEMPLATES_BY_SECTOR[sector];
  if (!sectorTemplates) {
    throw new Error(`No templates for sector: ${sector}`);
  }

  const impact = forcedImpact || (rng.next() < 0.45 ? 'positive' : rng.next() < 0.9 ? 'negative' : 'neutral');
  const sectorTemplateList = impact === 'positive'
    ? sectorTemplates.positive
    : impact === 'negative'
    ? sectorTemplates.negative
    : [...sectorTemplates.positive, ...sectorTemplates.negative];
  const sectorTemplate = rng.pick(sectorTemplateList);

  const affectedStocks = rng.pickN(
    getStocksBySector(gameState, sector),
    rng.int(1, 3)
  );

  // 25% chance to swap the sector template for a company-specific one when
  // the primary affected stock has bespoke templates (#31). The check only
  // consumes additional RNG when a company pool exists, keeping the seeded
  // sequence identical for stocks without templates.
  const primaryStockId = affectedStocks[0];
  const companyPool = primaryStockId ? COMPANY_TEMPLATES_BY_ID[primaryStockId] : undefined;
  let template = sectorTemplate;
  if (companyPool && rng.next() < COMPANY_TEMPLATE_SELECTION_PROBABILITY) {
    const companyList = impact === 'positive'
      ? companyPool.positive
      : impact === 'negative'
      ? companyPool.negative
      : [...companyPool.positive, ...companyPool.negative];
    if (companyList.length > 0) {
      template = rng.pick(companyList);
    }
  }

  const magnitude = rng.range(template.magnitudeRange[0], template.magnitudeRange[1]);

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

function newsEventSignature(event: NewsEvent): string {
  return `${event.sector}|${event.impact}|${event.headline}|${event.affectedStocks.join(',')}`;
}

function generateUniqueNewsEvent(
  gameState: GameState,
  seenEvents: Set<string>,
  rng: RNG,
  forcedSector?: Sector | 'all',
  forcedImpact?: 'positive' | 'negative' | 'neutral',
): NewsEvent | null {
  for (let attempt = 0; attempt < 8; attempt++) {
    const event = generateNewsEvent(gameState, forcedSector, forcedImpact, rng);
    const signature = newsEventSignature(event);
    if (seenEvents.has(signature)) continue;
    seenEvents.add(signature);
    return event;
  }

  return null;
}

export function generateDistinctNewsEvents(
  gameState: GameState,
  count: number,
  rng: RNG = defaultRNG,
  options: {
    sector?: Sector | 'all';
    impact?: 'positive' | 'negative' | 'neutral';
  } = {},
): NewsEvent[] {
  const events: NewsEvent[] = [];
  const seenEvents = new Set<string>();

  for (let i = 0; i < count; i++) {
    const event = generateUniqueNewsEvent(gameState, seenEvents, rng, options.sector, options.impact);
    if (!event) break;
    events.push(event);
  }

  return events;
}
