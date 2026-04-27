import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SECTOR_COLORS, SECTOR_LABELS, DIFFICULTY_CONFIGS, calcBrokerFee } from '../engine/config';

export default function StockDetail() {
  const { gameState, goBack, buyStock, sellStock, shortStock, coverStock, lastError, clearError } = useGame();
  if (!gameState) return null;

  const [shares, setShares] = useState(1);
  const [tradeType, setTradeType] = useState<'buy'|'sell'|'short'|'cover'>('buy');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chartRange, setChartRange] = useState(30);

  // Get selected stock from localStorage or find first
  const stockId = localStorage.getItem('mm_selected') || gameState.stocks[0]?.id;
  const stock = gameState.stocks.find(s => s.id === stockId);
  if (!stock) return null;

  const position = gameState.portfolio[stockId];
  
  const prev = stock.priceHistory.length > 1 ? stock.priceHistory[stock.priceHistory.length - 2] : stock.priceHistory[0];
  const change = prev ? ((stock.currentPrice - prev.price) / prev.price) * 100 : 0;

  // Chart data
  const history = stock.priceHistory.slice(-chartRange);
  const chartData = history.map(p => ({
    turn: p.turn,
    price: Math.round(p.price * 100) / 100,
    label: `Turn ${p.turn}`
  }));

  // Fee calculation
  const config = DIFFICULTY_CONFIGS[gameState.difficulty];
  const cost = stock.currentPrice * shares;
  const feeAmount = calcBrokerFee(cost, config);
  const totalCost = cost + feeAmount;

  const canExecute = tradeType === 'buy'
    ? gameState.cash >= totalCost
    : tradeType === 'sell'
    ? position && position.shares >= shares
    : tradeType === 'short'
    ? gameState.cash >= totalCost
    : position && position.shares < 0 && Math.abs(position.shares) >= shares;

  const handleExecute = () => {
    clearError();
    setSuccess('');
    setError('');
    if (tradeType === 'buy') buyStock(stockId, shares);
    else if (tradeType === 'sell') sellStock(stockId, shares);
    else if (tradeType === 'short') shortStock(stockId, shares);
    else coverStock(stockId, shares);
    // lastError is populated synchronously by the reducer if trade failed
    // It'll be visible on next render via the lastError display
  };

  // Colors for chart
  const chartColor = change >= 0 ? '#22C55E' : '#EF4444';
  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const domainPad = (maxPrice - minPrice) * 0.15;

  return (
    <div className="min-h-[100dvh] p-4 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{stock.ticker}</h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: SECTOR_COLORS[stock.sector] + '20', color: SECTOR_COLORS[stock.sector] }}>
                {SECTOR_LABELS[stock.sector] || stock.sector}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate">{stock.name}</p>
          </div>
        </div>

        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-2xl font-mono-data font-bold text-[var(--text-primary)]">\${stock.currentPrice.toFixed(2)}</span>
          <span className={`text-sm font-mono-data ${change >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
          {stock.splitMultiplier > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--info-blue)]/20 text-[var(--info-blue)] font-semibold">
              {stock.splitMultiplier}x SPLIT
            </span>
          )}
        </div>

        {/* Price Chart */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[var(--text-muted)]">Price History</span>
            <div className="flex gap-1">
              {[10, 30, 60].map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium ${chartRange === r ? 'bg-[var(--surface-2)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                  {r}m
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData}>
              <XAxis dataKey="turn" hide />
              <YAxis hide domain={[minPrice - domainPad, maxPrice + domainPad]} />
              <Tooltip
                contentStyle={{ background: '#1E2230', border: '1px solid #2A3045', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#8892A8' }}
                formatter={(v: number) => ['\$' + v.toFixed(2), 'Price']}
                labelFormatter={(l: string) => `Turn ${l}`}
              />
              <Line type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><span className="text-[var(--text-muted)] block">Volatility</span><span className="font-mono-data text-[var(--text-primary)]">{(stock.volatility * 100).toFixed(1)}%</span></div>
          <div><span className="text-[var(--text-muted)] block">Beta</span><span className="font-mono-data text-[var(--text-primary)]">{stock.beta.toFixed(2)}</span></div>
          <div><span className="text-[var(--text-muted)] block">Dividend</span><span className="font-mono-data text-[var(--text-primary)]">{(stock.dividendYield * 100).toFixed(1)}%</span></div>
        </div>

        {position && (
          <div className="mt-1 pt-2 border-t border-[var(--border)] text-xs flex items-center gap-2">
            <Shield className="w-3 h-3 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">Position: </span>
            <span className={`font-semibold ${position.shares < 0 ? 'text-[var(--loss-red)]' : 'text-[var(--profit-green)]'}`}>
              {position.shares > 0 ? '+' : ''}{position.shares} @ \${position.avgCost.toFixed(2)}
            </span>
          </div>
        )}

        {/* Trade Panel */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Trade {stock.ticker}</h2>

          <div className="flex gap-1 mb-3">
            {['buy', 'sell', 'short', 'cover'].map(t => (
              <button key={t} onClick={() => { setTradeType(t as any); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tradeType === t
                  ? t === 'buy' ? 'bg-[var(--profit-green)] text-black' : t === 'sell' ? 'bg-[var(--loss-red)] text-white' : t === 'short' ? 'bg-[var(--neutral-amber)] text-black' : 'bg-[var(--info-blue)] text-white'
                  : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setShares(Math.max(1, shares - 10))} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] text-xs">-10</button>
            <button onClick={() => setShares(Math.max(1, shares - 1))} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)]">-</button>
            <input type="number" value={shares} onChange={e => setShares(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-center text-[var(--text-primary)] outline-none focus:border-[var(--profit-green)]" />
            <button onClick={() => setShares(shares + 1)} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)]">+</button>
            <button onClick={() => setShares(shares + 10)} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] text-xs">+10</button>
          </div>

          <div className="flex gap-1 mb-3">
            {[10, 25, 50, 100].map(n => (
              <button key={n} onClick={() => setShares(n)}
                className={`flex-1 py-1 rounded text-[10px] font-medium ${shares === n ? 'bg-[var(--surface-2)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] bg-[var(--surface-0)]'}`}>
                {n}
              </button>
            ))}
            {(tradeType === 'buy' || tradeType === 'short') && (
              <button onClick={() => setShares(Math.floor(gameState.cash / stock.currentPrice))}
                className="flex-1 py-1 rounded text-[10px] font-medium text-[var(--neutral-amber)] bg-[var(--neutral-amber)]/10">MAX</button>
            )}
          </div>

          <div className="bg-[var(--surface-1)] rounded-lg p-3 mb-3 text-xs space-y-1.5">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Est. Value</span><span className="font-mono-data text-[var(--text-primary)]">\${cost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">Fee ({(config.brokerFeePercent * 100).toFixed(1)}%)</span><span className="font-mono-data text-[var(--text-secondary)]">\${feeAmount.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-[var(--border)] pt-1.5"><span className="text-[var(--text-primary)] font-medium">Total</span><span className="font-mono-data font-bold text-[var(--text-primary)]">\${totalCost.toFixed(2)}</span></div>
            {tradeType === 'buy' && <div className="flex justify-between"><span className="text-[var(--text-muted)]">Cash After</span><span className="font-mono-data">\${(gameState.cash - totalCost).toFixed(2)}</span></div>}
          </div>

          {(error || lastError) && <p className="text-xs text-[var(--loss-red)] mb-2">{error || lastError}</p>}
          {success && !lastError && <p className="text-xs text-[var(--profit-green)] mb-2">{success}</p>}

          <button onClick={handleExecute} disabled={!canExecute}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${canExecute
              ? tradeType === 'buy' ? 'bg-[var(--profit-green)] text-black hover:brightness-110' : tradeType === 'sell' ? 'bg-[var(--loss-red)] text-white hover:brightness-110' : tradeType === 'short' ? 'bg-[var(--neutral-amber)] text-black hover:brightness-110' : 'bg-[var(--info-blue)] text-white hover:brightness-110'
              : 'bg-[var(--surface-2)] text-[var(--text-muted)] cursor-not-allowed'}`}>
            {tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} {shares} {stock.ticker}
          </button>
        </div>

        {/* Recent News */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Recent News</h3>
          <div className="space-y-2">
            {gameState.newsHistory.filter(n => n.affectedStocks.includes(stockId)).slice(-3).reverse().map(n => (
              <div key={n.id} className={`p-2 rounded-lg border text-xs ${n.impact === 'positive' ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)]' : n.impact === 'negative' ? 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)]' : 'border-[var(--border)]'}`}>
                <p className="text-[var(--text-primary)]">{n.headline}</p>
              </div>
            ))}
            {gameState.newsHistory.filter(n => n.affectedStocks.includes(stockId)).length === 0 && (
              <p className="text-xs text-[var(--text-muted)]">No recent news affecting this stock.</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
