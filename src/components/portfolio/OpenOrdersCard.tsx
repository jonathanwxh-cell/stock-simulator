import { Clock3, ShieldAlert, X } from 'lucide-react';
import { DIFFICULTY_CONFIGS } from '../../engine/config';
import type { ConditionalOrder, GameState, LimitOrder } from '../../engine/types';

type OrderRow = {
  id: string;
  stockId: string;
  ticker: string;
  label: string;
  shares: number;
  placedTurn: number;
  priceLabel: string;
  distancePct: number;
  kind: 'limit' | 'protective';
};

function badgeClass(label: string) {
  if (label.includes('buy') || label.includes('take-profit')) return 'bg-[rgba(34,197,94,0.14)] text-[var(--profit-green)]';
  if (label.includes('sell') || label.includes('stop-loss')) return 'bg-[rgba(239,68,68,0.14)] text-[var(--loss-red)]';
  return 'bg-[var(--surface-1)] text-[var(--text-secondary)]';
}

function buildLimitRows(gameState: GameState): OrderRow[] {
  return gameState.limitOrders.map((order: LimitOrder) => {
    const stock = gameState.stocks.find((entry) => entry.id === order.stockId);
    const currentPrice = stock?.currentPrice || order.targetPrice;
    const distancePct = currentPrice > 0 ? ((order.targetPrice - currentPrice) / currentPrice) * 100 : 0;
    return {
      id: order.id,
      stockId: order.stockId,
      ticker: stock?.ticker || order.stockId,
      label: `limit ${order.type}`,
      shares: order.shares,
      placedTurn: order.placedTurn,
      priceLabel: `$${order.targetPrice.toFixed(2)}`,
      distancePct,
      kind: 'limit',
    };
  });
}

function buildConditionalRows(gameState: GameState): OrderRow[] {
  return (gameState.conditionalOrders || []).map((order: ConditionalOrder) => {
    const stock = gameState.stocks.find((entry) => entry.id === order.stockId);
    const currentPrice = stock?.currentPrice || order.triggerPrice;
    const distancePct = currentPrice > 0 ? ((order.triggerPrice - currentPrice) / currentPrice) * 100 : 0;
    return {
      id: order.id,
      stockId: order.stockId,
      ticker: stock?.ticker || order.stockId,
      label: order.type === 'stop_loss' ? 'stop-loss' : 'take-profit',
      shares: order.shares,
      placedTurn: order.placedTurn,
      priceLabel: `$${order.triggerPrice.toFixed(2)}`,
      distancePct,
      kind: 'protective',
    };
  });
}

export default function OpenOrdersCard({
  gameState,
  onOpenStock,
  onCancelLimitOrder,
  onCancelProtectiveOrder,
}: {
  gameState: GameState;
  onOpenStock: (stockId: string) => void;
  onCancelLimitOrder: (orderId: string) => void;
  onCancelProtectiveOrder: (orderId: string) => void;
}) {
  const rows = [...buildLimitRows(gameState), ...buildConditionalRows(gameState)].sort((left, right) => {
    if (left.stockId !== right.stockId) return left.stockId.localeCompare(right.stockId);
    return left.placedTurn - right.placedTurn;
  });
  const pendingCap = DIFFICULTY_CONFIGS[gameState.difficulty].maxLimitOrders;

  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-[var(--neutral-amber)]" />
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Open Orders</h2>
            <p className="text-[10px] text-[var(--text-muted)]">{rows.length} of {pendingCap} pending slots in use.</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wide">
          Limits + protective
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-sm text-[var(--text-muted)]">No pending orders yet. Use limit orders, stop-losses, or take-profits to automate exits and entries.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const directionClass = badgeClass(row.label);
            return (
              <div key={row.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenStock(row.stockId)}
                    className="min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{row.ticker}</span>
                      {row.kind === 'protective' && <ShieldAlert className="w-3.5 h-3.5 text-[var(--neutral-amber)]" />}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${directionClass}`}>
                        {row.label.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{row.shares} shares at {row.priceLabel}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                      Trigger gap {row.distancePct >= 0 ? '+' : ''}{row.distancePct.toFixed(1)}% from current price
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => row.kind === 'limit' ? onCancelLimitOrder(row.id) : onCancelProtectiveOrder(row.id)}
                    className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-muted)] flex items-center justify-center hover:text-[var(--loss-red)] hover:border-[rgba(239,68,68,0.35)]"
                    aria-label={`Cancel ${row.label} for ${row.ticker}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
