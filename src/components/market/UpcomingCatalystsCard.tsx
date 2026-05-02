import { CalendarClock } from 'lucide-react';
import { CATALYST_TYPE_LABELS } from '@/engine/catalystSystem';
import type { CatalystEvent, Stock } from '@/engine/types';

function stockFor(stocks: Stock[], stockId: string) {
  return stocks.find((stock) => stock.id === stockId);
}

export default function UpcomingCatalystsCard({
  catalysts,
  stocks,
  currentTurn,
  onOpenStock,
}: {
  catalysts: CatalystEvent[];
  stocks: Stock[];
  currentTurn: number;
  onOpenStock?: (stockId: string) => void;
}) {
  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="w-4 h-4 text-[var(--info-blue)]" />
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Upcoming Catalysts</h3>
      </div>

      {catalysts.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No catalysts are queued yet.</p>
      ) : (
        <div className="space-y-2">
          {catalysts.map((event) => {
            const stock = stockFor(stocks, event.stockId);
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onOpenStock?.(event.stockId)}
                className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 hover:border-[var(--border-hover)] transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{stock?.ticker || event.stockId}</span>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    Turn +{event.scheduledTurn - currentTurn}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{CATALYST_TYPE_LABELS[event.type]}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Expected volatility: {event.volatility}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
