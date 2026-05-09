import { describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { generateNewsEvent } from '../scenarioGenerator';
import { SeededRNG } from '../rng';
import companyTemplatesData from '../data/company-news-templates.json';

const COMPANY_TEMPLATES = companyTemplatesData as Record<string, {
  positive: Array<{ headline: string }>;
  negative: Array<{ headline: string }>;
}>;

// Map of headline → owning stockId, for verifying templates only fire for
// their named company.
const HEADLINE_OWNER = new Map<string, string>();
for (const [stockId, buckets] of Object.entries(COMPANY_TEMPLATES)) {
  for (const t of buckets.positive) HEADLINE_OWNER.set(t.headline, stockId);
  for (const t of buckets.negative) HEADLINE_OWNER.set(t.headline, stockId);
}

// Build a regex from a template string by escaping literals and replacing
// {company} with .+ so we can identify which template produced a headline.
function templateToRegex(tpl: string): RegExp {
  const parts = tpl.split('{company}').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${parts.join('.+')}$`);
}

// Map a generated headline back to its owning stock id, or '' if no
// company-specific template matches.
function templateSignature(headline: string): string {
  for (const [tplHeadline, ownerId] of HEADLINE_OWNER.entries()) {
    if (templateToRegex(tplHeadline).test(headline)) return ownerId;
  }
  return '';
}

describe('Company-specific news templates (#31)', () => {
  it('templates exist for at least 24 stocks with ≥2 templates each', () => {
    const stockIds = Object.keys(COMPANY_TEMPLATES);
    expect(stockIds.length).toBeGreaterThanOrEqual(24);
    for (const id of stockIds) {
      const total = COMPANY_TEMPLATES[id].positive.length + COMPANY_TEMPLATES[id].negative.length;
      expect(total, `${id} should have ≥2 templates`).toBeGreaterThanOrEqual(2);
    }
  });

  it('every anchor stock id maps to a real stock in the game', () => {
    const state = createNewGame('Tester', 'normal');
    const stockIds = new Set(state.stocks.map(s => s.id));
    for (const anchorId of Object.keys(COMPANY_TEMPLATES)) {
      expect(stockIds.has(anchorId), `${anchorId} must exist in stocks.json`).toBe(true);
    }
  });

  it('every template signature only fires for its owning stock across N=400 runs', () => {
    const state = createNewGame('Tester', 'normal');
    const rng = new SeededRNG(7);
    let companyHits = 0;
    for (let i = 0; i < 400; i++) {
      const event = generateNewsEvent(state, undefined, undefined, rng);
      const owner = templateSignature(event.headline);
      if (owner) {
        companyHits += 1;
        expect(event.affectedStocks[0], `template "${event.headline}" should fire only for ${owner}`).toBe(owner);
      }
    }
    // Statistical sanity: with ~25% company-template probability gated on
    // having an anchor stock as primary, we expect at least some hits.
    expect(companyHits).toBeGreaterThan(0);
  });

  it('company-template selection rate stays around 25% when an anchor stock is forced', () => {
    // Build a small sample to verify the 25% mix probability: force the
    // sector to one we know has anchors, run many trials, and count how
    // often the headline came from the company pool vs the sector pool.
    const state = createNewGame('Tester', 'normal');
    // Find a sector with anchor stocks
    const anchorSector = state.stocks.find(s => COMPANY_TEMPLATES[s.id])?.sector;
    expect(anchorSector).toBeTruthy();

    const rng = new SeededRNG(99);
    const trials = 1000;
    let companyHits = 0;
    let trialsWithAnchorPrimary = 0;
    for (let i = 0; i < trials; i++) {
      const event = generateNewsEvent(state, anchorSector, 'positive', rng);
      const primary = event.affectedStocks[0];
      if (primary && COMPANY_TEMPLATES[primary]) {
        trialsWithAnchorPrimary += 1;
        if (templateSignature(event.headline)) {
          companyHits += 1;
        }
      }
    }
    // Conditional on primary being an anchor, probability ≈ 0.25.
    // 12pp tolerance keeps the test stable under SeededRNG sampling noise.
    expect(trialsWithAnchorPrimary).toBeGreaterThan(50);
    const observed = companyHits / trialsWithAnchorPrimary;
    expect(observed).toBeGreaterThan(0.13);
    expect(observed).toBeLessThan(0.37);
  });

  it('falls back gracefully for stocks without company templates', () => {
    const state = createNewGame('Tester', 'normal');
    const noAnchorStock = state.stocks.find(s => !COMPANY_TEMPLATES[s.id]);
    expect(noAnchorStock).toBeTruthy();
    if (!noAnchorStock) return;

    // Generate many events; even if the primary stock lacks templates, the
    // function must succeed using only the sector pool.
    const rng = new SeededRNG(11);
    for (let i = 0; i < 50; i++) {
      const event = generateNewsEvent(state, noAnchorStock.sector, 'positive', rng);
      expect(event.headline.length).toBeGreaterThan(0);
    }
  });
});
