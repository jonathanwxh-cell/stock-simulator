import type { GameConfig, Difficulty } from './types';
import { roundCurrency } from './financialMath';

export const DIFFICULTY_CONFIGS: Record<Difficulty, GameConfig> = {
  easy: {
    difficulty: 'easy',
    startingCash: 50000,
    goalMultiplier: 3,
    turnLimit: 120,
    volatilityMultiplier: 0.5,
    scenarioFrequency: 'low',
    brokerFeePercent: 0.001,
    brokerFeeMin: 1,
    marginMaintenance: 0.3,
    marginInterestRate: 0.02,
    shortEnabled: true,
    shortMarginRequirement: 1.5,
    limitOrderFee: 0.50,
    maxLimitOrders: 10,
  },
  normal: {
    difficulty: 'normal',
    startingCash: 25000,
    goalMultiplier: 5,
    turnLimit: 100,
    volatilityMultiplier: 1.0,
    scenarioFrequency: 'normal',
    brokerFeePercent: 0.002,
    brokerFeeMin: 2,
    marginMaintenance: 0.3,
    marginInterestRate: 0.03,
    shortEnabled: true,
    shortMarginRequirement: 1.5,
    limitOrderFee: 1.00,
    maxLimitOrders: 8,
  },
  hard: {
    difficulty: 'hard',
    startingCash: 10000,
    goalMultiplier: 10,
    turnLimit: 80,
    volatilityMultiplier: 1.5,
    scenarioFrequency: 'high',
    brokerFeePercent: 0.005,
    brokerFeeMin: 5,
    marginMaintenance: 0.4,
    marginInterestRate: 0.05,
    shortEnabled: true,
    shortMarginRequirement: 2.0,
    limitOrderFee: 2.00,
    maxLimitOrders: 5,
  },
  expert: {
    difficulty: 'expert',
    startingCash: 5000,
    goalMultiplier: 20,
    turnLimit: 60,
    volatilityMultiplier: 2.0,
    scenarioFrequency: 'very_high',
    brokerFeePercent: 0.01,
    brokerFeeMin: 10,
    marginMaintenance: 0.4,
    marginInterestRate: 0.08,
    shortEnabled: true,
    shortMarginRequirement: 2.0,
    limitOrderFee: 5.00,
    maxLimitOrders: 3,
  },
};

export const SCENARIO_FREQUENCY_MAP: Record<string, number> = {
  low: 0.08,
  normal: 0.15,
  high: 0.25,
  very_high: 0.4,
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const START_YEAR = 2024;

export const SECTOR_COLORS: Record<string, string> = {
  technology: '#06B6D4',
  semiconductors: '#0EA5E9',
  healthcare: '#F472B6',
  biotech: '#E879F9',
  energy: '#F59E0B',
  financials: '#6366F1',
  consumer: '#EC4899',
  media: '#F43F5E',
  industrial: '#8B5CF6',
  realestate: '#14B8A6',
  telecom: '#8B8B8B',
  materials: '#D97706',
};

export const SECTOR_LABELS: Record<string, string> = {
  technology: 'Technology',
  semiconductors: 'Semiconductors',
  healthcare: 'Healthcare',
  biotech: 'Biotech',
  energy: 'Energy',
  financials: 'Financials',
  consumer: 'Consumer',
  media: 'Media & Entertainment',
  industrial: 'Industrial',
  realestate: 'Real Estate',
  telecom: 'Telecom',
  materials: 'Materials & Mining',
};

export function calcBrokerFee(total: number, config: GameConfig): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.max(config.brokerFeeMin, roundCurrency(total * config.brokerFeePercent));
}
