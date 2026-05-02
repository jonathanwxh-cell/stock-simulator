import { beforeEach, describe, expect, it } from 'vitest';
import { createNewGame } from '../gameState';
import { getLeaderboard } from '../leaderboard';
import { getPostTurnDestination, recordCompletedGame } from '../completion';

function installLocalStorageMock() {
  const store = new Map<string, string>();

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
}

describe('completed run handling', () => {
  beforeEach(() => {
    installLocalStorageMock();
    localStorage.clear();
  });

  it('routes finished turns to the game-over screen after the turn summary', () => {
    const activeGame = createNewGame('Casey', 'normal');
    const completedGame = {
      ...activeGame,
      isGameOver: true,
      currentTurn: 100,
      finalGrade: 'B' as const,
      finalRank: 'Seasoned Investor',
    };

    expect(getPostTurnDestination(activeGame)).toBe('game');
    expect(getPostTurnDestination(completedGame)).toBe('game-over');
  });

  it('records a completed run only once even if completion is processed twice', () => {
    const baseGame = createNewGame('Jordan', 'normal');
    const completedGame = {
      ...baseGame,
      isGameOver: true,
      currentTurn: 100,
      cash: 150_000,
      finalGrade: 'A' as const,
      finalRank: 'Master Trader',
    };

    const firstPass = recordCompletedGame(completedGame);
    const secondPass = recordCompletedGame(firstPass);
    const leaderboard = getLeaderboard();

    expect(firstPass.leaderboardEntryId).toBeTruthy();
    expect(secondPass.leaderboardEntryId).toBe(firstPass.leaderboardEntryId);
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0].playerName).toBe('Jordan');
    expect(leaderboard[0].turnsPlayed).toBe(100);
  });
});
