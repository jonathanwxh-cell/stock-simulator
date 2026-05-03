import stocksData from './data/stocks.json';
import type { Stock, Sector } from './types';
import { deriveCompanyTraits } from './companyTraits';

interface StockBase {
  id: string;
  ticker: string;
  name: string;
  sector: Sector;
  description: string;
  basePrice: number;
  volatility: number;
  marketCap: 'small' | 'mid' | 'large' | 'mega';
  dividendYield: number;
  beta: number;
}

const initialStocks = stocksData as StockBase[];

export function cloneInitialStocks(): Stock[] {
  return initialStocks.map(s => ({
    ...s,
    currentPrice: s.basePrice,
    splitMultiplier: 1,
    traits: deriveCompanyTraits(s),
    priceHistory: [{ turn: 0, price: s.basePrice }],
  }));
}
