import { useGame } from '../context/GameContext';
import { DollarSign, Briefcase, BarChart3, Newspaper, ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Footer() {
  const { gameState, navigateTo, screen, advanceTurn } = useGame();

  if (!gameState) return null;

  const tabs = [
    { id: 'game' as const, label: 'Home', icon: Home },
    { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase },
    { id: 'stock-market' as const, label: 'Market', icon: BarChart3 },
    { id: 'news' as const, label: 'News', icon: Newspaper },
  ];

  const handleTabClick = (tabId: typeof tabs[number]['id']) => {
    navigateTo(tabId);
  };

  const currentTab = screen === 'game' || screen === 'next-turn'
    ? 'game'
    : screen === 'portfolio'
    ? 'portfolio'
    : screen === 'stock-market' || screen === 'stock-detail'
    ? 'stock-market'
    : screen === 'news'
    ? 'news'
    : 'game';

  return (
    <motion.footer
      initial={{ y: 72 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="fixed bottom-0 left-0 right-0 z-30 min-h-[72px] bg-[var(--surface-0)] border-t border-[var(--border)] flex items-center px-3 sm:px-4"
    >
      <div className="flex items-center gap-2 flex-shrink-0 w-[104px] sm:w-[150px] min-w-0">
        <DollarSign className="w-4 h-4 text-[var(--neutral-amber)]" />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Cash</span>
          <span className="text-xs font-mono-data font-semibold text-[var(--text-primary)] tabular-nums truncate">
            ${gameState.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        <div className="flex items-center gap-1 bg-[var(--surface-1)] rounded-xl p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-[var(--profit-green)] bg-[var(--surface-2)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="footer-tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--profit-green)] rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0 w-[104px] sm:w-[150px] flex justify-end">
        <button
          onClick={advanceTurn}
          disabled={gameState.isGameOver}
          aria-label="Next Turn"
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-[var(--profit-green)] text-black font-semibold text-sm rounded-lg hover:brightness-110 active:scale-[0.98] transition-all animate-pulse-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:animate-none"
        >
          <span className="hidden sm:inline">Next Turn</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.footer>
  );
}
