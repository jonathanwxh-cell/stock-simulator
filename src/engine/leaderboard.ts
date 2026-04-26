import type { LeaderboardEntry, Difficulty } from './types';

const LEADERBOARD_KEY = 'marketmaster_leaderboard';

function loadEntries(): LeaderboardEntry[] {
  const raw = localStorage.getItem(LEADERBOARD_KEY);
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw) as LeaderboardEntry[];
    return entries.map(e => ({ ...e, date: new Date(e.date) }));
  } catch {
    return [];
  }
}

function saveEntries(entries: LeaderboardEntry[]): void {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

export function addLeaderboardEntry(entry: LeaderboardEntry): void {
  const entries = loadEntries();
  entries.push({
    ...entry,
    date: new Date(entry.date),
  });
  // Sort by finalNetWorth descending, then by date
  entries.sort((a, b) => {
    if (b.finalNetWorth !== a.finalNetWorth) {
      return b.finalNetWorth - a.finalNetWorth;
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  // Keep top 100
  saveEntries(entries.slice(0, 100));
}

export function getLeaderboard(difficulty?: Difficulty): LeaderboardEntry[] {
  let entries = loadEntries();
  if (difficulty) {
    entries = entries.filter(e => e.difficulty === difficulty);
  }
  return entries;
}

export function getPersonalBests(): LeaderboardEntry[] {
  const entries = loadEntries();
  const bestByDifficulty = new Map<Difficulty, LeaderboardEntry>();
  const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert'];

  for (const entry of entries) {
    const current = bestByDifficulty.get(entry.difficulty);
    if (!current || entry.finalNetWorth > current.finalNetWorth) {
      bestByDifficulty.set(entry.difficulty, entry);
    }
  }

  return difficulties
    .map(d => bestByDifficulty.get(d))
    .filter((e): e is LeaderboardEntry => e !== undefined);
}

export function clearLeaderboard(): void {
  localStorage.removeItem(LEADERBOARD_KEY);
}
