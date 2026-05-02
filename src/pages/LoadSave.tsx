import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Clock } from 'lucide-react';
import { getSaveMetadata, deleteSave } from '../engine/saveSystem';
import type { SaveMetadata } from '../engine/types';

export default function LoadSave() {
  const {  loadGame, goBack } = useGame();
  const [slots, setSlots] = useState<SaveMetadata[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSaveMetadata().then(setSlots);
  }, []);

  const handleLoad = async (slot: 1 | 2 | 3 | 'auto') => {
    setLoading(true);
    await loadGame(slot);
    setLoading(false);
  };

  const handleDelete = async (slot: 1 | 2 | 3 | 'auto') => {
    await deleteSave(slot);
    getSaveMetadata().then(setSlots);
  };

  return (
    <div className="min-h-[100dvh] p-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={goBack} className="w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">Load Game</h1>
        </div>

        <div className="space-y-3">
          {slots.map((slot) => (
            <div key={slot.slot} className={`bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5 ${slot.exists ? '' : 'opacity-40'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="font-semibold text-[var(--text-primary)] capitalize">{slot.slot === 'auto' ? 'Auto-Save' : 'Slot ' + slot.slot}</span>
                </div>
                {slot.exists && (
                  <div className="flex items-center gap-2">
                    {slot.isGameOver && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wide">
                        Completed
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Clock className="w-3 h-3" />Turn {slot.currentTurn}</span>
                  </div>
                )}
              </div>
              {slot.exists ? (
                <>
                  <p className="text-sm text-[var(--text-secondary)]">{slot.playerName} &middot; {slot.difficulty}</p>
                  <p className="text-sm font-mono-data text-[var(--profit-green)] mt-1">${slot.netWorth.toFixed(2)}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleLoad(slot.slot)} disabled={loading}
                      className="flex-1 py-2 rounded-lg bg-[var(--profit-green)] text-black text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all">
                      {loading ? 'Loading...' : slot.isGameOver ? 'View Results' : 'Load'}
                    </button>
                    <button onClick={() => handleDelete(slot.slot)}
                      className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--loss-red)] hover:bg-[rgba(239,68,68,0.1)] transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Empty slot</p>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
