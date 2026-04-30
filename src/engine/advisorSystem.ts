import type { AdvisorFeedback, GameState } from './types';
import { getAlphaPct, getMarketReturnPct, getPlayerReturnPct } from './marketIndex';
import { calculateRisk } from './riskSystem';
import { roundCurrency } from './financialMath';

function feedback(headline: string, body: string, severity: AdvisorFeedback['severity'], tags: string[]): AdvisorFeedback {
  return { headline, body, severity, tags };
}

function portfolioValue(state: GameState): number {
  return roundCurrency(Object.entries(state.portfolio).reduce((sum, [stockId, pos]) => {
    const stock = state.stocks.find(s => s.id === stockId);
    return sum + (stock && pos.shares > 0 ? stock.currentPrice * pos.shares : 0);
  }, 0));
}

function shortLiability(state: GameState): number {
  return roundCurrency(Object.entries(state.shortPositions).reduce((sum, [stockId, pos]) => {
    const stock = state.stocks.find(s => s.id === stockId);
    return sum + (stock && pos.shares > 0 ? stock.currentPrice * pos.shares : 0);
  }, 0));
}

function netWorth(state: GameState): number {
  return roundCurrency(state.cash + portfolioValue(state) - shortLiability(state));
}

export function generateAdvisorFeedback(prevState: GameState, nextState: GameState): AdvisorFeedback[] {
  const notes: AdvisorFeedback[] = [];
  const prevIndex = prevState.marketIndexHistory?.[prevState.marketIndexHistory.length - 1]?.value ?? 1000;
  const nextIndex = nextState.marketIndexHistory?.[nextState.marketIndexHistory.length - 1]?.value ?? prevIndex;
  const marketTurn = prevIndex > 0 ? ((nextIndex - prevIndex) / prevIndex) * 100 : 0;
  const prevNetWorth = netWorth(prevState);
  const nextNetWorth = netWorth(nextState);
  const playerTurn = prevNetWorth > 0 ? ((nextNetWorth - prevNetWorth) / prevNetWorth) * 100 : 0;
  const turnAlpha = playerTurn - marketTurn;
  const risk = calculateRisk(nextState);
  const shortRatio = nextNetWorth > 0 ? shortLiability(nextState) / nextNetWorth : 0;
  const cashRatio = nextNetWorth > 0 ? nextState.cash / nextNetWorth : 0;

  if (turnAlpha > 1) notes.push(feedback('Strong relative turn', `You beat the market by ${turnAlpha.toFixed(1)} percentage points this turn.`, 'positive', ['performance']));
  else if (turnAlpha < -1) notes.push(feedback('Underperformed the market', `You lagged the market by ${Math.abs(turnAlpha).toFixed(1)} percentage points this turn.`, 'warning', ['performance']));

  if (risk.level === 'high' || risk.level === 'extreme') notes.push(feedback('Risk is elevated', risk.warnings[0] ?? 'Portfolio risk is high relative to net worth.', risk.level === 'extreme' ? 'danger' : 'warning', ['risk']));
  if (cashRatio > 0.7 && marketTurn > 0.5) notes.push(feedback('High cash during a rising market', 'Cash reduces drawdown risk, but it can slow mission progress when the market is moving up.', 'info', ['cash', 'opportunity-cost']));
  if (shortRatio > 0.3) notes.push(feedback('Short exposure is high', 'A sharp rally could hurt quickly. Watch margin and cover discipline.', 'danger', ['shorts', 'risk']));

  const regime = nextState.currentRegime;
  if (regime && Object.keys(regime.sectorEffects).length > 0) {
    const favored = Object.entries(regime.sectorEffects).filter(([, v]) => (v ?? 1) > 1.03).map(([sector]) => sector);
    const held = new Set(Object.keys(nextState.portfolio).map(id => nextState.stocks.find(s => s.id === id)?.sector).filter(Boolean));
    if (favored.length > 0 && !favored.some(s => held.has(s))) notes.push(feedback('Low regime alignment', `Current regime favors ${favored.join(', ')}, but you have little/no long exposure there.`, 'info', ['regime']));
  }

  if (nextState.activeMission) notes.push(feedback('Mission status', `${nextState.activeMission.title}: ${nextState.activeMission.progress.toFixed(1)} / ${nextState.activeMission.target}.`, 'info', ['mission']));

  if (notes.length === 0) notes.push(feedback('Steady turn', `Player return: ${getPlayerReturnPct(nextState).toFixed(1)}%. Market return: ${getMarketReturnPct(nextState).toFixed(1)}%. Alpha: ${getAlphaPct(nextState).toFixed(1)}%.`, 'info', ['summary']));

  return notes.slice(0, 4);
}
