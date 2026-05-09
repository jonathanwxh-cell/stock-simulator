import type { CatalystEvent, CatalystType, GameState, NewsEvent, Sector, Stock, Position } from './types';
import type { RNG } from './rng';
import { defaultRNG } from './rng';

const DEFAULT_MIN_UPCOMING = 6;

export const CATALYST_TYPE_LABELS: Record<CatalystType, string> = {
  earnings: 'Earnings',
  guidance: 'Guidance Update',
  product_launch: 'Product Launch',
  analyst_day: 'Analyst Day',
  regulatory: 'Regulatory Decision',
};

const SECTOR_CATALYSTS: Partial<Record<Sector, CatalystType[]>> = {
  technology: ['earnings', 'guidance', 'product_launch', 'analyst_day'],
  semiconductors: ['earnings', 'guidance', 'analyst_day', 'product_launch'],
  healthcare: ['earnings', 'guidance', 'regulatory', 'analyst_day'],
  biotech: ['earnings', 'guidance', 'regulatory'],
  consumer: ['earnings', 'guidance', 'product_launch', 'analyst_day'],
  media: ['earnings', 'guidance', 'product_launch', 'analyst_day'],
};

function catalystVolatility(type: CatalystType): CatalystEvent['volatility'] {
  return type === 'earnings' || type === 'regulatory' ? 'high' : 'medium';
}

function buildCatalystHeadline(type: CatalystType, company: string, impact: NewsEvent['impact']): string {
  if (type === 'earnings') {
    if (impact === 'positive') return `${company} beats quarterly expectations`;
    if (impact === 'negative') return `${company} misses on earnings and outlook`;
    return `${company} reports a mixed quarter as guidance stays in focus`;
  }
  if (type === 'guidance') {
    if (impact === 'positive') return `${company} raises guidance after stronger demand`;
    if (impact === 'negative') return `${company} cuts guidance on a softer outlook`;
    return `${company} keeps guidance steady as investors reassess demand`;
  }
  if (type === 'product_launch') {
    if (impact === 'positive') return `${company} wins early traction from a new launch`;
    if (impact === 'negative') return `${company} stumbles after a muted product rollout`;
    return `${company} unveils a new launch with a cautious market response`;
  }
  if (type === 'analyst_day') {
    if (impact === 'positive') return `${company} impresses investors at analyst day`;
    if (impact === 'negative') return `${company} leaves analysts unconvinced at its strategy update`;
    return `${company} hosts analyst day with a measured reaction from Wall Street`;
  }
  if (impact === 'positive') return `${company} clears a key regulatory hurdle`;
  if (impact === 'negative') return `${company} faces a regulatory setback`;
  return `${company} awaits a regulatory ruling with investors on edge`;
}

function buildCatalystDescription(type: CatalystType, company: string, impact: NewsEvent['impact']): string {
  if (type === 'earnings') {
    if (impact === 'positive') return `${company} posted results ahead of expectations, giving traders a fresh reason to lean bullish.`;
    if (impact === 'negative') return `${company} disappointed on its latest quarter, pushing investors to price in a weaker near-term path.`;
    return `${company}'s latest quarter landed close to expectations, but management commentary kept traders divided.`;
  }
  if (type === 'guidance') {
    if (impact === 'positive') return `${company} updated its outlook with a more confident tone, improving sentiment around the stock.`;
    if (impact === 'negative') return `${company}'s updated outlook came in softer than hoped, hitting confidence in the next few turns.`;
    return `${company} refreshed guidance without a clear directional surprise, leaving conviction mixed.`;
  }
  if (type === 'product_launch') {
    if (impact === 'positive') return `${company}'s latest rollout appears to be landing well with customers and investors alike.`;
    if (impact === 'negative') return `${company}'s rollout failed to excite the market, raising concerns about execution.`;
    return `${company}'s launch generated attention, but investors are still waiting for clearer proof of demand.`;
  }
  if (type === 'analyst_day') {
    if (impact === 'positive') return `${company} used its strategy presentation to reinforce the bullish case and improve confidence.`;
    if (impact === 'negative') return `${company}'s investor presentation raised more questions than answers, weighing on sentiment.`;
    return `${company}'s investor event added context, but the market response remained restrained.`;
  }
  if (impact === 'positive') return `${company} cleared an important external hurdle, improving the stock's near-term setup.`;
  if (impact === 'negative') return `${company} hit a key regulatory snag, increasing uncertainty around future growth.`;
  return `${company}'s regulatory update arrived without a decisive signal, keeping traders cautious.`;
}

function catalystMagnitude(type: CatalystType, impact: NewsEvent['impact'], rng: RNG): number {
  const [min, max] = type === 'earnings' || type === 'regulatory'
    ? impact === 'neutral' ? [0.01, 0.02] : [0.03, 0.06]
    : impact === 'neutral'
    ? [0.008, 0.018]
    : [0.018, 0.035];
  return rng.range(min, max);
}

