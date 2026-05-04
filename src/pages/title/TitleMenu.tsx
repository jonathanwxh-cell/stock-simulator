import { motion } from 'framer-motion';
import { Play, FolderOpen, Trophy, Settings, HelpCircle, Award } from 'lucide-react';

const MENU_ITEMS = [
  { id: 'new-game', label: 'NEW GAME', icon: Play, variant: 'primary' as const },
  { id: 'load-game', label: 'LOAD GAME', icon: FolderOpen, variant: 'secondary' as const },
  { id: 'leaderboard', label: 'LEADERBOARD', icon: Trophy, variant: 'secondary' as const },
  { id: 'trophy-room', label: 'TROPHY ROOM', icon: Award, variant: 'secondary' as const },
  { id: 'settings', label: 'SETTINGS', icon: Settings, variant: 'secondary' as const },
  { id: 'how-to-play', label: 'HOW TO PLAY', icon: HelpCircle, variant: 'ghost' as const },
];

interface TitleMenuProps {
  loadDisabled: boolean;
  hasAutoSave: boolean;
  onMenuClick: (id: string) => void;
  onAutoSaveContinue: () => void;
}

export default function TitleMenu({ loadDisabled, hasAutoSave, onMenuClick, onAutoSaveContinue }: TitleMenuProps) {
  return (
    <div className="relative z-10 flex flex-col items-center w-full max-w-md px-4">
      {/* Logo */}
      <motion.img
        src="/game-logo.png"
        alt="MARKET MASTER"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: 0.3 }}
        className="w-[280px] sm:w-[360px] mb-4 object-contain"
        style={{ filter: 'drop-shadow(0 0 24px rgba(34,197,94,0.2))' }}
      />

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], delay: 0.6 }}
        className="text-[var(--text-secondary)] text-sm uppercase tracking-[0.15em] mb-10 font-medium"
      >
        Master the Markets. Build Your Empire.
      </motion.p>

      {/* Menu buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-[280px] space-y-3"
      >
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const isDisabled = item.id === 'load-game' && loadDisabled;

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                delay: 0.8 + index * 0.08,
              }}
              onClick={() => !isDisabled && onMenuClick(item.id)}
              disabled={isDisabled}
              className={`w-full flex items-center justify-center gap-3 py-3.5 px-8 rounded-lg font-semibold text-sm uppercase tracking-wider transition-all duration-200 ${
                item.variant === 'primary'
                  ? 'bg-[var(--profit-green)] text-black hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(34,197,94,0.3)] active:translate-y-0 active:scale-[0.98]'
                  : item.variant === 'secondary'
                  ? `bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-1)] hover:border-[var(--border-hover)] active:scale-[0.98] ${isDisabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent hover:border-[var(--border)]' : ''}`
                  : 'bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)] active:scale-[0.98]'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Version & Auto-save indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.3 }}
        className="mt-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-[var(--text-muted)]">v{import.meta.env.VITE_APP_VERSION}</span>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.16em]">
          Fictional companies and tickers
        </span>

        {hasAutoSave && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.3 }}
            onClick={onAutoSaveContinue}
            className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--profit-green)] transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--profit-green)] animate-pulse" />
            Continue from auto-save
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
