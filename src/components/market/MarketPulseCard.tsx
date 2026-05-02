import { Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { SECTOR_COLORS, SECTOR_LABELS } from '@/engine/config';
import type { MarketBreadthSummary } from '@/engine/types';

function pct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function MarketPulseCard({ summary }: { summary: MarketBreadthSummary }) {
  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-[var(--info-blue)]" />
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Market Pulse</h3>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="rounded-xl bg-[rgba(34,197,94,0.08)] p-2">
          <span className="text-[10px] text-[var(--text-muted)] block">Advancers</span>
          <span className="text-sm font-mono-data font-semibold text-[var(--profit-green)]">{summary.advances}</span>
        </div>
        <div className="rounded-xl bg-[rgba(239,68,68,0.08)] p-2">
          <span className="text-[10px] text-[var(--text-muted)] block">Decliners</span>
          <span className="text-sm font-mono-data font-semibold text-[var(--loss-red)]">{summary.declines}</span>
        </div>
        <div className="rounded-xl bg-[var(--surface-1)] p-2">
          <span className="text-[10px] text-[var(--text-muted)] block">Flat</span>
          <span className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">{summary.unchanged}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--profit-green)] mb-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wide">Best Sector</span>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {summary.bestSector ? SECTOR_LABELS[summary.bestSector.sector] || summary.bestSector.sector : 'N/A'}
          </p>
          <p className="text-xs text-[var(--profit-green)]">
            {summary.bestSector ? pct(summary.bestSector.avgChangePct) : '0.0%'}
          </p>
        </div>
        <div className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--loss-red)] mb-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wide">Worst Sector</span>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {summary.worstSector ? SECTOR_LABELS[summary.worstSector.sector] || summary.worstSector.sector : 'N/A'}
          </p>
          <p className="text-xs text-[var(--loss-red)]">
            {summary.worstSector ? pct(summary.worstSector.avgChangePct) : '0.0%'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {summary.sectorPerformance.map((sector) => (
          <div
            key={sector.sector}
            className="rounded-xl border p-2"
            style={{
              borderColor: `${SECTOR_COLORS[sector.sector]}33`,
              backgroundColor: sector.avgChangePct > 0
                ? 'rgba(34,197,94,0.04)'
                : sector.avgChangePct < 0
                ? 'rgba(239,68,68,0.04)'
                : 'rgba(255,255,255,0.02)',
            }}
          >
            <p className="text-[10px] text-[var(--text-muted)] truncate">{SECTOR_LABELS[sector.sector] || sector.sector}</p>
            <p className={`text-xs font-mono-data font-semibold ${sector.avgChangePct > 0 ? 'text-[var(--profit-green)]' : sector.avgChangePct < 0 ? 'text-[var(--loss-red)]' : 'text-[var(--text-primary)]'}`}>
              {pct(sector.avgChangePct)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
