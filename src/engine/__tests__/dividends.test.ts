import { describe, it, expect } from 'vitest';
import { createNewGame, executeBuy, executeShort } from '../gameState';
import { unwrap } from './_helpers';
import { simulateTurn } from '../marketSimulator';
import type { GameState } from '../types';

/**
 * simulateTurn advances the date by 1 month first, then pays dividends.
 * To test January dividends, set the date to December (month 11).
 * Quarterly months after advance: Jan(0), Apr(3), Jul(6), Oct(9)
 * Set date to: Dec(11), Mar(2), Jun(5), Sep(8)
 */

function forceDateToMonth(state: GameState, month: number): GameState {
  const d = new Date(state.currentDate);
  d.setFullYear(2026, month, 15);
  return { ...state, currentDate: d };
}

describe('Dividends', () => {
  it('pays dividend in quarterly month (January)', () => {
    let state = createNewGame('Test', 'normal');
    const divStock = state.stocks.find(s => s.dividendYield > 0)!;
    state = unwrap(state, s => executeBuy(s, divStock.id, 10));
    const cashBefore = state.cash;

    // Set to December -> simulateTurn advances to January -> dividend pays
    state = forceDateToMonth(state, 11);
    state = simulateTurn(state);

    expect(state.cash).toBeGreaterThan(cashBefore);

    const divTxn = state.transactionHistory.find(
      t => t.type === 'dividend' && t.stockId === divStock.id && t.total > 0
    );
    expect(divTxn).toBeDefined();
    expect(divTxn!.shares).toBe(10);
  });

  it('pays dividend in April', () => {
    let state = createNewGame('Test', 'normal');
    const divStock = state.stocks.find(s => s.dividendYield > 0)!;
    state = unwrap(state, s => executeBuy(s, divStock.id, 5));
    const cashBefore = state.cash;

    state = forceDateToMonth(state, 2); // March -> April
    state = simulateTurn(state);

    expect(state.cash).toBeGreaterThan(cashBefore);
  });

  it('does NOT pay dividend in non-quarterly month', () => {
    let state = createNewGame('Test', 'normal');
    const divStock = state.stocks.find(s => s.dividendYield > 0)!;
    state = unwrap(state, s => executeBuy(s, divStock.id, 10));

    state = forceDateToMonth(state, 0); // January -> February
    state = simulateTurn(state);

    const divTxn = state.transactionHistory.find(
      t => t.type === 'dividend' && t.stockId === divStock.id
    );
    expect(divTxn).toBeUndefined();
  });

  it('stock with dividendYield = 0 produces no dividend', () => {
    let state = createNewGame('Test', 'normal');
    const noDivStock = state.stocks.find(s => s.dividendYield === 0)!;
    state = unwrap(state, s => executeBuy(s, noDivStock.id, 10));

    state = forceDateToMonth(state, 11); // Dec -> Jan
    state = simulateTurn(state);

    const divTxn = state.transactionHistory.find(
      t => t.type === 'dividend' && t.stockId === noDivStock.id
    );
    expect(divTxn).toBeUndefined();
  });

  it('short position records a negative dividend transaction', () => {
    let state = createNewGame('Test', 'normal');
    const divStock = state.stocks.find(s => s.dividendYield > 0)!;
    state = unwrap(state, s => executeShort(s, divStock.id, 10));

    state = forceDateToMonth(state, 11); // Dec -> Jan
    state = simulateTurn(state);

    // Assert the short dividend directly instead of using net cash,
    // because simulateTurn can also apply mission rewards and interest.
    const shortDivTxn = state.transactionHistory.find(
      t => t.type === 'dividend' && t.stockId === divStock.id && t.total < 0
    );
    expect(shortDivTxn).toBeDefined();
    expect(shortDivTxn!.shares).toBe(10);
    expect(shortDivTxn!.price).toBeLessThan(0);
  });

  it('long + short on same stock: net dividend effect correct', () => {
    let state = createNewGame('Test', 'normal');
    const divStock = state.stocks.find(s => s.dividendYield > 0)!;
    state = unwrap(state, s => executeBuy(s, divStock.id, 10));
    state = unwrap(state, s => executeShort(s, divStock.id, 5));

    state = forceDateToMonth(state, 11); // Dec -> Jan
    state = simulateTurn(state);

    // Find dividend transactions directly; do not rely on net cash,
    // which can include margin interest and mission rewards.
    const longDiv = state.transactionHistory.find(
      t => t.type === 'dividend' && t.stockId === divStock.id && t.total > 0
    );
    const shortDiv = state.transactionHistory.find(
      t => t.type === 'dividend' && t.stockId === divStock.id && t.total < 0
    );

    expect(longDiv).toBeDefined();
    expect(shortDiv).toBeDefined();

    const longCredit = longDiv!.total;
    const shortDebit = Math.abs(shortDiv!.total);
    const netDividend = longCredit - shortDebit;

    // Long 10 shares should receive exactly 2x what short 5 shares pays.
    expect(longCredit).toBeCloseTo(shortDebit * 2, 1);

    // Net dividend should be positive (long > short).
    expect(netDividend).toBeGreaterThan(0);
    expect(longCredit).toBeGreaterThan(0);
    expect(shortDebit).toBeGreaterThan(0);
  });

  it('dividend transaction has correct shape', () => {
    let state = createNewGame('Test', 'normal');
    const divStock = state.stocks.find(s => s.dividendYield > 0)!;
    state = unwrap(state, s => executeBuy(s, divStock.id, 10));

    state = forceDateToMonth(state, 11); // Dec -> Jan
    state = simulateTurn(state);

    const txn = state.transactionHistory.find(
      t => t.type === 'dividend' && t.stockId === divStock.id && t.total > 0
    )!;

    expect(txn).toBeDefined();
    expect(txn.id).toMatch(/^div_/);
    expect(txn.type).toBe('dividend');
    expect(txn.date).toBeDefined();
    expect(txn.shares).toBe(10);
    expect(txn.total).toBeGreaterThan(0);
    expect(txn.fee).toBe(0);
  });
});
