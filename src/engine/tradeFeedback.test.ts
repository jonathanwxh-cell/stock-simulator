import { describe, expect, it } from 'vitest';
import { createNewGame, executeBuy, executeCover, executeSell, executeShort } from './gameState';
import { getTradeFeedback } from './tradeFeedback';

function detailValue(feedback: NonNullable<ReturnType<typeof getTradeFeedback>>, label: string): string {
  const detail = feedback.details.find(item => item.label === label);
  if (!detail) throw new Error(`Missing detail: ${label}`);
  return detail.value;
}

describe('trade feedback', () => {
  it('shows sane short exposure for a 1-share AAPL short', () => {
    const state = createNewGame('Tester', 'normal');
    const feedback = getTradeFeedback(state, 'aapl', 1, 'short');

    expect(feedback).not.toBeNull();
    expect(detailValue(feedback!, 'Short exposure')).toBe('0.8% of net worth');
    expect(feedback!.positionWeightAfter).toBeCloseTo(0.8, 1);
  });

  it('shows sane short exposure for a 10-share AAPL short', () => {
    const state = createNewGame('Tester', 'normal');
    const feedback = getTradeFeedback(state, 'aapl', 10, 'short');

    expect(feedback).not.toBeNull();
    expect(detailValue(feedback!, 'Short exposure')).toBe('7.7% of net worth');
    expect(feedback!.positionWeightAfter).toBeCloseTo(7.7, 1);
  });

  it('shows sane short exposure for a 3-share AMD short', () => {
    const state = createNewGame('Tester', 'normal');
    const feedback = getTradeFeedback(state, 'amd', 3, 'short');

    expect(feedback).not.toBeNull();
    expect(detailValue(feedback!, 'Short exposure')).toBe('2.1% of net worth');
    expect(feedback!.positionWeightAfter).toBeCloseTo(2.1, 1);
  });

  it('accumulates shorts only by the requested quantity once per engine execution', () => {
    let state = createNewGame('Tester', 'normal');
    const first = executeShort(state, 'amd', 3);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.reason);
    state = first.state;

    expect(state.shortPositions.amd?.shares).toBe(3);

    const feedback = getTradeFeedback(state, 'amd', 3, 'short');
    expect(feedback).not.toBeNull();
    expect(feedback!.positionLabel).toBe('6 short shares');

    const second = executeShort(state, 'amd', 3);
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error(second.reason);
    expect(second.state.shortPositions.amd?.shares).toBe(6);
  });

  it('fails selling more long shares than owned without mutating state', () => {
    let state = createNewGame('Tester', 'normal');
    const buy = executeBuy(state, 'aapl', 3);
    expect(buy.ok).toBe(true);
    if (!buy.ok) throw new Error(buy.reason);
    state = buy.state;

    const sell = executeSell(state, 'aapl', 4);
    expect(sell.ok).toBe(false);
    if (sell.ok) throw new Error('Expected sell to fail');
    expect(sell.reason).toBe('insufficient_shares');
    expect(state.portfolio.aapl?.shares).toBe(3);
  });

  it('fails covering more short shares than owned without mutating state', () => {
    let state = createNewGame('Tester', 'normal');
    const short = executeShort(state, 'amd', 2);
    expect(short.ok).toBe(true);
    if (!short.ok) throw new Error(short.reason);
    state = short.state;

    const cover = executeCover(state, 'amd', 3);
    expect(cover.ok).toBe(false);
    if (cover.ok) throw new Error('Expected cover to fail');
    expect(cover.reason).toBe('insufficient_shares');
    expect(state.shortPositions.amd?.shares).toBe(2);
  });
});
