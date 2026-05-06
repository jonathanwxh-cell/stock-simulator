import type { ConditionalOrder, LimitOrder, Transaction } from './types';
import type { TradeAction } from './tradeFeedback';

export type PlannedOrderKind = 'limit_buy' | 'limit_sell' | ConditionalOrder['type'];

interface ActionLanguage {
  label: string;
  shortLabel: string;
  description: string;
}

export const TRADE_LANGUAGE: Record<TradeAction, ActionLanguage> = {
  buy: {
    label: 'Buy Now',
    shortLabel: 'Buy',
    description: 'Buy shares immediately at the current price this turn.',
  },
  sell: {
    label: 'Sell Now',
    shortLabel: 'Sell',
    description: 'Sell shares you own immediately at the current price this turn.',
  },
  short: {
    label: 'Bet Down',
    shortLabel: 'Bet Down',
    description: 'Open a short position that can profit if the price falls, but can lose if it rises.',
  },
  cover: {
    label: 'Close Short',
    shortLabel: 'Close',
    description: 'Buy shares back to close an existing bet down.',
  },
};

export const ORDER_LANGUAGE: Record<PlannedOrderKind, ActionLanguage> = {
  limit_buy: {
    label: 'Buy If Price Falls To',
    shortLabel: 'Buy If Lower',
    description: 'Wait for a future turn and buy only if the stock falls to your target price.',
  },
  limit_sell: {
    label: 'Sell If Price Rises To',
    shortLabel: 'Sell If Higher',
    description: 'Wait for a future turn and sell only if the stock rises to your target price.',
  },
  stop_loss: {
    label: 'Auto-Sell If Price Drops',
    shortLabel: 'Limit Loss',
    description: 'Wait for a future turn and sell your shares if the stock drops to this trigger price.',
  },
  take_profit: {
    label: 'Auto-Sell If Price Rises',
    shortLabel: 'Lock Gain',
    description: 'Wait for a future turn and sell your shares if the stock rises to this trigger price.',
  },
  short_stop_loss: {
    label: 'Close Short If Price Rises To',
    shortLabel: 'Limit Short Loss',
    description: 'Wait for a future turn and close your short if the stock rises to this trigger price.',
  },
  short_take_profit: {
    label: 'Close Short If Price Falls To',
    shortLabel: 'Lock Short Gain',
    description: 'Wait for a future turn and close your short if the stock falls to this trigger price.',
  },
};

export const TRANSACTION_LANGUAGE: Record<Transaction['type'], ActionLanguage> = {
  buy: {
    label: 'Bought Now',
    shortLabel: 'Bought',
    description: TRADE_LANGUAGE.buy.description,
  },
  sell: {
    label: 'Sold Now',
    shortLabel: 'Sold',
    description: TRADE_LANGUAGE.sell.description,
  },
  short: {
    label: 'Bet Down',
    shortLabel: 'Bet Down',
    description: TRADE_LANGUAGE.short.description,
  },
  cover: {
    label: 'Closed Short',
    shortLabel: 'Closed',
    description: TRADE_LANGUAGE.cover.description,
  },
  limit_buy: {
    label: 'Auto-Bought Lower',
    shortLabel: 'Auto Buy',
    description: ORDER_LANGUAGE.limit_buy.description,
  },
  limit_sell: {
    label: 'Auto-Sold Higher',
    shortLabel: 'Auto Sell',
    description: ORDER_LANGUAGE.limit_sell.description,
  },
  stop_loss: {
    label: 'Auto-Sold Drop',
    shortLabel: 'Limited Loss',
    description: ORDER_LANGUAGE.stop_loss.description,
  },
  take_profit: {
    label: 'Auto-Sold Gain',
    shortLabel: 'Locked Gain',
    description: ORDER_LANGUAGE.take_profit.description,
  },
  short_stop_loss: {
    label: 'Auto-Closed Short Loss',
    shortLabel: 'Short Stop',
    description: ORDER_LANGUAGE.short_stop_loss.description,
  },
  short_take_profit: {
    label: 'Auto-Closed Short Gain',
    shortLabel: 'Short Gain',
    description: ORDER_LANGUAGE.short_take_profit.description,
  },
  dividend: {
    label: 'Dividend Paid',
    shortLabel: 'Dividend',
    description: 'Cash paid by a stock you owned.',
  },
  fee: {
    label: 'Fee Paid',
    shortLabel: 'Fee',
    description: 'Trading or margin cost paid by the fund.',
  },
  margin_call: {
    label: 'Margin Call',
    shortLabel: 'Margin Call',
    description: 'Forced closing of a risky short position.',
  },
  split: {
    label: 'Stock Split',
    shortLabel: 'Split',
    description: 'Share count and price adjusted after a stock split.',
  },
  mission_reward: {
    label: 'Mission Reward',
    shortLabel: 'Reward',
    description: 'Cash reward from completing a mission.',
  },
};

export function getTradeLanguage(action: TradeAction): ActionLanguage {
  return TRADE_LANGUAGE[action];
}

export function getOrderLanguage(kind: PlannedOrderKind): ActionLanguage {
  return ORDER_LANGUAGE[kind];
}

export function getTransactionLanguage(type: Transaction['type']): ActionLanguage {
  return TRANSACTION_LANGUAGE[type];
}

export function getLimitOrderKind(type: LimitOrder['type']): PlannedOrderKind {
  return type === 'buy' ? 'limit_buy' : 'limit_sell';
}
