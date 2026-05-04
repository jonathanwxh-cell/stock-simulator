import { AlertTriangle, Crown, Flame, Shield, Sparkles } from 'lucide-react';
import type { LegacyEnding } from '@/engine/legacyStory';

const toneStyles: Record<LegacyEnding['tone'], {
  border: string;
  background: string;
  accent: string;
  Icon: typeof Crown;
}> = {
  triumph: {
    border: 'border-[rgba(34,197,94,0.26)]',
    background: 'bg-[linear-gradient(135deg,rgba(34,197,94,0.16),rgba(15,23,42,0.84))]',
    accent: 'text-[var(--profit-green)]',
    Icon: Crown,
  },
  survival: {
    border: 'border-[rgba(59,130,246,0.26)]',
    background: 'bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(15,23,42,0.84))]',
    accent: 'text-[var(--info-blue)]',
    Icon: Shield,
  },
  collapse: {
    border: 'border-[rgba(239,68,68,0.28)]',
    background: 'bg-[linear-gradient(135deg,rgba(239,68,68,0.16),rgba(15,23,42,0.86))]',
    accent: 'text-[var(--loss-red)]',
    Icon: AlertTriangle,
  },
  scandal: {
    border: 'border-[rgba(245,158,11,0.3)]',
    background: 'bg-[linear-gradient(135deg,rgba(245,158,11,0.15),rgba(15,23,42,0.86))]',
    accent: 'text-[var(--neutral-amber)]',
    Icon: Flame,
  },
  legend: {
    border: 'border-[rgba(168,85,247,0.28)]',
    background: 'bg-[linear-gradient(135deg,rgba(168,85,247,0.16),rgba(34,197,94,0.08),rgba(15,23,42,0.86))]',
    accent: 'text-[#C084FC]',
    Icon: Sparkles,
  },
};

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export default function LegacyEpilogueCard({ ending }: { ending: LegacyEnding }) {
  const style = toneStyles[ending.tone];
  const Icon = style.Icon;
  const sector = ending.drivers.topSector ? ending.drivers.topSector.replace(/([a-z])([A-Z])/g, '$1 $2') : 'Mixed';

  return (
    <section className={`${style.background} ${style.border} border rounded-3xl p-5 mb-6 text-left overflow-hidden relative`}>
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/5 blur-2xl" />
      <div className="flex items-start gap-4 relative">
        <div className={`shrink-0 rounded-2xl border border-white/10 bg-black/20 p-3 ${style.accent}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <span className={`text-[10px] uppercase tracking-[0.24em] ${style.accent}`}>Your Fund's Legacy</span>
          <h2 className="mt-1 text-xl font-display font-bold text-[var(--text-primary)]">{ending.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{ending.summary}</p>
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {ending.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
            {tag}
          </span>
        ))}
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-black/18 p-3">
          <span className="block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Net Worth</span>
          <span className="font-mono-data text-sm font-semibold text-[var(--text-primary)]">{formatMoney(ending.drivers.netWorth)}</span>
        </div>
        <div className="rounded-2xl bg-black/18 p-3">
          <span className="block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Alpha</span>
          <span className={`font-mono-data text-sm font-semibold ${ending.drivers.alphaPct >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
            {ending.drivers.alphaPct >= 0 ? '+' : ''}{ending.drivers.alphaPct.toFixed(1)}%
          </span>
        </div>
        <div className="rounded-2xl bg-black/18 p-3">
          <span className="block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Risk</span>
          <span className="font-mono-data text-sm font-semibold capitalize text-[var(--text-primary)]">{ending.drivers.riskLevel}</span>
        </div>
        <div className="rounded-2xl bg-black/18 p-3">
          <span className="block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Focus</span>
          <span className="text-sm font-semibold capitalize text-[var(--text-primary)]">{sector}</span>
        </div>
      </div>
    </section>
  );
}
