import { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import type { Difficulty } from '../engine/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  FolderOpen,
  Trophy,
  Settings,
  HelpCircle,
  Star,
  Check,
  ChevronLeft,
  X,
} from 'lucide-react';
import { DIFFICULTY_CONFIGS } from '../engine/config';
import { getSaveMetadata } from '../engine/saveSystem';
import type { SaveMetadata } from '../engine/types';

const DIFFICULTY_DATA: Array<{
  key: Difficulty;
  label: string;
  color: string;
  stars: number;
}> = [
  { key: 'easy', label: 'Easy', color: '#22C55E', stars: 1 },
  { key: 'normal', label: 'Normal', color: '#3B82F6', stars: 2 },
  { key: 'hard', label: 'Hard', color: '#F59E0B', stars: 3 },
  { key: 'expert', label: 'Expert', color: '#EF4444', stars: 4 },
];

const MENU_ITEMS = [
  { id: 'new-game', label: 'NEW GAME', icon: Play, variant: 'primary' as const },
  { id: 'load-game', label: 'LOAD GAME', icon: FolderOpen, variant: 'secondary' as const },
  { id: 'leaderboard', label: 'LEADERBOARD', icon: Trophy, variant: 'secondary' as const },
  { id: 'settings', label: 'SETTINGS', icon: Settings, variant: 'secondary' as const },
  { id: 'how-to-play', label: 'HOW TO PLAY', icon: HelpCircle, variant: 'ghost' as const },
];

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const PARTICLES = Array.from({ length: 25 }).map((_, index) => ({
  id: index,
  size: 3 + pseudoRandom(index + 1) * 4,
  left: pseudoRandom(index + 101) * 100,
  delay: pseudoRandom(index + 201) * 20,
  duration: 15 + pseudoRandom(index + 301) * 10,
}));

export default function TitleScreen() {
  const { navigateTo, newGame } = useGame();
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [hasAutoSave, setHasAutoSave] = useState(false);
  const [loadDisabled, setLoadDisabled] = useState(true);

  useEffect(() => {
    getSaveMetadata().then((slots: SaveMetadata[]) => {
      const auto = slots.find(s => s.slot === 'auto');
      setHasAutoSave(auto?.exists ?? false);
      const anySave = slots.some(s => s.exists);
      setLoadDisabled(!anySave);
    });
  }, []);

  const handleMenuClick = useCallback((id: string) => {
    if (id === 'new-game') {
      setShowDifficulty(true);
      setSelectedDifficulty(null);
      setPlayerName('');
    } else if (id === 'load-game') {
      if (!loadDisabled) navigateTo('load-save');
    } else if (id === 'leaderboard') {
      navigateTo('leaderboard');
    } else if (id === 'settings') {
      navigateTo('settings');
    } else if (id === 'how-to-play') {
      navigateTo('how-to-play');
    }
  }, [navigateTo, loadDisabled]);

  const handleStartGame = useCallback(() => {
    if (selectedDifficulty && playerName.trim()) {
      newGame(playerName.trim(), selectedDifficulty);
    }
  }, [selectedDifficulty, playerName, newGame]);

  const handleAutoSaveContinue = useCallback(() => {
    navigateTo('load-save');
  }, [navigateTo]);

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        {/* Static background image */}
        <img
          src="/title-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        {/* Video overlay */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        >
          <source src="/title-ambient.mp4" type="video/mp4" />
        </video>
        {/* Ambient glow */}
        <div className="absolute inset-0 ambient-glow opacity-60" />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--void)]/40 via-transparent to-[var(--void)]/80" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-[var(--profit-green)] animate-float-up"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              bottom: '-10px',
              opacity: 0,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
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
                onClick={() => !isDisabled && handleMenuClick(item.id)}
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
          <span className="text-xs text-[var(--text-muted)]">v1.0.0</span>

          {hasAutoSave && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.3 }}
              onClick={handleAutoSaveContinue}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--profit-green)] transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--profit-green)] animate-pulse" />
              Continue from auto-save
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* Difficulty Selection Overlay */}
      <AnimatePresence>
        {showDifficulty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowDifficulty(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--surface-0)] border border-[var(--border)] rounded-3xl p-8 max-w-[560px] w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="text-display-md font-display font-bold text-[var(--text-primary)]"
                >
                  Choose Your Challenge
                </motion.h2>
                <button
                  onClick={() => setShowDifficulty(false)}
                  className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-body-md text-[var(--text-secondary)] mb-6"
              >
                Select a difficulty level. This will affect starting funds, market volatility, and your wealth goal.
              </motion.p>

              {/* Difficulty Cards Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {DIFFICULTY_DATA.map((diff, index) => {
                  const config = DIFFICULTY_CONFIGS[diff.key];
                  const isSelected = selectedDifficulty === diff.key;
                  const Icon = Star;

                  return (
                    <motion.button
                      key={diff.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
                        delay: 0.2 + index * 0.08,
                      }}
                      onClick={() => setSelectedDifficulty(diff.key)}
                      className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] ${
                        isSelected
                          ? 'bg-[var(--surface-1)]'
                          : 'bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--border-hover)]'
                      }`}
                      style={{
                        borderColor: isSelected ? diff.color : undefined,
                        boxShadow: isSelected ? `0 0 0 3px ${diff.color}33` : undefined,
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: diff.color }}
                        >
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <h3
                          className="text-heading-md font-semibold"
                          style={{ color: diff.color }}
                        >
                          {diff.label}
                        </h3>
                        <div className="flex gap-0.5">
                          {Array.from({ length: diff.stars }).map((_, i) => (
                            <Icon
                              key={i}
                              className="w-4 h-4 fill-current"
                              style={{ color: diff.color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-mono-sm text-[var(--text-secondary)]">
                          Starting: ${config.startingCash.toLocaleString()}
                        </p>
                        <p className="text-mono-sm text-[var(--text-secondary)]">
                          Goal: ${(config.startingCash * config.goalMultiplier).toLocaleString()}
                        </p>
                        <p className="text-mono-sm text-[var(--text-secondary)]">
                          Turns: {config.turnLimit}
                        </p>
                        <p className="text-mono-sm text-[var(--text-secondary)]">
                          Volatility: {config.volatilityMultiplier}x
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Player Name Input */}
              <AnimatePresence>
                {selectedDifficulty && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6 overflow-hidden"
                  >
                    <label className="block text-heading-sm font-semibold text-[var(--text-primary)] mb-2">
                      Enter Your Name
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                      placeholder="Trader Name"
                      maxLength={20}
                      className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--profit-green)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)] transition-all outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && playerName.trim()) {
                          handleStartGame();
                        }
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDifficulty(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-1)] transition-all active:scale-[0.98]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleStartGame}
                  disabled={!selectedDifficulty || !playerName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-[var(--profit-green)] text-black font-semibold hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" />
                  Start Game
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
