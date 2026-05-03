import { Gauge, TrendingDown, TrendingUp } from 'lucide-react';
import { getMacroBackdrop } from '@/engine/macroSystem';
import type { MacroEnvironment } from '@/engine/types';

function toneClass(tone: 'positive' | 'negative' | 'neutral') {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] text-[var(--profit-green)]';
  if (tone === 'negative') return 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] text-[var(--loss-red)]';
  return 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--info-blue)]';
}

function trendIcon(value: string) {
  if (value.includes('rising')) return <TrendingUp className="w-3.5 h-3.5" />;
  if (value.includes('falling')) return <TrendingDown className="w-3.5 h-3.5" />;
  return <Gauge className="w-3.5 h-3.5" />;
}

export default function MacroBackdropCard({ macro }: { macro: MacroEnvironment }) {
  const backdrop = getMacroBackdrop(macro);

  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-[var(--neutral-amber)]" />
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Macro Backdrop</h3>
      </div>

      <div className={`rounded-xl border p-3 mb-3 ${toneClass(backdrop.tone)}`}>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{backdrop.headline}</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">Updated for month {macro.turn}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {backdrop.details.map((detail) => (
          <div key={detail} className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] p-2">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              {trendIcon(detail)}
              <span className="text-[10px] leading-tight">{detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
