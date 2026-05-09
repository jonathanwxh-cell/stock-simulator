import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { Transaction } from '../../engine/types';

interface Props {
  transactions: Transaction[];
}

export default function MarginCallToast({ transactions }: Props) {
  if (transactions.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {transactions.map((txn, i) => (
        <motion.div
          key={txn.id}
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.2, type: 'spring', stiffness: 280, damping: 22 }}
          className="flex gap-3 rounded-xl border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.1)] p-4"
          role="alert"
        >
          <AlertTriangle className="w-5 h-5 text-[var(--loss-red)] flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--loss-red)]">Margin Call — Force Liquidation</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
              {txn.reason
                || `${txn.stockId.toUpperCase()} position closed at $${txn.price.toFixed(2)} · ${txn.shares} share${txn.shares === 1 ? '' : 's'} liquidated`}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
