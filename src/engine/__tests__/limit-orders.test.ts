import { describe, it, expect } from 'vitest';
import { unwrap } from './_helpers';
import { createNewGame, executeBuy, placeLimitOrder, cancelLimitOrder } from '../gameState';
import { simulateTurn } from '../marketSimulator';
import { DIFFICULTY_CONFIGS } from '../config';
import type { GameState, LimitOrder } from '../types';
import { resolvePendingOrders } from '../orders';

function withPrice(state: GameState, stockId: string, price: number): GameState {
  return {
    ...state,
    stocks: state.stocks.map(st =>
      st.id === stockId ? { ...st, currentPrice: price } : st
    ),
  };
}

/** Directly insert a limit order (bypasses placeLimitOrder validation) */
function insertOrder(state: GameState, order: LimitOrder): GameState {
  return { ...state, limitOrders: [...state.limitOrders, order] };
}

describe('Limit orders', () => {
  const stockId = 'aapl';

  it('resolvePendingOrders executes a triggered limit buy directly', () => {
    let state = createNewGame('Test', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, s => placeLimitOrder(s, stockId, 'buy', 3, 100));

    state = withPrice(state, stockId, 80);
    state = resolvePendingOrders(state);

    expect(state.limitOrders.find(o => o.stockId === stockId)).toBeUndefined();
    expect(state.portfolio[stockId]?.shares).toBe(3);
  });

  it('buy limit triggers when price ≤ target', () => {
    let state = createNewGame('Test', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, s => placeLimitOrder(s, stockId, 'buy', 5, 500));

    state = withPrice(state, stockId, 80);
    state = simulateTurn(state);

    expect(state.limitOrders.find(o => o.stockId === stockId)).toBeUndefined();
    expect(state.portfolio[stockId]?.shares).toBeGreaterThanOrEqual(5);
  });

  it('sell limit triggers when price ≥ target', () => {
    let state = createNewGame('Test', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, s => executeBuy(s, stockId, 10));

    state = unwrap(state, s => placeLimitOrder(s, stockId, 'sell', 5, 1));

    state = withPrice(state, stockId, 120);
    state = simulateTurn(state);

    expect(state.limitOrders.find(o => o.stockId === stockId)).toBeUndefined();
  });

  it('buy limit consumed even when cash insufficient (zombie prevention)', () => {
    let state = createNewGame('Test', 'normal');
    state = withPrice(state, stockId, 100);

    // Directly insert order (bypass placement validation)
    const order: LimitOrder = {
      id: 'lo_zombie_test',
      stockId,
      type: 'buy',
      shares: 9999,
      targetPrice: 1000,
      placedTurn: 0,
    };
    state = insertOrder(state, order);
    expect(state.limitOrders).toHaveLength(1);

    // Price triggers the order but cash is insufficient
    state = withPrice(state, stockId, 50);
    state = simulateTurn(state);

    // Order consumed (not zombie)
    expect(state.limitOrders.find(o => o.id === 'lo_zombie_test')).toBeUndefined();
    // No shares bought
    expect(state.portfolio[stockId]).toBeUndefined();
  });

  it('sell limit consumed even when shares insufficient', () => {
    let state = createNewGame('Test', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, s => executeBuy(s, stockId, 2));

    // Directly insert sell order for more shares than held
    const order: LimitOrder = {
      id: 'lo_sell_zombie',
      stockId,
      type: 'sell',
      shares: 100,
      targetPrice: 50,  // low enough that price will trigger
      placedTurn: 0,
    };
    state = insertOrder(state, order);

    state = withPrice(state, stockId, 200);  // well above target
    state = simulateTurn(state);

    expect(state.limitOrders.find(o => o.id === 'lo_sell_zombie')).toBeUndefined();
    expect(state.portfolio[stockId]?.shares).toBe(2);
  });

  it('order for nonexistent stock is consumed silently', () => {
    let state = createNewGame('Test', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, s => placeLimitOrder(s, stockId, 'buy', 5, 90));

    state.stocks = state.stocks.filter(s => s.id !== stockId);
    state = simulateTurn(state);

    expect(state.limitOrders).toHaveLength(0);
  });

  it('placeLimitOrder rejects targetPrice ≤ 0', () => {
    const state = createNewGame('Test', 'normal');
    const r1 = placeLimitOrder(state, stockId, 'buy', 5, 0);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.reason).toBe('invalid_target_price');
    const r2 = placeLimitOrder(state, stockId, 'buy', 5, -10);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe('invalid_target_price');
  });

  it('placeLimitOrder rejects shares ≤ 0', () => {
    const state = createNewGame('Test', 'normal');
    const r1 = placeLimitOrder(state, stockId, 'buy', 0, 100);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.reason).toBe('invalid_shares');
    const r2 = placeLimitOrder(state, stockId, 'buy', -5, 100);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe('invalid_shares');
  });

  it('placeLimitOrder enforces maxLimitOrders cap', () => {
    let state = createNewGame('Test', 'normal');
    const config = DIFFICULTY_CONFIGS.normal;

    for (let i = 0; i < config.maxLimitOrders; i++) {
      const sid = state.stocks[i % state.stocks.length].id;
      state = withPrice(state, sid, 50);
      state = unwrap(state, s => placeLimitOrder(s, sid, 'buy', 1, 40));
    }

    const r = placeLimitOrder(state, stockId, 'buy', 1, 40);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('max_limit_orders_reached');
  });

  it('cancelLimitOrder removes the right one', () => {
    let state = createNewGame('Test', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, s => placeLimitOrder(s, stockId, 'buy', 5, 90));
    state = unwrap(state, s => placeLimitOrder(s, stockId, 'buy', 10, 80));

    const firstId = state.limitOrders[0].id;
    state = cancelLimitOrder(state, firstId);

    expect(state.limitOrders).toHaveLength(1);
    expect(state.limitOrders[0].id).not.toBe(firstId);
  });

  it('multiple limit orders fire in same turn', () => {
    let state = createNewGame('Test', 'normal');
    const aapl = 'aapl';
    const msft = state.stocks.find(s => s.id !== aapl)!.id;

    // Buy shares in msft at a known price
    state = withPrice(state, msft, 50);
    state = unwrap(state, s => executeBuy(s, msft, 5));

    // Place orders with extreme targets so random walk can't un-trigger
    state = withPrice(state, aapl, 50);
    state = withPrice(state, msft, 50);
    state = unwrap(state, s => placeLimitOrder(s, aapl, 'buy', 2, 500));   // target well above price
    state = unwrap(state, s => placeLimitOrder(s, msft, 'sell', 2, 1));    // target well below price

    // Set prices that will definitely trigger both
    state = withPrice(state, aapl, 10);   // well below 500 target
    state = withPrice(state, msft, 200);  // well above 1 target
    state = simulateTurn(state);

    expect(state.limitOrders).toHaveLength(0);
  });
});
