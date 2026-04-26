import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal } from 'lucide-react';
import { getLeaderboard } from '../engine';
import type { Difficulty } from '../engine/types';

const GRADE_COLORS: Record<string, string> = {
  S: '#FFD700', A: '#22C55E', B: '#3B82F6', C: '#F59E0B', D: '#F97316', F: '#EF4444',
};

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert'];

export default function LeaderboardPage() {
  const { goBack } = useGame();
  const [filter, setFilter] = useState<Difficulty | 'all'>('all');

  const entries = useMemo(() => {
    const all = getLeaderboard();
    return filter === 'all' ? all : all.filter(e => e.difficulty === filter);
  }, [filter]);

  return (
    <div className="min-h-[100dvh] p-4 pb-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} className="w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">Leaderboard</h1>
        </div>

        <div className="flex gap-1.5 mb-4">
          {['all', ...DIFFICULTIES].map(d => (
            <button key={d} onClick={() => setFilter(d as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${filter === d ? 'bg-[var(--profit-green)] text-black' : 'bg-[var(--surface-0)] border border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No games completed yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.slice(0, 50).map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: GRADE_COLORS[entry.grade] + '20', color: GRADE_COLORS[entry.grade] }}>
                  {i < 3 ? <Medal className="w-4 h-4" /> : `#${i + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{entry.playerName}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">{entry.difficulty}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Turn {entry.turnsPlayed} &middot; Grade: <span style={{ color: GRADE_COLORS[entry.grade] }}>{entry.grade}</span>
                  </span>
                </div>
                <span className="text-sm font-mono-data font-bold text-[var(--profit-green)]">
                  ${entry.finalNetWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
