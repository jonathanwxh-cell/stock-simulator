import { motion, AnimatePresence } from 'framer-motion';
import { Play, Star, Check, ChevronLeft, X } from 'lucide-react';
import type { CareerStyle, ChallengeModeId, Difficulty } from '../../engine/types';
import { DIFFICULTY_CONFIGS } from '../../engine/config';
import { CAREER_ARCHETYPES } from '../../engine/careerSystem';
import { CHALLENGE_MODES } from '../../engine/careerSeasons';

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

const CAREER_DATA = Object.values(CAREER_ARCHETYPES);
const CHALLENGE_DATA = Object.values(CHALLENGE_MODES);

interface NewGameOverlayProps {
  open: boolean;
  selectedDifficulty: Difficulty | null;
  selectedCareer: CareerStyle;
  selectedChallenge: ChallengeModeId;
  playerName: string;
  onSelectDifficulty: (d: Difficulty) => void;
  onSelectCareer: (c: CareerStyle) => void;
  onSelectChallenge: (c: ChallengeModeId) => void;
  onChangePlayerName: (n: string) => void;
  onClose: () => void;
  onStart: () => void;
}

export default function NewGameOverlay({
  open,
  selectedDifficulty,
  selectedCareer,
  selectedChallenge,
  playerName,
  onSelectDifficulty,
  onSelectCareer,
  onSelectChallenge,
  onChangePlayerName,
  onClose,
  onStart,
}: NewGameOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
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
                onClick={onClose}
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
                    onClick={() => onSelectDifficulty(diff.key)}
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
                      <h3 className="text-heading-md font-semibold" style={{ color: diff.color }}>
                        {diff.label}
                      </h3>
                      <div className="flex gap-0.5">
                        {Array.from({ length: diff.stars }).map((_, i) => (
                          <Icon key={i} className="w-4 h-4 fill-current" style={{ color: diff.color }} />
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

            {/* Career & Challenge & Name (only when difficulty selected) */}
            <AnimatePresence>
              {selectedDifficulty && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="mb-6">
                    <label className="block text-heading-sm font-semibold text-[var(--text-primary)] mb-2">
                      Pick Your Fund Style
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CAREER_DATA.map((career) => {
                        const isSelected = selectedCareer === career.style;
                        return (
                          <button
                            key={career.style}
                            type="button"
                            onClick={() => onSelectCareer(career.style)}
                            className={`relative text-left rounded-xl border p-3 transition-all ${
                              isSelected
                                ? 'bg-[var(--surface-2)]'
                                : 'bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--border-hover)]'
                            }`}
                            style={{
                              borderColor: isSelected ? career.color : undefined,
                              boxShadow: isSelected ? `0 0 0 2px ${career.color}33` : undefined,
                            }}
                          >
                            {isSelected && (
                              <div
                                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: career.color }}
                              >
                                <Check className="w-3 h-3 text-black" />
                              </div>
                            )}
                            <p className="text-sm font-semibold pr-6" style={{ color: career.color }}>
                              {career.label}
                            </p>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1">{career.tagline}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-2">{career.perk}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-heading-sm font-semibold text-[var(--text-primary)] mb-2">
                      Choose Career Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CHALLENGE_DATA.map((challenge) => {
                        const isSelected = selectedChallenge === challenge.id;
                        return (
                          <button
                            key={challenge.id}
                            type="button"
                            onClick={() => onSelectChallenge(challenge.id)}
                            className={`relative text-left rounded-xl border p-3 transition-all ${
                              isSelected
                                ? 'bg-[rgba(59,130,246,0.12)] border-[var(--info-blue)]'
                                : 'bg-[var(--surface-1)] border-[var(--border)] hover:border-[var(--border-hover)]'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--info-blue)] flex items-center justify-center">
                                <Check className="w-3 h-3 text-black" />
                              </div>
                            )}
                            <div className="flex items-center gap-2 pr-6">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">{challenge.title}</p>
                              <span className="text-[9px] uppercase tracking-wider text-[var(--info-blue)] border border-[rgba(59,130,246,0.3)] rounded-full px-1.5 py-0.5">
                                {challenge.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1">{challenge.description}</p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2">
                      Standard Career is recommended. Challenges are optional replay flavors, not extra homework.
                    </p>
                  </div>

                  <label className="block text-heading-sm font-semibold text-[var(--text-primary)] mb-2">
                    Enter Your Name
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => onChangePlayerName(e.target.value.slice(0, 20))}
                    placeholder="Trader Name"
                    maxLength={20}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--profit-green)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)] transition-all outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && playerName.trim()) {
                        onStart();
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-1)] transition-all active:scale-[0.98]"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={onStart}
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
  );
}