function catalystOutcome(state: GameState, sector: Sector, rng: RNG): NewsEvent['impact'] {
  const bias = state.currentRegime?.newsBias?.[sector];
  const score = rng.range(-0.5, 0.5) + (bias === 'positive' ? 0.12 : bias === 'negative' ? -0.12 : 0);
  if (score >= 0.18) return 'positive';
  if (score <= -0.18) return 'negative';
  return 'neutral';
}

function addMonths(date: Date, offset: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + offset);
  return next;
}

function catalystTypesForSector(sector: Sector): CatalystType[] {
  const specific = SECTOR_CATALYSTS[sector] || [];
  return specific.length ? specific : ['earnings', 'guidance', 'analyst_day'];
}

function compareCatalysts(a: CatalystEvent, b: CatalystEvent): number {
  if (a.scheduledTurn !== b.scheduledTurn) return a.scheduledTurn - b.scheduledTurn;
  return a.stockId.localeCompare(b.stockId);
}

export function ensureUpcomingCatalysts(
  state: GameState,
  existing: CatalystEvent[] = state.catalystCalendar || [],
  rng: RNG = defaultRNG,
  minUpcoming: number = DEFAULT_MIN_UPCOMING,
): CatalystEvent[] {
  const upcoming = existing
    .filter((event) => event.scheduledTurn > state.currentTurn)
    .map((event) => ({ ...event, scheduledDate: new Date(event.scheduledDate) }));
  const seen = new Set(upcoming.map((event) => `${event.stockId}:${event.scheduledTurn}`));

  for (let attempt = 0; upcoming.length < minUpcoming && attempt < minUpcoming * 20; attempt++) {
    const stock = rng.pick(state.stocks);
    if (!stock) break;
    const type = rng.pick(catalystTypesForSector(stock.sector));
    const scheduledTurn = state.currentTurn + rng.int(1, 4);
    const key = `${stock.id}:${scheduledTurn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    upcoming.push({
      id: `catalyst_${crypto.randomUUID()}`,
      stockId: stock.id,
      type,
      volatility: catalystVolatility(type),
      scheduledTurn,
      scheduledDate: addMonths(state.currentDate, scheduledTurn - state.currentTurn),
    });
  }

  return upcoming.sort(compareCatalysts);
}

export interface PendingEarningsDecision {
  catalyst: CatalystEvent;
  stock: Stock;
  position: Position;
}

// Returns earnings catalysts scheduled to resolve next turn for stocks the
// player currently holds long. Used by NextTurn to surface a pre-commitment
// decision card (#36) — the player can trim, add, or hold before the result
// is revealed. Excludes shorts (handled separately) and non-earnings types
// to keep the agency moment scoped to the highest-stakes events.
export function getPendingEarningsDecisions(state: GameState): PendingEarningsDecision[] {
  const calendar = state.catalystCalendar || [];
  const decisions: PendingEarningsDecision[] = [];
  for (const catalyst of calendar) {
    if (catalyst.type !== 'earnings') continue;
    if (catalyst.scheduledTurn !== state.currentTurn + 1) continue;
    const position = state.portfolio[catalyst.stockId];
    if (!position || position.shares <= 0) continue;
    const stock = state.stocks.find((s) => s.id === catalyst.stockId);
    if (!stock) continue;
    decisions.push({ catalyst, stock, position });
  }
  return decisions;
}

export function resolveDueCatalysts(
  state: GameState,
  rng: RNG = defaultRNG,
): { resolvedEvents: NewsEvent[]; remainingCatalysts: CatalystEvent[] } {
  const resolvedEvents: NewsEvent[] = [];
  const remainingCatalysts: CatalystEvent[] = [];

  for (const event of state.catalystCalendar || []) {
    if (event.scheduledTurn > state.currentTurn) {
      remainingCatalysts.push({ ...event, scheduledDate: new Date(event.scheduledDate) });
      continue;
    }

    const stock = state.stocks.find((entry) => entry.id === event.stockId);
    if (!stock) continue;
    const impact = catalystOutcome(state, stock.sector, rng);
    resolvedEvents.push({
      id: `news_${crypto.randomUUID()}`,
      turn: state.currentTurn,
      date: new Date(state.currentDate),
      headline: buildCatalystHeadline(event.type, stock.name, impact),
      description: buildCatalystDescription(event.type, stock.name, impact),
      sector: stock.sector,
      impact,
      magnitude: catalystMagnitude(event.type, impact, rng),
      affectedStocks: [stock.id],
      source: 'catalyst',
      catalystType: event.type,
    });
  }

  return {
    resolvedEvents,
    remainingCatalysts: remainingCatalysts.sort(compareCatalysts),
  };
}
