import { Banknote, Radar, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import type { ScannerSignal } from '@/engine/types';

function categoryIcon(category: ScannerSignal['category']) {
  if (category === 'income') return <Banknote className="w-3.5 h-3.5" />;
  if (category === 'momentum') return <TrendingUp className="w-3.5 h-3.5" />;
  if (category === 'risk_warning') return <ShieldAlert className="w-3.5 h-3.5" />;
  if (category === 'macro_tailwind') return <Sparkles className="w-3.5 h-3.5" />;
  return <Radar className="w-3.5 h-3.5" />;
}

function toneClass(tone: ScannerSignal['tone']) {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] text-[var(--profit-green)]';
  if (tone === 'negative') return 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] text-[var(--loss-red)]';
  return 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--info-blue)]';
}

export default function ScannerSignalsCard({
  signals,
  onOpenStock,
}: {
  signals: ScannerSignal[];
  onOpenStock?: (stockId: string) => void;
}) {
  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Radar className="w-4 h-4 text-[var(--info-blue)]" />
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Scanner Signals</h3>
      </div>

      {signals.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Advance a turn to unlock scanner signals from prices, traits, and macro conditions.</p>
      ) : (
        <div className="space-y-2">
          {signals.map((signal) => (
            <button
              key={signal.id}
              type="button"
              onClick={() => onOpenStock?.(signal.stockId)}
              className={`w-full rounded-xl border p-3 text-left transition-all hover:border-[var(--border-hover)] ${toneClass(signal.tone)}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide">{signal.ticker}</span>
                <span className="inline-flex items-center gap-1 text-[10px]">
                  {categoryIcon(signal.category)}
                  {signal.score}
                </span>
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{signal.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{signal.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
