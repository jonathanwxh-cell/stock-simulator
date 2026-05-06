import { useState } from 'react';
import { Clock3, ShieldAlert, X } from 'lucide-react';
import type { ConditionalOrder, LimitOrder, Stock } from '../../engine/types';
import { getLimitOrderKind, getOrderLanguage } from '../../engine/tradeLanguage';

function buttonClass(active: boolean, tone: 'green' | 'red' | 'blue') {
  if (!active) return 'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)]';
  if (tone === 'green') return 'bg-[var(--profit-green)] text-black';
  if (tone === 'red') return 'bg-[var(--loss-red)] text-white';
  return 'bg-[var(--info-blue)] text-white';
}

function parsePositiveWhole(value: string) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parsePositiveCurrency(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function isShortProtectiveType(type: ConditionalOrder['type']) {
  return type === 'short_stop_loss' || type === 'short_take_profit';
}

function protectiveTone(type: ConditionalOrder['type']): 'red' | 'blue' {
  return type === 'stop_loss' || type === 'short_stop_loss' ? 'red' : 'blue';
}

function triggerLabel(type: ConditionalOrder['type']) {
  if (type === 'short_stop_loss') return 'Close short if price rises to';
  if (type === 'short_take_profit') return 'Close short if price falls to';
  return 'Sell if price reaches';
}

export default function PendingOrdersCard({
  stock,
  currentPrice,
  longShares,
  shortShares,
  pendingUsed,
  pendingCap,
  limitOrders,
  conditionalOrders,
  lastError,
  onPlaceLimitOrder,
  onCancelLimitOrder,
  onPlaceProtectiveOrder,
  onCancelProtectiveOrder,
}: {
  stock: Stock;
  currentPrice: number;
  longShares: number;
  shortShares: number;
  pendingUsed: number;
  pendingCap: number;
  limitOrders: LimitOrder[];
  conditionalOrders: ConditionalOrder[];
  lastError: string | null;
  onPlaceLimitOrder: (stockId: string, type: 'buy' | 'sell', shares: number, targetPrice: number) => void;
  onCancelLimitOrder: (orderId: string) => void;
  onPlaceProtectiveOrder: (stockId: string, type: ConditionalOrder['type'], shares: number, triggerPrice: number) => void;
  onCancelProtectiveOrder: (orderId: string) => void;
}) {
  const [limitType, setLimitType] = useState<'buy' | 'sell'>('buy');
  const [limitShares, setLimitShares] = useState('1');
  const [limitPrice, setLimitPrice] = useState(currentPrice.toFixed(2));
  const [protectiveType, setProtectiveType] = useState<ConditionalOrder['type']>('stop_loss');
  const [protectiveShares, setProtectiveShares] = useState('1');
  const [protectivePrice, setProtectivePrice] = useState((currentPrice * 0.92).toFixed(2));
  const [localError, setLocalError] = useState('');

  const stockLimitOrders = limitOrders.filter((order) => order.stockId === stock.id);
  const stockConditionalOrders = conditionalOrders.filter((order) => order.stockId === stock.id);
  const limitKind = limitType === 'buy' ? 'limit_buy' : 'limit_sell';
  const limitLanguage = getOrderLanguage(limitKind);
  const protectiveLanguage = getOrderLanguage(protectiveType);
  const protectiveIsShort = isShortProtectiveType(protectiveType);
  const protectiveAvailableShares = protectiveIsShort ? shortShares : longShares;

  const submitLimitOrder = () => {
    const shares = parsePositiveWhole(limitShares);
    const targetPrice = parsePositiveCurrency(limitPrice);
    if (!shares || !targetPrice) {
      setLocalError('Enter a positive whole-share amount and target price.');
      return;
    }
    if (limitType === 'sell' && shares > longShares) {
      setLocalError(`Only ${longShares} long shares are available to sell.`);
      return;
    }
    setLocalError('');
    onPlaceLimitOrder(stock.id, limitType, shares, targetPrice);
  };

  const submitProtectiveOrder = () => {
    const shares = parsePositiveWhole(protectiveShares);
    const triggerPrice = parsePositiveCurrency(protectivePrice);
    if (!shares || !triggerPrice) {
      setLocalError('Enter a positive whole-share amount and trigger price.');
      return;
    }
    if (protectiveAvailableShares <= 0) {
      setLocalError(protectiveIsShort ? 'Short protective orders need an active Bet Down position.' : 'Protective orders need an active long position.');
      return;
    }
    if (shares > protectiveAvailableShares) {
      setLocalError(`Only ${protectiveAvailableShares} ${protectiveIsShort ? 'Bet Down' : 'long'} shares are available to protect.`);
      return;
    }
    setLocalError('');
    onPlaceProtectiveOrder(stock.id, protectiveType, shares, triggerPrice);
  };

  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-[var(--neutral-amber)]" />
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Plan Ahead</h2>
            <p className="text-[10px] text-[var(--text-muted)]">{pendingUsed} of {pendingCap} automatic plan slots in use.</p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wide">
          {stockLimitOrders.length + stockConditionalOrders.length} on {stock.ticker}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Buy or Sell Later</h3>
            <div className="flex gap-1">
              <button type="button" onClick={() => setLimitType('buy')} className={`px-2.5 py-1 rounded text-[10px] font-semibold ${buttonClass(limitType === 'buy', 'green')}`}>{getOrderLanguage('limit_buy').label}</button>
              <button type="button" onClick={() => setLimitType('sell')} className={`px-2.5 py-1 rounded text-[10px] font-semibold ${buttonClass(limitType === 'sell', 'red')}`}>{getOrderLanguage('limit_sell').label}</button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mb-3">{limitLanguage.description}</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="text-xs text-[var(--text-muted)]">
              Shares
              <input
                type="number"
                min="1"
                step="1"
                value={limitShares}
                onChange={(event) => setLimitShares(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--info-blue)]"
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              {limitType === 'buy' ? 'Buy at or below' : 'Sell at or above'}
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={limitPrice}
                onChange={(event) => setLimitPrice(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--info-blue)]"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={submitLimitOrder}
            className="w-full rounded-xl bg-[var(--surface-0)] border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--border-hover)]"
          >
            Place {limitLanguage.label}
          </button>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[var(--neutral-amber)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Protect a Position</h3>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => {
                  setProtectiveType('stop_loss');
                  setProtectivePrice((currentPrice * 0.92).toFixed(2));
                }}
                className={`px-2 py-1 rounded text-[10px] font-semibold ${buttonClass(protectiveType === 'stop_loss', 'red')}`}
              >
                {getOrderLanguage('stop_loss').shortLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProtectiveType('take_profit');
                  setProtectivePrice((currentPrice * 1.08).toFixed(2));
                }}
                className={`px-2 py-1 rounded text-[10px] font-semibold ${buttonClass(protectiveType === 'take_profit', 'blue')}`}
              >
                {getOrderLanguage('take_profit').shortLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProtectiveType('short_stop_loss');
                  setProtectivePrice((currentPrice * 1.08).toFixed(2));
                }}
                className={`px-2 py-1 rounded text-[10px] font-semibold ${buttonClass(protectiveType === 'short_stop_loss', 'red')}`}
              >
                {getOrderLanguage('short_stop_loss').shortLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProtectiveType('short_take_profit');
                  setProtectivePrice((currentPrice * 0.92).toFixed(2));
                }}
                className={`px-2 py-1 rounded text-[10px] font-semibold ${buttonClass(protectiveType === 'short_take_profit', 'blue')}`}
              >
                {getOrderLanguage('short_take_profit').shortLabel}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mb-3">{protectiveLanguage.description}</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="text-xs text-[var(--text-muted)]">
              Shares
              <input
                type="number"
                min="1"
                step="1"
                value={protectiveShares}
                onChange={(event) => setProtectiveShares(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--info-blue)]"
              />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              {triggerLabel(protectiveType)}
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={protectivePrice}
                onChange={(event) => setProtectivePrice(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--info-blue)]"
              />
            </label>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mb-3">
            You currently hold {longShares} long and {shortShares} Bet Down share{shortShares === 1 ? '' : 's'}.
          </p>
          <button
            type="button"
            onClick={submitProtectiveOrder}
            className="w-full rounded-xl bg-[var(--surface-0)] border border-[var(--border)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--border-hover)]"
          >
            Place {protectiveLanguage.label}
          </button>
        </div>
      </div>

      {(localError || lastError) && (
        <p className="text-xs text-[var(--loss-red)] mb-3">{localError || lastError}</p>
      )}

      {stockLimitOrders.length + stockConditionalOrders.length > 0 ? (
        <div className="space-y-2">
          {[...stockLimitOrders, ...stockConditionalOrders].map((order) => {
            const isLimitOrder = 'targetPrice' in order;
            const orderLanguage = getOrderLanguage(isLimitOrder ? getLimitOrderKind(order.type) : order.type);
            const badgeText = orderLanguage.shortLabel.toUpperCase();
            const badgeTone = isLimitOrder
              ? order.type === 'buy'
                ? 'bg-[rgba(34,197,94,0.14)] text-[var(--profit-green)]'
                : 'bg-[rgba(239,68,68,0.14)] text-[var(--loss-red)]'
              : protectiveTone(order.type) === 'red'
              ? 'bg-[rgba(239,68,68,0.14)] text-[var(--loss-red)]'
              : 'bg-[rgba(59,130,246,0.14)] text-[var(--info-blue)]';
            const price = isLimitOrder ? order.targetPrice : order.triggerPrice;
            return (
              <div key={order.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeTone}`}>{badgeText}</span>
                      <span className="text-xs text-[var(--text-muted)]">{order.shares} shares</span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] mt-1">{orderLanguage.label} ${price.toFixed(2)}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">Placed on turn {order.placedTurn}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => isLimitOrder ? onCancelLimitOrder(order.id) : onCancelProtectiveOrder(order.id)}
                    className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-muted)] flex items-center justify-center hover:text-[var(--loss-red)] hover:border-[rgba(239,68,68,0.35)]"
                    aria-label={`Cancel order ${badgeText}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-sm text-[var(--text-muted)]">No planned orders on {stock.ticker} yet.</p>
        </div>
      )}
    </div>
  );
}
