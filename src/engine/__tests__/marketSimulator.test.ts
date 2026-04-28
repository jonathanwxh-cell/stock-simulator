import { describe, it, expect } from 'vitest';
import { unwrap } from './_helpers';
import {
  createNewGame,
  executeBuy,
  executeSell,
  executeShort,
  executeCover,
  getNetWorth,
  tradeErrorMessage,
} from '../gameState';
import { simulateTurn, checkMarginCall } from '../marketSimulator';
import { DIFFICULTY_CONFIGS } from '../config';
import type { GameState } from '../types';

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

    state = unwrap(state, s => executeBuy(s, stockId, 10));
    state = unwrap(state, s => executeSell(s, stockId, 10));

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

    state = unwrap(state, s => executeBuy(s, stockId, 10));

    // Force price up 50%
    state.stocks[0].currentPrice = state.stocks[0].currentPrice * 1.5;

    state = unwrap(state, s => executeSell(s, stockId, 10));
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

    state = unwrap(state, s => executeShort(s, stockId, shares));

    // Price drops 30%
    const newPrice = entryPrice * 0.7;
    state.stocks[0].currentPrice = newPrice;

    state = unwrap(state, s => executeCover(s, stockId, shares));

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

    state = unwrap(state, s => executeShort(s, stockId, 10));
    state.stocks[0].currentPrice = entryPrice * 1.3;
    state = unwrap(state, s => executeCover(s, stockId, 10));

    expect(getNetWorth(state)).toBeLessThan(initialNetWorth);
  });

  it('roughly breaks even at the same price (only fees lost)', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    const initialNetWorth = getNetWorth(state);

    state = unwrap(state, s => executeShort(s, stockId, 10));
    // No price change
    state = unwrap(state, s => executeCover(s, stockId, 10));

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

    state = unwrap(state, s => executeShort(s, stockId, 20));

    // Cover half at -20%
    state.stocks[0].currentPrice = entryPrice * 0.8;
    state = unwrap(state, s => executeCover(s, stockId, 10));

    // Cover rest at -40%
    state.stocks[0].currentPrice = entryPrice * 0.6;
    state = unwrap(state, s => executeCover(s, stockId, 10));

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

    state = unwrap(state, s => executeShort(s, stockId, 50));
    const fullMargin = state.marginUsed;

    state = unwrap(state, s => executeCover(s, stockId, 25));

    // Half the margin released
    expect(state.marginUsed).toBeCloseTo(fullMargin / 2, 1);
    expect(state.shortPositions[stockId].shares).toBe(25);
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

    state = unwrap(state, s => executeShort(s, stockId, maxShares));

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

    state = unwrap(state, s => executeShort(s, stockId, 10));
    const firstMargin = state.marginUsed;

    // Price moves, short more
    state.stocks[0].currentPrice = entryPrice * 1.1;
    state = unwrap(state, s => executeShort(s, stockId, 10));

    expect(state.shortPositions[stockId].shares).toBe(20);
    expect(state.marginUsed).toBeGreaterThan(firstMargin);

    // Average entry should be between the two prices
    const avg = state.shortPositions[stockId].entryPrice;
    expect(avg).toBeGreaterThan(entryPrice);
    expect(avg).toBeLessThan(entryPrice * 1.1);
  });
});

describe('Margin call threshold (v1.3.0 fix)', () => {
  it('fires when equity < maintenance × liability', () => {
    // Use WBD at ~$12, short 100 shares, margin = $1800
    let state = createNewGame('Test', 'normal');
    const wbd = state.stocks.find(s => s.currentPrice < 20)!;
    const entryPrice = wbd.currentPrice;

    state = unwrap(state, s => executeShort(s, wbd.id, 100));
    expect(state.shortPositions[wbd.id]).toBeDefined();

    // Push price to 20×: liability ≈ $2400, equity drops below maintenance
    // equity = 23198 - 2400 ≈ 20798, maintenance = 2400 * 0.3 = 720
    // Actually at 20×: equity = 23198 - 2400 = 20798, maint = 720 → NO
    // Need much higher: equity < 0.3 * liability → cash < 1.3 * liability
    // 23198 < 1.3 * (P * 100) → P > 178.4 → ~15× entry
    state.stocks.find(s => s.id === wbd.id)!.currentPrice = entryPrice * 20;

    checkMarginCall(state);

    // At 20×, liability = 20 * 12 * 100 = 24000
    // equity = 23198 - 24000 = -802
    // maintenance = 24000 * 0.3 = 7200
    // -802 < 7200 → MARGIN CALL fires
    expect(state.shortPositions[wbd.id]).toBeUndefined();
  });

  it('does NOT fire when equity is above maintenance threshold', () => {
    let state = createNewGame('Test', 'normal');
    const wbd = state.stocks.find(s => s.currentPrice < 20)!;
    const entryPrice = wbd.currentPrice;

    state = unwrap(state, s => executeShort(s, wbd.id, 100));
    expect(state.shortPositions[wbd.id]).toBeDefined();

    // Price doubles — equity still well above maintenance
    // equity ≈ 23198 - 2400 = 20798, maintenance = 2400 * 0.3 = 720
    state.stocks.find(s => s.id === wbd.id)!.currentPrice = entryPrice * 2;

    checkMarginCall(state);

    expect(state.shortPositions[wbd.id]).toBeDefined();
    expect(state.shortPositions[wbd.id].shares).toBe(100);
  });
});

describe('Margin call liquidation scope', () => {
  it('recomputes equity after each forced liquidation', () => {
    let state = createNewGame('Test', 'normal');
    const [first, second] = state.stocks.slice(0, 2);

    state = {
      ...state,
      cash: 200,
      marginUsed: 3000,
      shortPositions: {
        [first.id]: {
          stockId: first.id,
          shares: 100,
          entryPrice: 10,
          marginUsed: 1500,
        },
        [second.id]: {
          stockId: second.id,
          shares: 100,
          entryPrice: 10,
          marginUsed: 1500,
        },
      },
      stocks: state.stocks.map(stock => {
        if (stock.id === first.id || stock.id === second.id) {
          return { ...stock, currentPrice: 10, basePrice: 10 };
        }
        return stock;
      }),
    };

    checkMarginCall(state);

    expect(state.shortPositions[first.id]).toBeUndefined();
    expect(state.shortPositions[second.id]).toBeDefined();
    expect(state.marginUsed).toBeCloseTo(1500, 2);
  });
});

describe('Trade error reasons', () => {
  it('reports insufficient funds when a short is too large', () => {
    const state = createNewGame('Test', 'normal');

    const result = executeShort(state, state.stocks[0].id, 1_000_000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient_funds');
      expect(tradeErrorMessage(result.reason)).toContain('Not enough cash');
    }
  });

  it('reports insufficient shares when covering more than held', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    state = unwrap(state, s => executeShort(s, stockId, 5));

    const result = executeCover(state, stockId, 10);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient_shares');
    }
  });

  it('reports insufficient funds when a cover would overdraw cash', () => {
    let state = createNewGame('Test', 'normal');
    const stockId = state.stocks[0].id;
    state = unwrap(state, s => executeShort(s, stockId, 1));

    const stressedState: GameState = {
      ...state,
      cash: 0,
      stocks: state.stocks.map(stock =>
        stock.id === stockId
          ? { ...stock, currentPrice: stock.currentPrice * 10 }
          : stock
      ),
    };

    const result = executeCover(stressedState, stockId, 1);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient_funds');
      expect(tradeErrorMessage(result.reason)).toContain('Not enough cash');
    }
  });
});
