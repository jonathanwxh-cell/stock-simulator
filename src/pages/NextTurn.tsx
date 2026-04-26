import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { useEffect } from 'react';

export default function NextTurn() {
  const { gameState, navigateTo } = useGame();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigateTo('game');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigateTo]);

  if (!gameState) return null;

  const currentSnapshot = gameState.netWorthHistory[gameState.netWorthHistory.length - 1];
  const previousSnapshot = gameState.netWorthHistory[gameState.netWorthHistory.length - 2];
  const netWorthChange = currentSnapshot && previousSnapshot
    ? currentSnapshot.netWorth - previousSnapshot.netWorth
    : 0;

  const recentNews = gameState.newsHistory.filter(n => n.turn === gameState.currentTurn);

  return (
    <div className="min-h-[calc(100dvh-56px-72px)] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="max-w-lg w-full"
      >
        <div className="text-center mb-8">
          <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
          <h2 className="text-display-md font-display font-bold text-[var(--text-primary)]">
            Month {gameState.currentTurn}
          </h2>
          <p className="text-[var(--text-secondary)] mt-1">
            {gameState.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Net Worth Summary */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--text-secondary)]">Net Worth</span>
            <div className={`flex items-center gap-1 ${netWorthChange >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
              {netWorthChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-mono-data">
                {netWorthChange >= 0 ? '+' : ''}${netWorthChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="text-mono-lg font-mono-data font-bold text-[var(--text-primary)]">
            ${currentSnapshot?.netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
            <DollarSign className="w-3 h-3" />
            <span>Cash: ${gameState.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* News Events */}
        {recentNews.length > 0 && (
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-heading-sm font-semibold text-[var(--text-primary)] mb-3">Market News</h3>
            <div className="space-y-3">
              {recentNews.map((news) => (
                <div
                  key={news.id}
                  className={`p-3 rounded-lg border ${
                    news.impact === 'positive'
                      ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)]'
                      : news.impact === 'negative'
                      ? 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)]'
                      : 'border-[var(--border)] bg-[var(--surface-1)]'
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{news.headline}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-center text-xs text-[var(--text-muted)] mt-6"
        >
          Continuing in a moment...
        </motion.p>
      </motion.div>
    </div>
  );
}
