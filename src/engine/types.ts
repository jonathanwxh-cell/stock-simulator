export type Sector =
  | 'technology'
  | 'semiconductors'
  | 'healthcare'
  | 'biotech'
  | 'energy'
  | 'financials'
  | 'consumer'
  | 'media'
  | 'industrial'
  | 'realestate'
  | 'telecom'
  | 'materials';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface Stock {
  id: string;
  ticker: string;
  name: string;
  sector: Sector;
  description: string;
  basePrice: number;
  currentPrice: number;
  priceHistory: { turn: number; price: number }[];
  volatility: number;
  marketCap: 'small' | 'mid' | 'large' | 'mega';
  dividendYield: number;
  beta: number;
  splitMultiplier: number;
}

export interface Position {
  stockId: string;
  shares: number;
  avgCost: number;
}

export interface ShortPosition {
  stockId: string;
  shares: number;
  entryPrice: number;
  marginUsed: number;
}

export interface LimitOrder {
  id: string;
  stockId: string;
  type: 'buy' | 'sell';
  shares: number;
  targetPrice: number;
  placedTurn: number;
}

export interface Transaction {
  id: string;
  date: Date;
  turn: number;
  stockId: string;
  type: 'buy' | 'sell' | 'short' | 'cover' | 'dividend' | 'fee' | 'margin_call' | 'split' | 'limit_buy' | 'limit_sell';
  shares: number;
  price: number;
  total: number;
  fee: number;
}

export interface NetWorthSnapshot {
  turn: number;
  date: Date;
  netWorth: number;
  cash: number;
  portfolioValue: number;
  shortLiability: number;
  marginUsed: number;
}

export interface NewsEvent {
  id: string;
  turn: number;
  date: Date;
  headline: string;
  description: string;
  sector: Sector | 'all';
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number;
  affectedStocks: string[];
}

export interface ActiveScenario {
  id: string;
  title: string;
  description: string;
  duration: number;
  totalDuration: number;
  sectorEffects: Record<Sector, number>;
  events: NewsEvent[];
}

export interface GameConfig {
  difficulty: Difficulty;
  startingCash: number;
  goalMultiplier: number;
  turnLimit: number;
  volatilityMultiplier: number;
  scenarioFrequency: 'low' | 'normal' | 'high' | 'very_high';
  brokerFeePercent: number;
  brokerFeeMin: number;
  marginMaintenance: number;
  marginInterestRate: number;
  shortEnabled: boolean;
  shortMarginRequirement: number;
  limitOrderFee: number;
  maxLimitOrders: number;
}

export interface GameState {
  saveSlot: 1 | 2 | 3 | 'auto';
  playerName: string;
  difficulty: Difficulty;
  currentTurn: number;
  currentDate: Date;
  cash: number;
  portfolio: Record<string, Position>;
  shortPositions: Record<string, ShortPosition>;
  limitOrders: LimitOrder[];
  marginUsed: number;
  totalFeesPaid: number;
  totalDividendsReceived: number;
  transactionHistory: Transaction[];
  netWorthHistory: NetWorthSnapshot[];
  stocks: Stock[];
  newsHistory: NewsEvent[];
  currentScenario: ActiveScenario | null;
  isGameOver: boolean;
  finalRank: string | null;
  finalGrade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F' | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  difficulty: Difficulty;
  finalNetWorth: number;
  startingCash: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  turnsPlayed: number;
  date: Date;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  showTutorials: boolean;
}

export interface SaveMetadata {
  slot: 1 | 2 | 3 | 'auto';
  playerName: string;
  difficulty: Difficulty;
  currentTurn: number;
  turnLimit: number;
  netWorth: number;
  cash: number;
  date: Date;
  updatedAt: Date;
  exists: boolean;
}

export type Screen =
  | 'title'
  | 'game'
  | 'stock-market'
  | 'stock-detail'
  | 'portfolio'
  | 'news'
  | 'next-turn'
  | 'game-over'
  | 'leaderboard'
  | 'settings'
  | 'how-to-play'
  | 'load-save';

export const ALL_SECTORS: Sector[] = [
  'technology', 'semiconductors', 'healthcare', 'biotech',
  'energy', 'financials', 'consumer', 'media',
  'industrial', 'realestate', 'telecom', 'materials',
];

// ── Typed trade results (v1.4.0) ─────────────────────────────────────

export type TradeError =
  | 'insufficient_funds'
  | 'insufficient_shares'
  | 'invalid_shares'
  | 'invalid_target_price'
  | 'max_limit_orders_reached'
  | 'short_disabled'
  | 'no_position';

export type TradeResult =
  | { ok: true; state: GameState; transaction: Transaction }
  | { ok: false; reason: TradeError };
