import { useGame } from '../context/GameContext';
import { getNetWorth } from '../engine';
import { Settings, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
  const { gameState, navigateTo, updateSettings, settings } = useGame();

  if (!gameState) return null;

  const netWorth = getNetWorth(gameState);

  const dateStr = gameState.currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const toggleSound = () => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  };

  return (
    <motion.nav
      initial={{ y: -56 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
      className="fixed top-0 left-0 right-0 z-30 h-14 glass border-b border-[var(--border)] flex items-center px-4"
    >
      <div className="flex items-center gap-3 flex-shrink-0">
        <img
          src="/game-logo.png"
          alt="Market Master"
          className="h-7 w-auto object-contain"
        />
        <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:block">
          {dateStr}
        </span>
      </div>

      <div className="flex-1 text-center">
        <span className="text-sm font-mono-data text-[var(--text-primary)] sm:hidden">
          {dateStr}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
          <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Net Worth</span>
          <span className="text-sm font-mono-data font-semibold text-[var(--profit-green)]">
            ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <button
          onClick={toggleSound}
          className="w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors"
          aria-label={settings.soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {settings.soundEnabled ? (
            <Volume2 className="w-4 h-4 text-[var(--text-secondary)]" />
          ) : (
            <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </button>

        <button
          onClick={() => navigateTo('settings')}
          className="w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
      </div>
    </motion.nav>
  );
}
