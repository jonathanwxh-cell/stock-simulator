import { BellRing, TrendingDown, TrendingUp } from 'lucide-react';
import type { Stock, WatchlistAlert } from '@/engine/types';

function toneClass(tone: WatchlistAlert['tone']) {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] text-[var(--profit-green)]';
  if (tone === 'negative') return 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] text-[var(--loss-red)]';
  return 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--info-blue)]';
}

function stockLabel(stocks: Stock[], stockId: string): string {
  return stocks.find((stock) => stock.id === stockId)?.ticker || stockId;
}

export default function WatchlistAlertsCard({
  alerts,
  stocks,
  onOpenStock,
}: {
  alerts: WatchlistAlert[];
  stocks: Stock[];
  onOpenStock?: (stockId: string) => void;
}) {
  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BellRing className="w-4 h-4 text-[var(--neutral-amber)]" />
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Watchlist Alerts</h3>
      </div>

      {alerts.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Star a few stocks to get move, news, and catalyst alerts here.</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => onOpenStock?.(alert.stockId)}
              className={`w-full text-left rounded-xl border p-3 transition-all hover:border-[var(--border-hover)] ${toneClass(alert.tone)}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide">{stockLabel(stocks, alert.stockId)}</span>
                {alert.tone === 'positive' ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : alert.tone === 'negative' ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <BellRing className="w-3.5 h-3.5" />
                )}
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{alert.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
