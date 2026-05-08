import { describe, expect, it } from 'vitest';
import { deepCloneGameState } from '../cloneState';
import { createNewGame, placeConditionalOrder } from '../index';
import type { GameState } from '../types';

describe('deepCloneGameState', () => {
  it('produces a value equal to the original', () => {
    const state = createNewGame('Tester', 'normal');
    const clone = deepCloneGameState(state);
    expect(clone.playerName).toBe(state.playerName);
    expect(clone.currentTurn).toBe(state.currentTurn);
    expect(clone.cash).toBe(state.cash);
  });

  it('clones all required GameState array/object fields by reference isolation', () => {
    const state = createNewGame('Tester', 'normal');
    const clone = deepCloneGameState(state);

    // Mutating clone arrays must not touch the original
    clone.stocks[0].currentPrice = 99999;
    expect(state.stocks[0].currentPrice).not.toBe(99999);

    clone.limitOrders.push({} as never);
    expect(state.limitOrders.length).not.toBe(clone.limitOrders.length);

    clone.newsHistory.push({} as never);
    expect(state.newsHistory.length).not.toBe(clone.newsHistory.length);

    clone.netWorthHistory.push({} as never);
    expect(state.netWorthHistory.length).not.toBe(clone.netWorthHistory.length);

    clone.transactionHistory.push({} as never);
    expect(state.transactionHistory.length).not.toBe(clone.transactionHistory.length);

    clone.watchlist.push('test');
    expect(state.watchlist).not.toContain('test');
  });

  it('clones conditionalOrders by reference isolation', () => {
    const state = createNewGame('Tester', 'normal');
    const firstStock = state.stocks.find(s => s.currentPrice > 1);
    if (!firstStock) throw new Error('no stock found');

    const withOrder = placeConditionalOrder(
      state,
      firstStock.id,
      'stop_loss',
      1,
      firstStock.currentPrice * 0.9,
    );
    if (!withOrder.ok) throw new Error(`order failed: ${withOrder.reason}`);
    const stateWithOrders = withOrder.state;

    expect((stateWithOrders.conditionalOrders ?? []).length).toBeGreaterThan(0);

    const clone = deepCloneGameState(stateWithOrders);
    clone.conditionalOrders!.push({} as never);
    expect(stateWithOrders.conditionalOrders!.length).toBe(clone.conditionalOrders!.length - 1);
  });

  it('covers every key present in a fresh GameState', () => {
    const state = createNewGame('Tester', 'normal');
    const clone = deepCloneGameState(state);
    const stateKeys = Object.keys(state) as (keyof GameState)[];
    for (const key of stateKeys) {
      expect(clone).toHaveProperty(key);
    }
  });

  it('clones Date fields as independent Date instances', () => {
    const state = createNewGame('Tester', 'normal');
    const clone = deepCloneGameState(state);
    expect(clone.currentDate).not.toBe(state.currentDate);
    expect(clone.currentDate.getTime()).toBe(new Date(state.currentDate).getTime());
    expect(clone.createdAt).not.toBe(state.createdAt);
    expect(clone.updatedAt).not.toBe(state.updatedAt);
  });
});
