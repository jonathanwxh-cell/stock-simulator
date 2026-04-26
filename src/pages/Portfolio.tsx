import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SECTOR_COLORS, SECTOR_LABELS } from '../engine/config';
import { getPortfolioValue, getNetWorth } from '../engine/marketSimulator';
import TradingModal from './TradingModal';
import { useState } from 'react';

export default function Portfolio() {
  const { gameState, navigateTo } = useGame();
  const [tradeStock, setTradeStock] = useState<string | null>(null);

  if (!gameState) return null;

  const portfolioValue = getPortfolioValue(gameState);
  const netWorth = getNetWorth(gameState);
  const positions = Object.entries(gameState.portfolio).filter(([_, pos]) => pos.shares > 0);

  const sectorBreakdown: Record<string, number> = {};
  for (const [stockId, pos] of positions) {
    const stock = gameState.stocks.find(s => s.id === stockId);
    if (stock) {
      const val = stock.currentPrice * pos.shares;
      sectorBreakdown[stock.sector] = (sectorBreakdown[stock.sector] || 0) + val;
    }
  }

  const totalPnL = positions.reduce((sum, [stockId, pos]) => {
    const stock = gameState.stocks.find(s => s.id === stockId);
    if (!stock) return sum;
    return sum + (stock.currentPrice - pos.avgCost) * pos.shares;
  }, 0);

  return (
    <div className="min-h-[calc(100dvh-56px-72px)] p-4 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-display font-bold text-[var(--text-primary)] mb-4">Portfolio</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Net Worth</p>
            <p className="text-xl font-mono-data font-bold text-[var(--text-primary)] mt-1">${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Portfolio Value</p>
            <p className="text-xl font-mono-data font-bold text-[var(--text-primary)] mt-1">${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Total P&L */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total P&L</p>
            <div className={`flex items-center gap-1 ${totalPnL >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
              {totalPnL >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="font-mono-data font-semibold">${Math.abs(totalPnL).toFixed(2)}</span>
            </div>
          </div>
          {/* Allocation bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--surface-2)] mt-3">
            {Object.entries(sectorBreakdown).map(([sector, val]) => (
              <div key={sector} style={{ width: `${(val / portfolioValue) * 100}%`, backgroundColor: SECTOR_COLORS[sector] || '#888' }} />
            ))}
            {portfolioValue === 0 && <div className="flex-1 bg-[var(--surface-2)]" />}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(sectorBreakdown).map(([sector, _val]) => (
              <span key={sector} className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[sector] || '#888' }} />
                {SECTOR_LABELS[sector] || sector}
              </span>
            ))}
          </div>
        </div>

        {/* Positions */}
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Holdings ({positions.length})</h2>

        {positions.length === 0 ? (
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <p className="text-[var(--text-muted)]">No holdings yet. Visit the Market to buy stocks.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map(([stockId, pos]) => {
              const stock = gameState.stocks.find(s => s.id === stockId);
              if (!stock) return null;
              const value = stock.currentPrice * pos.shares;
              const pnl = (stock.currentPrice - pos.avgCost) * pos.shares;
              const pnlPct = ((stock.currentPrice - pos.avgCost) / pos.avgCost) * 100;
              return (
                <motion.button
                  key={stockId}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigateTo('stock-detail')}
                  className="w-full bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4 text-left hover:border-[var(--border-hover)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{stock.ticker}</span>
                        <span className="text-xs text-[var(--text-muted)]">{pos.shares} shares</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">Avg: ${pos.avgCost.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-data font-semibold text-[var(--text-primary)]">${value.toFixed(2)}</p>
                      <p className={`text-xs font-mono-data ${pnl >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Recent Transactions */}
        {gameState.transactionHistory.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Recent Trades</h2>
            <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
              {gameState.transactionHistory.slice(-5).reverse().map(txn => {
                const stock = gameState.stocks.find(s => s.id === txn.stockId);
                return (
                  <div key={txn.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${txn.type === 'buy' ? 'bg-[rgba(34,197,94,0.15)] text-[var(--profit-green)]' : 'bg-[rgba(239,68,68,0.15)] text-[var(--loss-red)]'}`}>
                        {txn.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-[var(--text-primary)]">{stock?.ticker || txn.stockId}</span>
                      <span className="text-xs text-[var(--text-muted)]">{txn.shares} @ ${txn.price.toFixed(2)}</span>
                    </div>
                    <span className="text-sm font-mono-data text-[var(--text-secondary)]">${txn.total.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {tradeStock && <TradingModal stockId={tradeStock} onClose={() => setTradeStock(null)} />}
    </div>
  );
}
