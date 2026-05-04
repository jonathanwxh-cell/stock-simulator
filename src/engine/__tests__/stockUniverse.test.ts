import { describe, expect, it } from 'vitest';
import { cloneInitialStocks } from '../stockData';
import type { Sector } from '../types';

const sectors: Sector[] = [
  'technology',
  'semiconductors',
  'healthcare',
  'biotech',
  'energy',
  'financials',
  'consumer',
  'media',
  'industrial',
  'realestate',
  'telecom',
  'materials',
];

const retiredTickers = new Set([
  'AAPL',
  'MSFT',
  'GOOG',
  'META',
  'CRM',
  'NVDA',
  'TSM',
  'AMD',
  'AVGO',
  'QCOM',
  'JNJ',
  'UNH',
  'PFE',
  'MRK',
  'ABBV',
  'AMGN',
  'GILD',
  'BIIB',
  'VRTX',
  'MRNA',
  'XOM',
  'CVX',
  'SLB',
  'ENPH',
  'FSLR',
  'JPM',
  'V',
  'MA',
  'BAC',
  'BLK',
  'AMZN',
  'TSLA',
  'NKE',
  'SBUX',
  'MCD',
  'DIS',
  'NFLX',
  'WBD',
  'SONY',
  'EA',
  'CAT',
  'BA',
  'HON',
  'GE',
  'LMT',
  'PLD',
  'AMT',
  'NEE',
  'D',
  'SO',
  'T',
  'VZ',
  'TMUS',
  'CMCSA',
  'CME',
  'LIN',
  'NEM',
  'FCX',
  'SHW',
  'APD',
]);

const retiredBrandTerms = [
  'Apple',
  'Microsoft',
  'Alphabet',
  'Google',
  'Meta',
  'Facebook',
  'Instagram',
  'WhatsApp',
  'Salesforce',
  'NVIDIA',
  'Taiwan Semiconductor',
  'Advanced Micro Devices',
  'Broadcom',
  'Qualcomm',
  'Johnson & Johnson',
  'UnitedHealth',
  'Pfizer',
  'Merck',
  'AbbVie',
  'Amgen',
  'Gilead',
  'Biogen',
  'Vertex',
  'Moderna',
  'Exxon',
  'Chevron',
  'Schlumberger',
  'Enphase',
  'First Solar',
  'JPMorgan',
  'Visa',
  'Mastercard',
  'Bank of America',
  'BlackRock',
  'Amazon',
  'Tesla',
  'Nike',
  'Starbucks',
  "McDonald's",
  'McDonald',
  'Disney',
  'Netflix',
  'Warner Bros',
  'Sony',
  'Electronic Arts',
  'Caterpillar',
  'Boeing',
  'Honeywell',
  'GE Aerospace',
  'Lockheed',
  'Prologis',
  'American Tower',
  'NextEra',
  'Dominion',
  'Southern Company',
  'AT&T',
  'Verizon',
  'T-Mobile',
  'Comcast',
  'CME Group',
  'Linde',
  'Newmont',
  'Freeport',
  'Sherwin-Williams',
  'Air Products',
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function referencesRetiredBrand(visibleText: string, term: string): boolean {
  const phrase = escapeRegex(term.toLowerCase()).replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${phrase}([^a-z0-9]|$)`).test(visibleText);
}

describe('stock universe', () => {
  it('offers a broad fictional market across every sector', () => {
    const stocks = cloneInitialStocks();
    const tickers = new Set(stocks.map((stock) => stock.ticker));

    expect(stocks).toHaveLength(96);
    expect(tickers.size).toBe(stocks.length);

    for (const sector of sectors) {
      expect(stocks.filter((stock) => stock.sector === sector)).toHaveLength(8);
    }
  });

  it('does not expose retired real-world company brands or tickers to players', () => {
    const stocks = cloneInitialStocks();

    for (const stock of stocks) {
      expect(retiredTickers.has(stock.ticker), `${stock.id} still uses retired ticker ${stock.ticker}`).toBe(false);

      const visibleText = `${stock.name} ${stock.description}`.toLowerCase();
      for (const term of retiredBrandTerms) {
        expect(referencesRetiredBrand(visibleText, term), `${stock.id} still references ${term}`).toBe(false);
      }
    }
  });
});
