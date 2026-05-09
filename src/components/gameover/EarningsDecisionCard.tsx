import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Minus, Plus, ShieldCheck } from 'lucide-react';
import type { PendingEarningsDecision } from '../../engine/catalystSystem';

type Choice = 'hold' | 'trim' | 'add';

interface Props {
  decision: PendingEarningsDecision;
  onTrim: (stockId: string, shares: number) => void;
  onAdd: (stockId: string, shares: number) => void;
}

// Round to whole shares — engine rejects fractional immediate trades.
function trimShares(currentShares: number): number {
  return Math.max(1, Math.floor(currentShares * 0.3));
}

function addShares(currentShares: number): number {
  return Math.max(1, Math.floor(currentShares * 0.3));
}

export default function EarningsDecisionCard({ decision, onTrim, onAdd }: Props) {
  const { stock, position, catalyst } = decision;
  const [chosen, setChosen] = useState<Choice | null>(null);

  const trimQty = trimShares(position.shares);
  const addQty = addShares(position.shares);

  const handleHold = () => setChosen('hold');
  const handleTrim = () => {
    setChosen('trim');
    onTrim(stock.id, trimQty);
  };
  const handleAdd = () => {
    setChosen('add');
    onAdd(stock.id, addQty);
  };

  if (chosen) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.6 }}
        className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 text-xs text-[var(--text-secondary)]"
      >
        <span className="font-semibold text-[var(--text-primary)]">{stock.ticker} earnings:</span>{' '}
        {chosen === 'hold' && 'Held the position into the print.'}
        {chosen === 'trim' && `Trimmed ${trimQty} share${trimQty === 1 ? '' : 's'} before earnings.`}
        {chosen === 'add' && `Added ${addQty} share${addQty === 1 ? '' : 's'} before earnings.`}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="mb-4 rounded-2xl border border-[rgba(245,158,11,0.4)] bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(15,23,42,0.85))] p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock className="w-4 h-4 text-[var(--neutral-amber)]" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--neutral-amber)]">
          Earnings Decision · Next Turn
        </span>
      </div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{stock.name}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {stock.ticker} · {position.shares} share{position.shares === 1 ? '' : 's'} @ ${stock.currentPrice.toFixed(2)}
          </p>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] font-mono-data">
          Turn {catalyst.scheduledTurn}
        </span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-3 leading-snug">
        {stock.name} reports next turn. Pre-commit your stance now — the result lands before you can react again.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleHold}
          className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[10px] hover:bg-[var(--surface-2)] transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-[var(--info-blue)]" />
          <span className="font-semibold text-[var(--text-primary)]">Hold</span>
          <span className="text-[var(--text-muted)]">No change</span>
        </button>
        <button
          onClick={handleTrim}
          className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[10px] hover:bg-[var(--surface-2)] transition-colors"
        >
          <Minus className="w-4 h-4 text-[var(--loss-red)]" />
          <span className="font-semibold text-[var(--text-primary)]">Trim {trimQty}</span>
          <span className="text-[var(--text-muted)]">Defensive</span>
        </button>
        <button
          onClick={handleAdd}
          className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2 text-[10px] hover:bg-[var(--surface-2)] transition-colors"
        >
          <Plus className="w-4 h-4 text-[var(--profit-green)]" />
          <span className="font-semibold text-[var(--text-primary)]">Add {addQty}</span>
          <span className="text-[var(--text-muted)]">Tactical</span>
        </button>
      </div>
    </motion.div>
  );
}
