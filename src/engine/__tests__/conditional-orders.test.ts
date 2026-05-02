import { describe, expect, it } from 'vitest';
import { unwrap } from './_helpers';
import { createNewGame, executeBuy, executeSell } from '../gameState';
import { placeConditionalOrder, resolvePendingOrders } from '../orders';

function withPrice(state: ReturnType<typeof createNewGame>, stockId: string, price: number) {
  return {
    ...state,
    stocks: state.stocks.map((stock) =>
      stock.id === stockId ? { ...stock, currentPrice: price } : stock,
    ),
  };
}

describe('Conditional orders', () => {
  const stockId = 'aapl';

  it('places a stop-loss on owned long shares', () => {
    let state = createNewGame('Protect', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, (current) => executeBuy(current, stockId, 10));

    const result = placeConditionalOrder(state, stockId, 'stop_loss', 4, 90);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.conditionalOrders).toHaveLength(1);
    expect(result.state.conditionalOrders?.[0]).toMatchObject({
      stockId,
      type: 'stop_loss',
      shares: 4,
      triggerPrice: 90,
    });
  });

  it('rejects take-profit shares above the long position', () => {
    let state = createNewGame('Protect', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, (current) => executeBuy(current, stockId, 2));

    const result = placeConditionalOrder(state, stockId, 'take_profit', 3, 110);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_shares');
  });

  it('executes a triggered stop-loss through the shared resolver', () => {
    let state = createNewGame('Protect', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, (current) => executeBuy(current, stockId, 5));
    state = unwrap(state, (current) => placeConditionalOrder(current, stockId, 'stop_loss', 5, 90));

    state = withPrice(state, stockId, 80);
    state = resolvePendingOrders(state);

    expect(state.conditionalOrders).toHaveLength(0);
    expect(state.portfolio[stockId]).toBeUndefined();
    expect(state.transactionHistory.some((txn) => txn.type === 'stop_loss')).toBe(true);
  });

  it('executes a triggered take-profit through the shared resolver', () => {
    let state = createNewGame('Protect', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, (current) => executeBuy(current, stockId, 5));
    state = unwrap(state, (current) => placeConditionalOrder(current, stockId, 'take_profit', 3, 110));

    state = withPrice(state, stockId, 120);
    state = resolvePendingOrders(state);

    expect(state.conditionalOrders).toHaveLength(0);
    expect(state.portfolio[stockId]?.shares).toBe(2);
    expect(state.transactionHistory.some((txn) => txn.type === 'take_profit')).toBe(true);
  });

  it('consumes a triggered protective order after the shares are gone', () => {
    let state = createNewGame('Protect', 'normal');
    state = withPrice(state, stockId, 100);
    state = unwrap(state, (current) => executeBuy(current, stockId, 2));
    state = unwrap(state, (current) => placeConditionalOrder(current, stockId, 'stop_loss', 2, 90));
    state = unwrap(state, (current) => executeSell(current, stockId, 2));

    state = withPrice(state, stockId, 80);
    state = resolvePendingOrders(state);

    expect(state.conditionalOrders).toHaveLength(0);
    expect(state.transactionHistory.filter((txn) => txn.type === 'stop_loss')).toHaveLength(0);
  });
});
