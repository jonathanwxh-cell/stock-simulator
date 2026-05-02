import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Star } from 'lucide-react';
import { getNetWorth } from '../engine/marketSimulator';
import { DIFFICULTY_CONFIGS } from '../engine/config';
import { addLeaderboardEntry } from '../engine/leaderboard';
import type { LeaderboardEntry } from '../engine/types';

const GRADE_COLORS: Record<string, string> = {
  S: '#FFD700', A: '#22C55E', B: '#3B82F6', C: '#F59E0B', D: '#EF4444', F: '#6B7280',
};

const GRADE_BG: Record<string, string> = {
  S: '#FFD70020', A: '#22C55E20', B: '#3B82F620', C: '#F59E0B20', D: '#EF444420', F: '#6B728020',
};

const CONFETTI_COLORS = ['#22C55E', '#FFD700', '#3B82F6', '#EF4444', '#A855F7', '#06B6D4'];

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const CONFETTI_PIECES = Array.from({ length: 60 }).map((_, i) => ({
  id: i,
  left: pseudoRandom(i + 1) * 100,
  delay: pseudoRandom(i + 101) * 2,
  duration: 2 + pseudoRandom(i + 201) * 2,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 4 + pseudoRandom(i + 301) * 6,
  rotation: pseudoRandom(i + 401) * 360,
}));

function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {CONFETTI_PIECES.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.left}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', rotate: p.rotation + 720, opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

export default function GameOver() {
  const { gameState, resetGame } = useGame();
  const [saved, setSaved] = useState(false);

  if (!gameState || !gameState.isGameOver) return null;

  const netWorth = getNetWorth(gameState);
  const config = DIFFICULTY_CONFIGS[gameState.difficulty];
  const goalAmount = config.startingCash * config.goalMultiplier;
  const won = netWorth >= goalAmount;
  const grade = gameState.finalGrade || 'F';
  const gradeColor = GRADE_COLORS[grade];
  const gradeBg = GRADE_BG[grade];

  // Transaction stats
  const totalTrades = gameState.transactionHistory.filter(t => t.type === 'buy' || t.type === 'sell' || t.type === 'short' || t.type === 'cover').length;
  const totalFees = gameState.transactionHistory.reduce((sum, t) => sum + (t.fee || 0), 0);
  const totalDividends = gameState.transactionHistory.filter(t => t.type === 'dividend').reduce((sum, t) => sum + t.total, 0);
  const splits = gameState.transactionHistory.filter(t => t.type === 'split');
  const peakNetWorth = Math.max(...gameState.netWorthHistory.map(n => n.netWorth));

  const handleSave = () => {
    const entry: LeaderboardEntry = {
      id: `lb_${Date.now()}`,
      playerName: gameState.playerName,
      difficulty: gameState.difficulty,
      finalNetWorth: netWorth,
      startingCash: config.startingCash,
      grade,
      turnsPlayed: gameState.currentTurn,
      date: new Date(),
    };
    addLeaderboardEntry(entry);
    setSaved(true);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative">
      {won && <Confetti />}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="max-w-md w-full text-center relative z-10">
        {won && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring' }}>
            <Trophy className="w-16 h-16 text-[var(--profit-green)] mx-auto mb-4" />
          </motion.div>
        )}

        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-3xl font-display font-bold text-[var(--text-primary)] mb-2">
          {won ? 'Market Conquered' : 'Game Over'}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-[var(--text-secondary)] mb-6">
          {won ? `You reached your goal in ${gameState.currentTurn} turns!` : 'You ran out of turns. Better luck next time.'}
        </motion.p>

        {/* Grade with glow */}
        <motion.div initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-28 h-28 rounded-2xl mb-4"
          style={{ background: gradeBg, border: `2px solid ${gradeColor}`, boxShadow: `0 0 40px ${gradeColor}33` }}>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 300 }}
            className="text-6xl font-display font-bold"
            style={{ color: gradeColor }}>
            {grade}
          </motion.span>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-sm text-[var(--text-secondary)] mb-6">{gameState.finalRank}</motion.p>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
          className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6 mb-6 text-left">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div><span className="text-xs text-[var(--text-muted)] block">Final Net Worth</span><span className="font-mono-data font-bold text-[var(--text-primary)]">${netWorth.toFixed(2)}</span></div>
            <div><span className="text-xs text-[var(--text-muted)] block">Peak</span><span className="font-mono-data text-[var(--profit-green)]">${peakNetWorth.toFixed(2)}</span></div>
            <div><span className="text-xs text-[var(--text-muted)] block">Goal</span><span className="font-mono-data text-[var(--text-secondary)]">${goalAmount.toLocaleString()}</span></div>
            <div><span className="text-xs text-[var(--text-muted)] block">Turns Played</span><span className="font-mono-data text-[var(--text-secondary)]">{gameState.currentTurn}</span></div>
            <div><span className="text-xs text-[var(--text-muted)] block">Trades</span><span className="font-mono-data text-[var(--text-secondary)]">{totalTrades}</span></div>
            <div><span className="text-xs text-[var(--text-muted)] block">Fees Paid</span><span className="font-mono-data text-[var(--loss-red)]">${totalFees.toFixed(2)}</span></div>
            <div><span className="text-xs text-[var(--text-muted)] block">Dividends</span><span className="font-mono-data text-[var(--profit-green)]">${totalDividends.toFixed(2)}</span></div>
            <div><span className="text-xs text-[var(--text-muted)] block">Splits</span><span className="font-mono-data text-[var(--text-secondary)]">{splits.length}</span></div>
            <div><span className="text-xs text-[var(--text-muted)] block">Return</span>
              <span className={`font-mono-data font-bold ${netWorth >= config.startingCash ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
                {((netWorth / config.startingCash - 1) * 100).toFixed(1)}%
              </span>
            </div>
            <div><span className="text-xs text-[var(--text-muted)] block">Difficulty</span><span className="font-mono-data text-[var(--text-secondary)] capitalize">{gameState.difficulty}</span></div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="flex gap-3">
          <button onClick={handleSave} disabled={saved}
            className={`flex-1 py-3 rounded-xl border border-[var(--border)] font-semibold text-sm flex items-center justify-center gap-2 transition-all ${saved ? 'bg-[var(--surface-1)] text-[var(--text-muted)]' : 'text-[var(--text-primary)] hover:bg-[var(--surface-1)]'}`}>
            <Star className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Score'}
          </button>
          <button onClick={resetGame}
            className="flex-1 py-3 rounded-xl bg-[var(--profit-green)] text-black font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
