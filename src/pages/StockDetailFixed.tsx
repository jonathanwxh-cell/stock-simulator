import { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { ArrowLeft, CheckCircle, Shield, TrendingDown, TrendingUp, X } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { calcBrokerFee, DIFFICULTY_CONFIGS, SECTOR_COLORS, SECTOR_LABELS } from '../engine/config';
import { getTradeFeedback, tradeFeedbackFormat, type FeedbackTone, type TradeAction, type TradeFeedback } from '../engine/tradeFeedback';

type TradeType = TradeAction;

function toneClass(tone?: FeedbackTone) {
  if (tone === 'positive') return 'text-[var(--profit-green)]';
  if (tone === 'warning') return 'text-[var(--neutral-amber)]';
  if (tone === 'danger') return 'text-[var(--loss-red)]';
  return 'text-[var(--text-primary)]';
}

function FeedbackDetails({ feedback, compact = false }: { feedback: TradeFeedback; compact?: boolean }) {
  const details = compact ? feedback.details.slice(-2) : feedback.details;
  return (
    <div className="space-y-1.5">
      {details.map(detail => (
        <div key={`${detail.label}-${detail.value}`} className="flex justify-between gap-3 text-xs">
          <span className="text-[var(--text-muted)]">{detail.label}</span>
          <span className={`font-mono-data text-right ${toneClass(detail.tone)}`}>{detail.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function StockDetailFixed() {
  const { gameState, navigateTo, buyStock, sellStock, shortStock, coverStock, lastError, clearError } = useGame();
  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [shares, setShares] = useState(1);
  const [localError, setLocalError] = useState('');
  const [chartRange, setChartRange] = useState(30);
  const [lastFeedback, setLastFeedback] = useState<TradeFeedback | null>(null);

  if (!gameState) return null;

  const stockId = localStorage.getItem('mm_selected') || gameState.stocks[0]?.id;
  const stock = gameState.stocks.find(s => s.id === stockId);
  if (!stock) return null;

  const longPosition = gameState.portfolio[stockId];
  const shortPosition = gameState.shortPositions[stockId];
  const longShares = longPosition?.shares ?? 0;
  const shortShares = shortPosition?.shares ?? 0;
  const config = DIFFICULTY_CONFIGS[gameState.difficulty];

  const previous = stock.priceHistory.length > 1 ? stock.priceHistory[stock.priceHistory.length - 2] : stock.priceHistory[0];
  const change = previous ? ((stock.currentPrice - previous.price) / previous.price) * 100 : 0;
  const chartData = stock.priceHistory.slice(-chartRange).map(p => ({ turn: p.turn, price: Math.round(p.price * 100) / 100 }));
  const prices = chartData.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const domainPad = Math.max((maxPrice - minPrice) * 0.15, 1);

  const tradeValue = stock.currentPrice * shares;
  const fee = calcBrokerFee(tradeValue, config);
  const shortMargin = tradeValue * config.shortMarginRequirement;
  const shortCashNeeded = shortMargin + fee;
  const coverShares = Math.min(shares, shortShares || shares);
  const coverMarginRelease = shortPosition ? (shortPosition.marginUsed / shortPosition.shares) * coverShares : 0;
  const coverPnl = shortPosition ? (shortPosition.entryPrice - stock.currentPrice) * coverShares : 0;
  const coverCashAfter = gameState.cash + coverMarginRelease + coverPnl - fee;
  const neededForBuy = tradeValue + fee;
  const availableCash = gameState.cash;

  const tradePreview = useMemo(() => getTradeFeedback(gameState, stockId, shares, tradeType), [gameState, stockId, shares, tradeType]);

  const canExecute = tradeType === 'buy'
    ? gameState.cash >= neededForBuy
    : tradeType === 'sell'
    ? longShares >= shares
    : tradeType === 'short'
    ? config.shortEnabled && gameState.cash >= shortCashNeeded
    : shortShares >= shares && coverCashAfter >= 0;

  const disabledReason = useMemo(() => {
    if (canExecute) return '';
    if (tradeType === 'buy') return `Need ${tradeFeedbackFormat.money(neededForBuy)}, available ${tradeFeedbackFormat.money(availableCash)}.`;
    if (tradeType === 'sell') return longShares > 0 ? `Only ${longShares} long shares available.` : 'No long position to sell.';
    if (tradeType === 'short') return config.shortEnabled ? `Need ${tradeFeedbackFormat.money(shortCashNeeded)} cash for margin and fee.` : 'Short selling is disabled.';
    return shortShares > 0 ? `Only ${shortShares} short shares available.` : 'No short position to cover.';
  }, [availableCash, canExecute, config.shortEnabled, longShares, neededForBuy, shortCashNeeded, shortShares, tradeType]);

  const setWholeShares = (value: number) => setShares(Math.max(1, Math.floor(value) || 1));

  const setMaxShares = () => {
    if (tradeType === 'sell') setWholeShares(longShares || 1);
    else if (tradeType === 'cover') setWholeShares(shortShares || 1);
    else if (tradeType === 'short') setWholeShares(gameState.cash / (stock.currentPrice * config.shortMarginRequirement + fee));
    else setWholeShares(gameState.cash / (stock.currentPrice + fee));
  };

  const selectTrade = (next: TradeType) => {
    setTradeType(next);
    setLocalError('');
    setLastFeedback(null);
    if (next === 'sell' && longShares > 0) setShares(s => Math.min(s, longShares));
    if (next === 'cover' && shortShares > 0) setShares(s => Math.min(s, shortShares));
  };

  const execute = () => {
    clearError();
    setLocalError('');
    if (!canExecute) {
      setLocalError(disabledReason);
      return;
    }
    if (tradePreview) setLastFeedback(tradePreview);
    if (tradeType === 'buy') buyStock(stockId, shares);
    if (tradeType === 'sell') sellStock(stockId, shares);
    if (tradeType === 'short') shortStock(stockId, shares);
    if (tradeType === 'cover') coverStock(stockId, shares);
  };

  const cashImpact = tradeType === 'sell'
    ? tradeValue - fee
    : tradeType === 'short'
    ? -shortCashNeeded
    : tradeType === 'cover'
    ? coverCashAfter - gameState.cash
    : -(tradeValue + fee);

  return (
    <div className="min-h-[calc(100dvh-56px-72px)] p-4 pb-32 max-w-lg mx-auto">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('stock-market')} className="w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{stock.ticker}</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: SECTOR_COLORS[stock.sector] + '20', color: SECTOR_COLORS[stock.sector] }}>
                {SECTOR_LABELS[stock.sector] || stock.sector}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate">{stock.name}</p>
          </div>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-mono-data font-bold text-[var(--text-primary)]">${stock.currentPrice.toFixed(2)}</span>
          <span className={`text-sm font-mono-data ${change >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>

        {lastFeedback && (
          <div className="bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.25)] rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[var(--profit-green)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{lastFeedback.headline}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{lastFeedback.subheadline}</p>
                  </div>
                  <button onClick={() => setLastFeedback(null)} className="w-7 h-7 rounded-lg bg-[var(--surface-0)]/70 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-3">
                  <FeedbackDetails feedback={lastFeedback} compact />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[var(--text-muted)]">Price History</span>
            <div className="flex gap-1">
              {[10, 30, 60].map(r => (
                <button key={r} onClick={() => setChartRange(r)} className={`px-2 py-0.5 rounded text-[10px] ${chartRange === r ? 'bg-[var(--surface-2)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{r}m</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <XAxis dataKey="turn" hide />
              <YAxis hide domain={[minPrice - domainPad, maxPrice + domainPad]} />
              <Tooltip contentStyle={{ background: '#1E2230', border: '1px solid #2A3045', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => ['$' + v.toFixed(2), 'Price']} />
              <Line type="monotone" dataKey="price" stroke={change >= 0 ? '#22C55E' : '#EF4444'} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><span className="text-[var(--text-muted)] block">Volatility</span><span className="font-mono-data text-[var(--text-primary)]">{(stock.volatility * 100).toFixed(1)}%</span></div>
          <div><span className="text-[var(--text-muted)] block">Beta</span><span className="font-mono-data text-[var(--text-primary)]">{stock.beta.toFixed(2)}</span></div>
          <div><span className="text-[var(--text-muted)] block">Dividend</span><span className="font-mono-data text-[var(--text-primary)]">{(stock.dividendYield * 100).toFixed(1)}%</span></div>
        </div>

        {(longPosition || shortPosition) && (
          <div className="pt-2 border-t border-[var(--border)] text-xs space-y-1">
            {longPosition && <p className="flex items-center gap-2"><Shield className="w-3 h-3 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">Long:</span><span className="font-semibold text-[var(--profit-green)]">+{longPosition.shares} @ ${longPosition.avgCost.toFixed(2)}</span></p>}
            {shortPosition && <p className="flex items-center gap-2"><Shield className="w-3 h-3 text-[var(--text-muted)]" /><span className="text-[var(--text-muted)]">Short:</span><span className="font-semibold text-[var(--loss-red)]">-{shortPosition.shares} @ ${shortPosition.entryPrice.toFixed(2)}</span></p>}
          </div>
        )}

        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Trade {stock.ticker}</h2>
          <div className="flex gap-1 mb-3">
            {(['buy', 'sell', 'short', 'cover'] as const).map(t => (
              <button key={t} onClick={() => selectTrade(t)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tradeType === t ? t === 'buy' ? 'bg-[var(--profit-green)] text-black' : t === 'sell' ? 'bg-[var(--loss-red)] text-white' : t === 'short' ? 'bg-[var(--neutral-amber)] text-black' : 'bg-[var(--info-blue)] text-white' : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setWholeShares(shares - 10)} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] text-xs">-10</button>
            <button onClick={() => setWholeShares(shares - 1)} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)]">-</button>
            <input type="number" min="1" step="1" value={shares} onChange={e => setWholeShares(Number(e.target.value))} className="flex-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-center text-[var(--text-primary)] outline-none focus:border-[var(--profit-green)]" />
            <button onClick={() => setWholeShares(shares + 1)} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)]">+</button>
            <button onClick={() => setWholeShares(shares + 10)} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] text-xs">+10</button>
          </div>

          <div className="flex gap-1 mb-3">
            {[10, 25, 50, 100].map(n => <button key={n} onClick={() => setWholeShares(n)} className={`flex-1 py-1 rounded text-[10px] ${shares === n ? 'bg-[var(--surface-2)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] bg-[var(--surface-0)]'}`}>{n}</button>)}
            <button onClick={setMaxShares} className="flex-1 py-1 rounded text-[10px] font-medium text-[var(--neutral-amber)] bg-[var(--neutral-amber)]/10">MAX</button>
          </div>

          <div className="bg-[var(--surface-1)] rounded-lg p-3 mb-3 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Est. Value</span><span className="font-mono-data text-[var(--text-primary)]">${tradeValue.toFixed(2)}</span></div>
            {tradeType === 'short' && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Margin Required</span><span className="font-mono-data text-[var(--text-secondary)]">${shortMargin.toFixed(2)}</span></div>}
            {tradeType === 'cover' && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Margin Released</span><span className="font-mono-data text-[var(--text-secondary)]">${coverMarginRelease.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Fee</span><span className="font-mono-data text-[var(--text-secondary)]">${fee.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-[var(--border)] pt-1.5"><span className="text-[var(--text-primary)] font-medium">Cash Impact</span><span className="font-mono-data font-bold text-[var(--text-primary)]">{cashImpact >= 0 ? '+' : '-'}${Math.abs(cashImpact).toFixed(2)}</span></div>
          </div>

          <div className={`rounded-xl p-3 mb-3 border ${tradePreview ? 'bg-[rgba(59,130,246,0.06)] border-[rgba(59,130,246,0.18)]' : 'bg-[var(--surface-1)] border-[var(--border)]'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Trade Preview</span>
              <span className="text-[10px] text-[var(--text-muted)]">Before execution</span>
            </div>
            {tradePreview ? (
              <>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{tradePreview.headline.replace(/^(Bought|Sold|Shorted|Covered)/, tradeType === 'buy' ? 'Buy' : tradeType === 'sell' ? 'Sell' : tradeType === 'short' ? 'Short' : 'Cover')}</p>
                <p className="text-xs text-[var(--text-muted)] mb-3">{tradePreview.subheadline}</p>
                <FeedbackDetails feedback={tradePreview} />
              </>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">{disabledReason || 'Enter a valid whole-share amount to preview this trade.'}</p>
            )}
          </div>

          {(localError || lastError) && <p className="text-xs text-[var(--loss-red)] mb-2">{localError || lastError}</p>}
          <button onClick={execute} disabled={!canExecute} title={!canExecute ? disabledReason : undefined} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${canExecute ? tradeType === 'buy' ? 'bg-[var(--profit-green)] text-black hover:brightness-110' : tradeType === 'sell' ? 'bg-[var(--loss-red)] text-white hover:brightness-110' : tradeType === 'short' ? 'bg-[var(--neutral-amber)] text-black hover:brightness-110' : 'bg-[var(--info-blue)] text-white hover:brightness-110' : 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed opacity-75'}`}>
            {canExecute ? `${tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} ${shares} ${stock.ticker}` : disabledReason}
          </button>
        </div>
      </div>
    </div>
  );
}
