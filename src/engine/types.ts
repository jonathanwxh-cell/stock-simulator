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

export interface Position { stockId: string; shares: number; avgCost: number; }
export interface ShortPosition { stockId: string; shares: number; entryPrice: number; marginUsed: number; }
export interface LimitOrder { id: string; stockId: string; type: 'buy' | 'sell'; shares: number; targetPrice: number; placedTurn: number; }
export interface ConditionalOrder { id: string; stockId: string; type: 'stop_loss' | 'take_profit'; shares: number; triggerPrice: number; placedTurn: number; }
export type PlayerTradeType = 'buy' | 'sell' | 'short' | 'cover' | 'limit_buy' | 'limit_sell' | 'stop_loss' | 'take_profit';

export interface Transaction {
  id: string;
  date: Date;
  turn: number;
  stockId: string;
  type: PlayerTradeType | 'dividend' | 'fee' | 'margin_call' | 'split' | 'mission_reward';
  shares: number;
  price: number;
  total: number;
  fee: number;
}

export interface NetWorthSnapshot { turn: number; date: Date; netWorth: number; cash: number; portfolioValue: number; shortLiability: number; marginUsed: number; }
export interface MarketIndexSnapshot { turn: number; value: number; changePct: number; }
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export interface RiskSnapshot {
  turn: number;
  totalScore: number;
  level: RiskLevel;
  concentrationScore: number;
  sectorScore: number;
  cashBufferScore: number;
  shortExposureScore: number;
  drawdownScore: number;
  warnings: string[];
}
export interface MarketRegime {
  id: string;
  title: string;
  description: string;
  startTurn: number;
  remainingTurns: number;
  sectorEffects: Partial<Record<Sector, number>>;
  volatilityMultiplier: number;
  newsBias?: Partial<Record<Sector, 'positive' | 'negative'>>;
}
export type MissionStatus = 'active' | 'completed' | 'failed';
export type MissionType = 'performance' | 'risk' | 'diversification' | 'income' | 'tactical';
export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  startTurn: number;
  endTurn: number;
  rewardCash: number;
  status: MissionStatus;
  progress: number;
  target: number;
}
export interface AdvisorFeedback {
  headline: string;
  body: string;
  severity: 'info' | 'warning' | 'positive' | 'danger';
  tags: string[];
}

export type CatalystType = 'earnings' | 'guidance' | 'product_launch' | 'analyst_day' | 'regulatory';
export type CatalystVolatility = 'medium' | 'high';

export interface CatalystEvent {
  id: string;
  stockId: string;
  type: CatalystType;
  volatility: CatalystVolatility;
  scheduledTurn: number;
  scheduledDate: Date;
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
  source?: 'random' | 'scenario' | 'catalyst';
  catalystType?: CatalystType;
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
  runId?: string;
  leaderboardEntryId?: string | null;
  playerName: string;
  difficulty: Difficulty;
  currentTurn: number;
  currentDate: Date;
  cash: number;
  portfolio: Record<string, Position>;
  shortPositions: Record<string, ShortPosition>;
  limitOrders: LimitOrder[];
  conditionalOrders?: ConditionalOrder[];
  marginUsed: number;
  totalFeesPaid: number;
  totalDividendsReceived: number;
  transactionHistory: Transaction[];
  netWorthHistory: NetWorthSnapshot[];
  marketIndexHistory: MarketIndexSnapshot[];
  currentRegime: MarketRegime | null;
  riskHistory: RiskSnapshot[];
  activeMission: Mission | null;
  completedMissions: Mission[];
  lastAdvisorFeedback: AdvisorFeedback[];
  watchlist: string[];
  catalystCalendar: CatalystEvent[];
  stocks: Stock[];
  newsHistory: NewsEvent[];
  currentScenario: ActiveScenario | null;
  isGameOver: boolean;
  finalRank: string | null;
  finalGrade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F' | null;
  createdAt: Date;
  updatedAt: Date;
}

export type RebalanceMode = 'sector' | 'stock';
export interface AllocationTarget { id: string; weight: number; }
export interface RebalanceTrade { stockId: string; type: 'buy' | 'sell' | 'short' | 'cover'; shares: number; estimatedValue: number; fee: number; reason: string; }
export interface RebalancePreview { mode: RebalanceMode; totalBasis: number; cashAfter: number; trades: RebalanceTrade[]; warnings: string[]; }

export interface LeaderboardEntry { id: string; runId?: string; playerName: string; difficulty: Difficulty; finalNetWorth: number; startingCash: number; grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'; turnsPlayed: number; date: Date; }
export interface GameSettings { soundEnabled: boolean; musicEnabled: boolean; animationSpeed: 'slow' | 'normal' | 'fast'; showTutorials: boolean; }
export interface SaveMetadata { slot: 1 | 2 | 3 | 'auto'; playerName: string; difficulty: Difficulty; currentTurn: number; turnLimit: number; netWorth: number; cash: number; date: Date; updatedAt: Date; exists: boolean; isGameOver: boolean; }
export type Screen = 'title' | 'game' | 'stock-market' | 'stock-detail' | 'portfolio' | 'rebalance' | 'news' | 'next-turn' | 'game-over' | 'leaderboard' | 'settings' | 'how-to-play' | 'load-save';
export const ALL_SECTORS: Sector[] = ['technology', 'semiconductors', 'healthcare', 'biotech', 'energy', 'financials', 'consumer', 'media', 'industrial', 'realestate', 'telecom', 'materials'];
export type TradeError = 'insufficient_funds' | 'insufficient_shares' | 'invalid_shares' | 'invalid_target_price' | 'max_limit_orders_reached' | 'short_disabled' | 'no_position' | 'stock_not_found';
export type TradeResult = { ok: true; state: GameState; transaction: Transaction } | { ok: false; reason: TradeError };

export interface WatchlistAlert {
  id: string;
  stockId: string;
  turn: number;
  title: string;
  description: string;
  reason: 'price_move' | 'news' | 'catalyst';
  tone: 'positive' | 'negative' | 'neutral';
}

export interface SectorPerformance {
  sector: Sector;
  avgChangePct: number;
  advancers: number;
  decliners: number;
  unchanged: number;
}

export interface MarketBreadthSummary {
  advances: number;
  declines: number;
  unchanged: number;
  sectorPerformance: SectorPerformance[];
  bestSector: SectorPerformance | null;
  worstSector: SectorPerformance | null;
}

export interface SeasonRecapTurn {
  turn: number;
  changePct: number;
}

export interface SeasonRecapHolding {
  stockId: string;
  ticker: string;
  kind: 'long' | 'short';
  pnl: number;
  pnlPct: number;
}

export interface SeasonRecap {
  playerReturnPct: number;
  marketReturnPct: number;
  alphaPct: number;
  bestTurn: SeasonRecapTurn | null;
  worstTurn: SeasonRecapTurn | null;
  maxDrawdownPct: number;
  topWinner: SeasonRecapHolding | null;
  biggestDrag: SeasonRecapHolding | null;
  totalTrades: number;
  totalFees: number;
  totalDividends: number;
  newsEvents: number;
  catalystEvents: number;
  watchedNewsHits: number;
}
