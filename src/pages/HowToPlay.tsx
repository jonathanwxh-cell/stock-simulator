import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Target, BarChart3, Briefcase, Newspaper, Zap, Trophy, Lightbulb } from 'lucide-react';
import { DIFFICULTY_CONFIGS } from '../engine/config';

const sections = [
  { icon: Target, title: 'Goal', text: 'Grow your starting cash into a target net worth within a limited number of turns. Each turn represents one month.' },
  { icon: BarChart3, title: 'Stock Market', text: 'Browse 30 stocks across 6 sectors. Prices change every turn based on market conditions, news events, and active scenarios.' },
  { icon: Briefcase, title: 'Trading', text: 'Buy and sell shares at current market prices. Use the trade modal to select quantities and confirm trades.' },
  { icon: Newspaper, title: 'News & Events', text: 'Random market news affects stock prices. Active scenarios create multi-turn market conditions impacting specific sectors.' },
  { icon: Zap, title: 'Dividends', text: 'Some stocks pay quarterly dividends. Dividend yield is shown on the stock detail page.' },
  { icon: Trophy, title: 'Grading', text: 'Your performance is graded S through F based on your final net worth relative to the goal. Reach 3x the goal for an S rank!' },
  { icon: Lightbulb, title: 'Tips', text: 'Diversify across sectors. Watch for scenario impacts on specific sectors. Dividend stocks provide steady income. High volatility means higher risk AND reward.' },
];

export default function HowToPlay() {
  const { goBack } = useGame();

  return (
    <div className="min-h-[100dvh] p-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={goBack} className="w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">How to Play</h1>
        </div>

        <div className="space-y-3">
          {sections.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-1)] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[var(--profit-green)]" />
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{s.title}</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed pl-11">{s.text}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Difficulty Reference */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Difficulty Reference</h2>
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider p-3 border-b border-[var(--border)]">
              <span>Level</span><span>Start</span><span>Goal</span><span>Turns</span>
            </div>
            {(['easy', 'normal', 'hard', 'expert'] as const).map(d => {
              const c = DIFFICULTY_CONFIGS[d];
              return (
                <div key={d} className="grid grid-cols-4 text-sm p-3 border-b border-[var(--border)] last:border-0">
                  <span className="capitalize text-[var(--text-primary)]">{d}</span>
                  <span className="font-mono-data text-[var(--text-secondary)]">${c.startingCash.toLocaleString()}</span>
                  <span className="font-mono-data text-[var(--profit-green)]">${(c.startingCash * c.goalMultiplier).toLocaleString()}</span>
                  <span className="font-mono-data text-[var(--text-secondary)]">{c.turnLimit}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
