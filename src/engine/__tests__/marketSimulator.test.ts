import { describe, it, expect } from 'vitest';
import {
  createNewGame,
  executeBuy,
  executeSell,
  executeShort,
  executeCover,
  getNetWorth,
} from '../gameState';
import { simulateTurn } from '../marketSimulator';
import { DIFFICULTY_CONFIGS } from '../config';

/**
 * These tests pin down the engine's accounting invariants — especially around
 * shorts, which previously lost the original short proceeds and caused all
 * shorts to bleed money regardless of price direction.
 */

describe('Long roundtrip (buy → sell)', () => {
  it('roughly breaks even at the same price (only fees lost)', () => {
    let state = createNewGame('Test', 'normal');
    const stock = state.stocks[0];
    const stockId = stock.id;
    const price = stock.currentPrice;
    const initialNetWorth = getNetWorth(state);

    state = executeBuy(state, stockId, 10).state;
    state = executeSell(state, stockId, 10).state;

    const finalNetWorth = getNetWorth(state);
    const loss = initialNetWorth - finalNetWorth;

    // Two fee events; on normal that's max($2, 0.2% of total) twice
    const expectedMaxLoss = price * 10 * 0.002 * 2 + 4; // generous upper bound
    expect(loss).toBeGreaterThan(0);
    expect(loss).toBeLessThan(expectedMaxLoss);
  });

  it('profits when price rises after buying', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    const initialNetWorth = getNetWorth(state);

    state = executeBuy(state, stockId, 10).state;

    // Force price up 50%
    state.stocks[0].currentPrice = state.stocks[0].currentPrice * 1.5;

    state = executeSell(state, stockId, 10).state;
    expect(getNetWorth(state)).toBeGreaterThan(initialNetWorth);
  });
});

describe('Short roundtrip (short → cover)', () => {
  it('PROFITS when price drops (the regression test)', () => {
    let state = createNewGame('Test', 'normal');
    const stock = state.stocks[0];
    const stockId = stock.id;
    const entryPrice = stock.currentPrice;
    const initialNetWorth = getNetWorth(state);
    const shares = 10;

    state = executeShort(state, stockId, shares).state;

    // Price drops 30%
    const newPrice = entryPrice * 0.7;
    state.stocks[0].currentPrice = newPrice;

    state = executeCover(state, stockId, shares).state;

    const finalNetWorth = getNetWorth(state);
    const profit = finalNetWorth - initialNetWorth;
    const expectedGrossPnl = (entryPrice - newPrice) * shares;

    // Expect close to gross PnL minus two fees
    expect(profit).toBeGreaterThan(0);
    expect(profit).toBeGreaterThan(expectedGrossPnl * 0.9);
    expect(profit).toBeLessThan(expectedGrossPnl);
  });

  it('LOSES when price rises', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    const entryPrice = state.stocks[0].currentPrice;
    const initialNetWorth = getNetWorth(state);

    state = executeShort(state, stockId, 10).state;
    state.stocks[0].currentPrice = entryPrice * 1.3;
    state = executeCover(state, stockId, 10).state;

    expect(getNetWorth(state)).toBeLessThan(initialNetWorth);
  });

  it('roughly breaks even at the same price (only fees lost)', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    const initialNetWorth = getNetWorth(state);

    state = executeShort(state, stockId, 10).state;
    // No price change
    state = executeCover(state, stockId, 10).state;

    const loss = initialNetWorth - getNetWorth(state);
    expect(loss).toBeGreaterThan(0);
    expect(loss).toBeLessThan(50); // small fees only
  });

  it('partial covers track PnL correctly', () => {
    let state = createNewGame('Test', 'normal');
    const stock = state.stocks[0];
    const stockId = stock.id;
    const entryPrice = stock.currentPrice;
    const initialNetWorth = getNetWorth(state);

    state = executeShort(state, stockId, 20).state;

    // Cover half at -20%
    state.stocks[0].currentPrice = entryPrice * 0.8;
    state = executeCover(state, stockId, 10).state;

    // Cover rest at -40%
    state.stocks[0].currentPrice = entryPrice * 0.6;
    state = executeCover(state, stockId, 10).state;

    const profit = getNetWorth(state) - initialNetWorth;
    const expectedGross = (entryPrice * 0.2 * 10) + (entryPrice * 0.4 * 10);

    expect(profit).toBeGreaterThan(expectedGross * 0.85);
    expect(profit).toBeLessThan(expectedGross);

    // Position fully closed
    expect(state.shortPositions[stockId]).toBeUndefined();
    expect(state.marginUsed).toBeCloseTo(0, 1);
  });

  it('releases margin proportionally on partial cover', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;

    state = executeShort(state, stockId, 100).state;
    const fullMargin = state.marginUsed;

    state = executeCover(state, stockId, 50).state;

    // Half the margin should be released
    expect(state.marginUsed).toBeCloseTo(fullMargin / 2, 1);
    expect(state.shortPositions[stockId].shares).toBe(50);
  });
});

describe('Game over conditions', () => {
  it('does not end on first turn with starting cash', () => {
    let state = createNewGame('Test', 'normal');
    state = simulateTurn(state);
    expect(state.isGameOver).toBe(false);
  });

  it('ends when net worth goes to zero or below (short squeeze scenario)', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;

    // Maximum short position
    const config = DIFFICULTY_CONFIGS.normal;
    const stock = state.stocks[0];
    const maxShares = Math.floor(
      state.cash / (stock.currentPrice * config.shortMarginRequirement * 1.1),
    );

    state = executeShort(state, stockId, maxShares).state;

    // Massive price spike — liability dwarfs cash
    state.stocks[0].currentPrice = stock.currentPrice * 50;

    state = simulateTurn(state);

    // Either margin call closed it (loss realized) or game over flagged
    const netWorth = getNetWorth(state);
    expect(state.isGameOver || netWorth > 0).toBe(true);
    if (netWorth <= 0) {
      expect(state.isGameOver).toBe(true);
      expect(state.finalGrade).toBe('F');
    }
  });
});

describe('Margin accounting', () => {
  it('adds to existing short position correctly', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    const entryPrice = state.stocks[0].currentPrice;

    state = executeShort(state, stockId, 10).state;
    const firstMargin = state.marginUsed;

    // Price moves, short more
    state.stocks[0].currentPrice = entryPrice * 1.1;
    state = executeShort(state, stockId, 10).state;

    expect(state.shortPositions[stockId].shares).toBe(20);
    expect(state.marginUsed).toBeGreaterThan(firstMargin);

    // Average entry should be between the two prices
    const avg = state.shortPositions[stockId].entryPrice;
    expect(avg).toBeGreaterThan(entryPrice);
    expect(avg).toBeLessThan(entryPrice * 1.1);
  });
});
