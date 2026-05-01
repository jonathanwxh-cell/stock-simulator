import type { GameState, Mission } from './types';
import type { RNG } from './rng';
import { getAlphaPct } from './marketIndex';
import { calculateRisk } from './riskSystem';
import { roundCurrency } from './financialMath';

function rewardFor(state: GameState): number {
  return state.difficulty === 'easy' ? 500 : state.difficulty === 'normal' ? 750 : state.difficulty === 'hard' ? 1200 : 2000;
}

function netWorth(state: GameState): number {
  const portfolio = Object.entries(state.portfolio).reduce((sum, [stockId, pos]) => {
    const stock = state.stocks.find(s => s.id === stockId);
    return sum + (stock && pos.shares > 0 ? stock.currentPrice * pos.shares : 0);
  }, 0);
  const shorts = Object.entries(state.shortPositions).reduce((sum, [stockId, pos]) => {
    const stock = state.stocks.find(s => s.id === stockId);
    return sum + (stock && pos.shares > 0 ? stock.currentPrice * pos.shares : 0);
  }, 0);
  return roundCurrency(state.cash + portfolio - shorts);
}

export function createMission(state: GameState, rng: RNG): Mission {
  const rewardCash = rewardFor(state);
  const roll = rng.int(0, 3);
  if (roll === 0) {
    return { id: `mission_alpha_${state.currentTurn}`, title: 'Beat the Market', description: 'Finish this mission window with positive alpha versus the market index.', type: 'performance', startTurn: state.currentTurn, endTurn: state.currentTurn + 6, rewardCash, status: 'active', progress: getAlphaPct(state), target: 1 };
  }
  if (roll === 1) {
    return { id: `mission_risk_${state.currentTurn}`, title: 'Control Risk', description: 'Bring portfolio risk below 50 before the mission expires.', type: 'risk', startTurn: state.currentTurn, endTurn: state.currentTurn + 8, rewardCash, status: 'active', progress: 100 - calculateRisk(state).totalScore, target: 50 };
  }
  if (roll === 2) {
    return { id: `mission_diversify_${state.currentTurn}`, title: 'Diversify Across Sectors', description: 'Hold exposure to at least 3 sectors.', type: 'diversification', startTurn: state.currentTurn, endTurn: state.currentTurn + 6, rewardCash, status: 'active', progress: countHeldSectors(state), target: 3 };
  }
  return { id: `mission_growth_${state.currentTurn}`, title: 'Grow Net Worth', description: 'Grow net worth by 5% during this mission window.', type: 'performance', startTurn: state.currentTurn, endTurn: state.currentTurn + 10, rewardCash, status: 'active', progress: 0, target: 5 };
}

function countHeldSectors(state: GameState): number {
  const sectors = new Set<string>();
  for (const [stockId, pos] of Object.entries(state.portfolio)) {
    if (pos.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (stock) sectors.add(stock.sector);
  }
  for (const [stockId, pos] of Object.entries(state.shortPositions)) {
    if (pos.shares <= 0) continue;
    const stock = state.stocks.find(s => s.id === stockId);
    if (stock) sectors.add(stock.sector);
  }
  return sectors.size;
}

export function updateMission(prevState: GameState, nextState: GameState, rng: RNG): void {
  if (!nextState.activeMission) {
    nextState.activeMission = createMission(nextState, rng);
    return;
  }

  const mission = { ...nextState.activeMission, status: 'active' as const };
  const startNetWorth = prevState.netWorthHistory.find(s => s.turn === mission.startTurn)?.netWorth ?? prevState.netWorthHistory[0]?.netWorth ?? netWorth(prevState);

  if (mission.id.includes('alpha')) mission.progress = getAlphaPct(nextState);
  else if (mission.id.includes('risk')) mission.progress = 100 - calculateRisk(nextState).totalScore;
  else if (mission.id.includes('diversify')) mission.progress = countHeldSectors(nextState);
  else if (mission.id.includes('growth')) mission.progress = startNetWorth > 0 ? roundCurrency(((netWorth(nextState) - startNetWorth) / startNetWorth) * 100) : 0;

  const expired = nextState.currentTurn >= mission.endTurn;
  const meetsTarget = mission.progress >= mission.target;
  const completed = mission.id.includes('risk') ? expired && meetsTarget : meetsTarget;
  const failed = expired && !meetsTarget;

  if (completed) {
    mission.status = 'completed';
    nextState.cash = roundCurrency(nextState.cash + mission.rewardCash);
    nextState.transactionHistory.push({ id: `mission_reward_${mission.id}`, date: new Date(nextState.currentDate), turn: nextState.currentTurn, stockId: '__mission__', type: 'mission_reward', shares: 0, price: 0, total: mission.rewardCash, fee: 0 });
    nextState.completedMissions.push(mission);
    nextState.activeMission = createMission(nextState, rng);
  } else if (failed) {
    mission.status = 'failed';
    nextState.completedMissions.push(mission);
    nextState.activeMission = createMission(nextState, rng);
  } else {
    nextState.activeMission = mission;
  }
}
