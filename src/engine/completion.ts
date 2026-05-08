import { DIFFICULTY_CONFIGS } from './config';
import { getNetWorth } from './marketSimulator';
import { addLeaderboardEntry } from './leaderboard';
import type { GameState, LeaderboardEntry, Screen } from './types';

function legacyRunId(state: GameState): string {
  const createdAt = state.createdAt instanceof Date
    ? state.createdAt.toISOString()
    : new Date(state.createdAt).toISOString();

  return `legacy:${state.playerName}:${state.difficulty}:${createdAt}`;
}

export function getGameRunId(state: GameState): string {
  return state.runId || legacyRunId(state);
}

export function buildLeaderboardEntry(state: GameState): LeaderboardEntry {
  const config = DIFFICULTY_CONFIGS[state.difficulty];
  const runId = getGameRunId(state);
  const entryId = state.leaderboardEntryId || `lb_${runId}`;

  return {
    id: entryId,
    runId,
    playerName: state.playerName.trim().slice(0, 64),
    difficulty: state.difficulty,
    finalNetWorth: getNetWorth(state),
    startingCash: config.startingCash,
    grade: state.finalGrade || 'F',
    turnsPlayed: state.currentTurn,
    date: new Date(state.updatedAt || state.currentDate),
  };
}

export function recordCompletedGame(state: GameState): GameState {
  if (!state.isGameOver) return state;
  if (state.leaderboardEntryId) return state;

  const entry = buildLeaderboardEntry(state);
  addLeaderboardEntry(entry);

  return {
    ...state,
    runId: getGameRunId(state),
    leaderboardEntryId: entry.id,
  };
}

export function getPostTurnDestination(state: GameState): Screen {
  return state.isGameOver ? 'game-over' : 'game';
}
