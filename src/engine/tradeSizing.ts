import { calcBrokerFee, DIFFICULTY_CONFIGS } from './config';
import type { GameState, PlayerTradeType } from './types';

export type TradeSizePresetId = 'tiny' | 'normal' | 'bold' | 'max';

export interface TradeSizePreset {
  id: TradeSizePresetId;
  label: string;
  helper: string;
  shares: number;
  targetPct: number;
}

type SizableTrade = Extract<PlayerTradeType, 'buy' | 'sell' | 'short' | 'cover'>;

const PRESET_TARGETS: Array<{ id: TradeSizePresetId; label: string; targetPct: number }> = [
  { id: 'tiny', label: 'Tiny', targetPct: 5 },
  { id: 'normal', label: 'Normal', targetPct: 10 },
  { id: 'bold', label: 'Bold', targetPct: 25 },
  { id: 'max', label: 'Max', targetPct: 100 },
];

function affordableBuyShares(state: GameState, stockPrice: number): number {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  let shares = Math.max(0, Math.floor(state.cash / Math.max(stockPrice, 1)));
  while (shares > 0) {
    const tradeValue = stockPrice * shares;
    if (tradeValue + calcBrokerFee(tradeValue, config) <= state.cash) return shares;
    shares -= 1;
  }
  return 0;
}

function affordableShortShares(state: GameState, stockPrice: number): number {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  let shares = Math.max(0, Math.floor(state.cash / Math.max(stockPrice * config.shortMarginRequirement, 1)));
  while (shares > 0) {
    const tradeValue = stockPrice * shares;
    const fee = calcBrokerFee(tradeValue, config);
    if (tradeValue * config.shortMarginRequirement + fee <= state.cash) return shares;
    shares -= 1;
  }
  return 0;
}

function maxSharesFor(state: GameState, stockId: string, tradeType: SizableTrade): number {
  const stock = state.stocks.find((entry) => entry.id === stockId);
  if (!stock) return 0;
  if (tradeType === 'sell') return state.portfolio[stockId]?.shares || 0;
  if (tradeType === 'cover') return state.shortPositions[stockId]?.shares || 0;
  if (tradeType === 'short') return affordableShortShares(state, stock.currentPrice);
  return affordableBuyShares(state, stock.currentPrice);
}

export function getTradeSizePresets(state: GameState, stockId: string, tradeType: SizableTrade): TradeSizePreset[] {
  const maxShares = maxSharesFor(state, stockId, tradeType);
  if (maxShares <= 0) {
    return PRESET_TARGETS.map((preset) => ({
      ...preset,
      shares: 0,
      helper: 'No available room for this action right now',
    }));
  }

  return PRESET_TARGETS.map((preset) => {
    const shares = preset.id === 'max'
      ? maxShares
      : Math.max(1, Math.floor(maxShares * (preset.targetPct / 100)));

    return {
      ...preset,
      shares: Math.max(1, Math.min(maxShares, shares)),
      helper: preset.id === 'max'
        ? 'Use all available room'
        : `About ${preset.targetPct}% of available room`,
    };
  });
}
