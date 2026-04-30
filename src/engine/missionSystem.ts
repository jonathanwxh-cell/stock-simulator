import type { GameState, Mission } from './types';
import type { RNG } from './rng';
import { getAlphaPct } from './marketIndex';
import { getNetWorth } from './marketSimulator';
import { calculateRisk } from './riskSystem';
import { roundCurrency } from './financialMath';

function rewardFor(state: GameState): number {
  return state.difficulty === 'easy' ? 500 : state.difficulty === 'normal' ? 750 : state.difficulty === 'hard' ? 1200 : 2000;
}

export function createMission(state: GameState, rng: RNG): Mission {
  const rewardCash = rewardFor(state);
  const roll = rng.int(0, 3);
  if (roll === 0) {
    return {
      id: `mission_alpha_${state.currentTurn}`,
      title: 'Beat the Market',
      description: 'Finish this mission window with positive alpha versus the market index.',
      type: 'performance',
      startTurn: state.currentTurn,
      endTurn: state.currentTurn + 6,
      rewardCash,
      status: 'active',
      progress: getAlphaPct(state),
      target: 1,
    };
  }
  if (roll === 1) {
    return {
      id: `mission_risk_${state.currentTurn}`,
      title: 'Control Risk',
      description: 'Keep portfolio risk below 50 until the mission expires.',
      type: 'risk',
      startTurn: state.currentTurn,
      endTurn: state.currentTurn + 8,
      rewardCash,
      status: 'active',
      progress: 100 - calculateRisk(state).totalScore,
      target: 50,
    };
  }
  if (roll === 2) {
    return {
      id: `mission_diversify_${state.currentTurn}`,
      title: 'Diversify Across Sectors',
      description: 'Hold exposure to at least 3 sectors.',
      type: 'diversification',
      startTurn: state.currentTurn,
      endTurn: state.currentTurn + 6,
      rewardCash,
      status: 'active',
      progress: countHeldSectors(state),
      target: 3,
    };
  }
  return {
    id: `mission_growth_${state.currentTurn}`,
    title: 'Grow Net Worth',
    description: 'Grow net worth by 5% during this mission window.',
    type: 'performance',
    startTurn: state.currentTurn,
    endTurn: state.currentTurn + 10,
    rewardCash,
    status: 'active',
    progress: 0,
    target: 5,
  };
}

function countHeldSectors(state: GameState): number {
  const sectors = new Set<string>();
  for (const [stockId, pos] of Object.entries(state.portfolio)) {
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

  const mission = { ...nextState.activeMission };
  const startNetWorth = prevState.netWorthHistory.find(s => s.turn === mission.startTurn)?.netWorth
    ?? prevState.netWorthHistory[0]?.netWorth
    ?? getNetWorth(prevState);

  if (mission.id.includes('alpha')) mission.progress = getAlphaPct(nextState);
  else if (mission.id.includes('risk')) mission.progress = 100 - calculateRisk(nextState).totalScore;
  else if (mission.id.includes('diversify')) mission.progress = countHeldSectors(nextState);
  else if (mission.id.includes('growth')) mission.progress = startNetWorth > 0 ? roundCurrency(((getNetWorth(nextState) - startNetWorth) / startNetWorth) * 100) : 0;

  const completed = mission.id.includes('risk')
    ? mission.progress >= mission.target && nextState.currentTurn >= mission.endTurn
    : mission.progress >= mission.target;
  const failed = !completed && nextState.currentTurn >= mission.endTurn;

  if (completed) {
    mission.status = 'completed';
    nextState.cash = roundCurrency(nextState.cash + mission.rewardCash);
    nextState.transactionHistory.push({
      id: `mission_reward_${mission.id}`,
      date: new Date(nextState.currentDate),
      turn: nextState.currentTurn,
      stockId: '__mission__',
      type: 'mission_reward',
      shares: 0,
      price: 0,
      total: mission.rewardCash,
      fee: 0,
    });
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
