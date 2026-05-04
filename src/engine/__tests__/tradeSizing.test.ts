import { describe, expect, it } from 'vitest';
import { createNewGame, executeBuy } from '../gameState';
import { getTradeSizePresets } from '../tradeSizing';

describe('trade sizing helper', () => {
  it('offers beginner-friendly buy sizes based on available cash', () => {
    const state = createNewGame('Sizing Tester', 'normal');
    const stock = state.stocks[0];

    const presets = getTradeSizePresets(state, stock.id, 'buy');

    expect(presets.map((preset) => preset.id)).toEqual(['tiny', 'normal', 'bold', 'max']);
    expect(presets[0].shares).toBeGreaterThanOrEqual(1);
    expect(presets[1].targetPct).toBe(10);
    expect(presets[2].targetPct).toBe(25);
    expect(presets.at(-1)?.label).toBe('Max');
  });

  it('caps sell presets to the owned share count', () => {
    const state = createNewGame('Sell Sizing Tester', 'normal');
    const stock = state.stocks[0];
    const buyResult = executeBuy(state, stock.id, 7);
    expect(buyResult.ok).toBe(true);
    if (!buyResult.ok) return;

    const presets = getTradeSizePresets(buyResult.state, stock.id, 'sell');

    expect(presets.at(-1)?.shares).toBe(7);
    expect(presets.every((preset) => preset.shares <= 7)).toBe(true);
  });

  it('marks presets unavailable when there is no trade room', () => {
    const state = createNewGame('No Room Sizing Tester', 'normal');
    const stock = state.stocks[0];
    state.cash = 0;

    const presets = getTradeSizePresets(state, stock.id, 'buy');

    expect(presets.every((preset) => preset.shares === 0)).toBe(true);
    expect(presets.every((preset) => preset.helper.includes('No available room'))).toBe(true);
  });
});
