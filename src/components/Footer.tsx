import { useGame } from '../context/GameContext';
import { DollarSign, Briefcase, BarChart3, Newspaper, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Footer() {
  const { gameState, navigateTo, screen, advanceTurn } = useGame();

  if (!gameState) return null;

  const tabs = [
    { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase },
    { id: 'stock-market' as const, label: 'Market', icon: BarChart3 },
    { id: 'news' as const, label: 'News', icon: Newspaper },
  ];

  const handleTabClick = (tabId: typeof tabs[number]['id']) => {
    if (tabId === 'portfolio') navigateTo('portfolio');
    if (tabId === 'stock-market') navigateTo('stock-market');
    if (tabId === 'news') navigateTo('news');
  };

  const currentTab = screen === 'portfolio' || screen === 'stock-market' || screen === 'news'
    ? screen
    : 'portfolio';

  return (
    <motion.footer
      initial={{ y: 72 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="fixed bottom-0 left-0 right-0 z-30 h-[72px] bg-[var(--surface-0)] border-t border-[var(--border)] flex items-center px-4"
    >
      {/* Left: Cash */}
      <div className="flex items-center gap-2 flex-shrink-0 w-[140px]">
        <DollarSign className="w-4 h-4 text-[var(--neutral-amber)]" />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Cash</span>
          <span className="text-xs font-mono-data font-semibold text-[var(--text-primary)]">
            ${gameState.cash.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-1 bg-[var(--surface-1)] rounded-xl p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
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

      {/* Right: Next Turn */}
      <div className="flex-shrink-0 w-[140px] flex justify-end">
        <button
          onClick={advanceTurn}
          disabled={gameState.isGameOver}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--profit-green)] text-black font-semibold text-sm rounded-lg hover:brightness-110 active:scale-[0.98] transition-all animate-pulse-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:animate-none"
        >
          Next Turn
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.footer>
  );
}
