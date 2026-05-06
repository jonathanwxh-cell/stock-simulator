import { describe, expect, it } from 'vitest';
import { getOrderLanguage, getTradeLanguage, getTransactionLanguage } from '../tradeLanguage';

describe('trade language', () => {
  it('uses beginner-facing labels for immediate trades', () => {
    expect(getTradeLanguage('buy').label).toBe('Buy Now');
    expect(getTradeLanguage('sell').label).toBe('Sell Now');
    expect(getTradeLanguage('short').label).toBe('Bet Down');
    expect(getTradeLanguage('cover').label).toBe('Close Short');
  });

  it('keeps shorting and covering understandable without hiding the mechanic', () => {
    expect(getTradeLanguage('short').description).toContain('profit if the price falls');
    expect(getTradeLanguage('cover').description).toContain('close an existing bet down');
  });

  it('keeps compact trade labels beginner-facing for badges and previews', () => {
    expect(getTradeLanguage('short').shortLabel).toBe('Bet Down');
    expect(getTradeLanguage('cover').shortLabel).toBe('Close');
  });

  it('describes planned orders by outcome instead of jargon', () => {
    expect(getOrderLanguage('limit_buy').label).toBe('Buy If Price Falls To');
    expect(getOrderLanguage('limit_sell').label).toBe('Sell If Price Rises To');
    expect(getOrderLanguage('stop_loss').label).toBe('Auto-Sell If Price Drops');
    expect(getOrderLanguage('take_profit').label).toBe('Auto-Sell If Price Rises');
    expect(getOrderLanguage('short_stop_loss').label).toBe('Close Short If Price Rises To');
    expect(getOrderLanguage('short_take_profit').label).toBe('Close Short If Price Falls To');
  });

  it('explains that planned orders wait for a future turn', () => {
    expect(getOrderLanguage('limit_buy').description).toContain('future turn');
    expect(getOrderLanguage('take_profit').description).toContain('future turn');
  });

  it('turns transaction codes into readable history labels', () => {
    expect(getTransactionLanguage('buy').label).toBe('Bought Now');
    expect(getTransactionLanguage('short').label).toBe('Bet Down');
    expect(getTransactionLanguage('cover').label).toBe('Closed Short');
    expect(getTransactionLanguage('limit_buy').label).toBe('Auto-Bought Lower');
    expect(getTransactionLanguage('stop_loss').label).toBe('Auto-Sold Drop');
    expect(getTransactionLanguage('short_take_profit').label).toBe('Auto-Closed Short Gain');
  });
});
