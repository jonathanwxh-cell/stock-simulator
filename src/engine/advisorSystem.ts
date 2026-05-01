import type { AdvisorFeedback, GameState } from './types';
import { getAlphaPct, getMarketReturnPct, getPlayerReturnPct } from './marketIndex';
import { calculateRisk } from './riskSystem';
import { roundCurrency } from './financialMath';
import { getLatestTurnPerformance } from './turnPerformance';
import { getMissionSummary } from '../utils/missionFormatting';

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

export function generateAdvisorFeedback(_prevState: GameState, nextState: GameState): AdvisorFeedback[] {
  const notes: AdvisorFeedback[] = [];
  const { marketMovePct, turnAlphaPct } = getLatestTurnPerformance(nextState);
  const risk = calculateRisk(nextState);
  const nextNetWorth = netWorth(nextState);
  const shortRatio = nextNetWorth > 0 ? shortLiability(nextState) / nextNetWorth : 0;
  const cashRatio = nextNetWorth > 0 ? nextState.cash / nextNetWorth : 0;

  if (turnAlphaPct > 1) notes.push(feedback('Strong relative turn', `You beat the market by ${turnAlphaPct.toFixed(1)} percentage points this turn.`, 'positive', ['performance']));
  else if (turnAlphaPct < -1) notes.push(feedback('Underperformed the market', `You lagged the market by ${Math.abs(turnAlphaPct).toFixed(1)} percentage points this turn.`, 'warning', ['performance']));

  if (risk.level === 'high' || risk.level === 'extreme') notes.push(feedback('Risk is elevated', risk.warnings[0] ?? 'Portfolio risk is high relative to net worth.', risk.level === 'extreme' ? 'danger' : 'warning', ['risk']));
  if (cashRatio > 0.7 && marketMovePct > 0.5) notes.push(feedback('High cash during a rising market', 'Cash reduces drawdown risk, but it can slow mission progress when the market is moving up.', 'info', ['cash', 'opportunity-cost']));
  if (shortRatio > 0.3) notes.push(feedback('Short exposure is high', 'A sharp rally could hurt quickly. Watch margin and cover discipline.', 'danger', ['shorts', 'risk']));

  const regime = nextState.currentRegime;
  if (regime && Object.keys(regime.sectorEffects).length > 0) {
    const favored = Object.entries(regime.sectorEffects)
      .filter(([, v]) => (v ?? 1) > 1)
      .map(([sector]) => sector);
    const held = new Set<string>();
    for (const stockId of Object.keys(nextState.portfolio)) {
      const stock = nextState.stocks.find(item => item.id === stockId);
      if (stock) held.add(stock.sector);
    }
    if (favored.length > 0 && !favored.some(sector => held.has(sector))) notes.push(feedback('Low regime alignment', `Current regime favors ${favored.join(', ')}, but you have little/no long exposure there.`, 'info', ['regime']));
  }

  if (nextState.activeMission) notes.push(feedback('Mission status', `${nextState.activeMission.title}: ${getMissionSummary(nextState.activeMission)}.`, 'info', ['mission']));

  if (notes.length === 0) notes.push(feedback('Steady turn', `Player return: ${getPlayerReturnPct(nextState).toFixed(1)}%. Market return: ${getMarketReturnPct(nextState).toFixed(1)}%. Alpha: ${getAlphaPct(nextState).toFixed(1)}%.`, 'info', ['summary']));

  return notes.slice(0, 4);
}
