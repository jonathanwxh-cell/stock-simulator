import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { getTrophyDefinition } from '../../engine/trophySystem';
import TrophyArt, { RARITY_COLORS } from './TrophyArt';

export default function TrophyUnlockToast() {
  const { newTrophyUnlocks, dismissTrophyUnlock } = useGame();
  const unlock = newTrophyUnlocks[0];
  const definition = unlock ? getTrophyDefinition(unlock.trophyId) : null;

  useEffect(() => {
    if (!unlock) return;
    const timeoutId = window.setTimeout(() => dismissTrophyUnlock(unlock.trophyId), 4400);
    return () => window.clearTimeout(timeoutId);
  }, [unlock, dismissTrophyUnlock]);

  return (
    <AnimatePresence>
      {unlock && definition && (
        <motion.div
          key={unlock.trophyId}
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="fixed left-3 right-3 top-4 z-[70] mx-auto max-w-md rounded-3xl border border-[var(--border)] bg-[rgba(6,10,18,0.94)] p-3 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-4 sm:mx-0"
          style={{ boxShadow: `0 0 42px ${RARITY_COLORS[definition.rarity].glow}` }}
        >
          <div className="flex items-center gap-3">
            <TrophyArt definition={definition} unlocked className="h-20 w-20 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--neutral-amber)]">Trophy Unlocked</p>
              <h3 className="mt-1 text-base font-display font-bold text-[var(--text-primary)]">{definition.title}</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{definition.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    borderColor: `${RARITY_COLORS[definition.rarity].primary}66`,
                    color: RARITY_COLORS[definition.rarity].primary,
                  }}
                >
                  {definition.rarity}
                </span>
                <button
                  type="button"
                  onClick={() => dismissTrophyUnlock(unlock.trophyId)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
