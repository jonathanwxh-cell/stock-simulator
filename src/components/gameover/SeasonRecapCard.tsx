import { Award, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import type { SeasonRecap } from '@/engine/types';

function pct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function SeasonRecapCard({ recap }: { recap: SeasonRecap }) {
  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6 mb-6 text-left">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-4 h-4 text-[var(--neutral-amber)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">Season Recap</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-[var(--surface-1)] p-3">
          <span className="text-[10px] text-[var(--text-muted)] block">Alpha</span>
          <span className={`text-sm font-mono-data font-semibold ${recap.alphaPct >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
            {pct(recap.alphaPct)}
          </span>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">You {pct(recap.playerReturnPct)} vs market {pct(recap.marketReturnPct)}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-1)] p-3">
          <span className="text-[10px] text-[var(--text-muted)] block">Max Drawdown</span>
          <span className="text-sm font-mono-data font-semibold text-[var(--loss-red)]">-{recap.maxDrawdownPct.toFixed(1)}%</span>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Peak-to-trough pain during the run</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--profit-green)] mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wide">Best Turn</span>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {recap.bestTurn ? `Turn ${recap.bestTurn.turn}` : 'N/A'}
          </p>
          <p className="text-xs text-[var(--profit-green)]">{recap.bestTurn ? pct(recap.bestTurn.changePct) : '0.0%'}</p>
        </div>
        <div className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3">
          <div className="flex items-center gap-1.5 text-[var(--loss-red)] mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-wide">Worst Turn</span>
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {recap.worstTurn ? `Turn ${recap.worstTurn.turn}` : 'N/A'}
          </p>
          <p className="text-xs text-[var(--loss-red)]">{recap.worstTurn ? pct(recap.worstTurn.changePct) : '0.0%'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-[var(--surface-1)] p-3">
          <span className="text-[10px] text-[var(--text-muted)] block">Top Winner</span>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{recap.topWinner?.ticker || 'None'}</p>
          <p className="text-xs text-[var(--profit-green)]">
            {recap.topWinner ? `${pct(recap.topWinner.pnlPct)} · $${recap.topWinner.pnl.toFixed(2)}` : '$0.00'}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface-1)] p-3">
          <span className="text-[10px] text-[var(--text-muted)] block">Biggest Drag</span>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{recap.biggestDrag?.ticker || 'None'}</p>
          <p className="text-xs text-[var(--loss-red)]">
            {recap.biggestDrag ? `${pct(recap.biggestDrag.pnlPct)} · $${recap.biggestDrag.pnl.toFixed(2)}` : '$0.00'}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-[var(--surface-1)] p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-[var(--info-blue)]" />
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Run Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Trades</span><span className="font-mono-data text-[var(--text-primary)]">{recap.totalTrades}</span></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Fees</span><span className="font-mono-data text-[var(--text-primary)]">${recap.totalFees.toFixed(2)}</span></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Dividends</span><span className="font-mono-data text-[var(--text-primary)]">${recap.totalDividends.toFixed(2)}</span></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Headlines</span><span className="font-mono-data text-[var(--text-primary)]">{recap.newsEvents}</span></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Catalysts Resolved</span><span className="font-mono-data text-[var(--text-primary)]">{recap.catalystEvents}</span></div>
          <div className="flex justify-between gap-3"><span className="text-[var(--text-muted)]">Watchlist Hits</span><span className="font-mono-data text-[var(--text-primary)]">{recap.watchedNewsHits}</span></div>
        </div>
      </div>
    </div>
  );
}
