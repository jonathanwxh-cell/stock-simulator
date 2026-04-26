import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';

interface Props {
  stockId: string;
  onClose: () => void;
}

export default function TradingModal({ stockId, onClose }: Props) {
  const { gameState, buyStock, sellStock } = useGame();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState(1);

  if (!gameState) return null;

  const stock = gameState.stocks.find(s => s.id === stockId);
  if (!stock) return null;

  const position = gameState.portfolio[stockId];
  const maxBuy = Math.floor(gameState.cash / stock.currentPrice);
  const maxSell = position?.shares || 0;
  const total = stock.currentPrice * shares;

  const canAfford = mode === 'buy' ? total <= gameState.cash && shares > 0 : shares <= maxSell && shares > 0;

  const handleTrade = () => {
    if (!canAfford) return;
    if (mode === 'buy') buyStock(stockId, shares);
    else sellStock(stockId, shares);
    onClose();
  };

  const adjustShares = (delta: number) => {
    const max = mode === 'buy' ? maxBuy : maxSell;
    setShares(Math.max(1, Math.min(max, shares + delta)));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ backgroundColor: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          className="bg-[var(--surface-0)] border border-[var(--border)] rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm mx-4"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">Trade {stock.ticker}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Buy/Sell Toggle */}
          <div className="flex bg-[var(--surface-1)] rounded-xl p-1 mb-5">
            <button onClick={() => { setMode('buy'); setShares(1); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'buy' ? 'bg-[var(--profit-green)] text-black' : 'text-[var(--text-secondary)]'}`}>
              Buy
            </button>
            <button onClick={() => { setMode('sell'); setShares(1); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'sell' ? 'bg-[var(--loss-red)] text-white' : 'text-[var(--text-secondary)]'}`}>
              Sell
            </button>
          </div>

          {/* Price */}
          <div className="text-center mb-4">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Price per share</p>
            <p className="text-2xl font-mono-data font-bold text-[var(--text-primary)]">${stock.currentPrice.toFixed(2)}</p>
          </div>

          {/* Shares Selector */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button onClick={() => adjustShares(-1)} className="w-10 h-10 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
              <Minus className="w-4 h-4 text-[var(--text-primary)]" />
            </button>
            <div className="text-center min-w-[80px]">
              <p className="text-3xl font-mono-data font-bold text-[var(--text-primary)]">{shares}</p>
              <p className="text-xs text-[var(--text-muted)]">shares</p>
            </div>
            <button onClick={() => adjustShares(1)} className="w-10 h-10 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
              <Plus className="w-4 h-4 text-[var(--text-primary)]" />
            </button>
          </div>

          {/* Quick buttons */}
          <div className="flex gap-2 justify-center mb-5">
            {[10, 25, 50, 100].map(pct => {
              const max = mode === 'buy' ? maxBuy : maxSell;
              const val = Math.max(1, Math.floor(max * pct / 100));
              return (
                <button key={pct} onClick={() => setShares(Math.max(1, val))}
                  className="px-3 py-1.5 text-xs font-mono-data rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-all">
                  {pct}%
                </button>
              );
            })}
            <button onClick={() => setShares(mode === 'buy' ? maxBuy : maxSell)}
              className="px-3 py-1.5 text-xs font-mono-data rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-all">
              Max
            </button>
          </div>

          {/* Total */}
          <div className="bg-[var(--surface-1)] rounded-xl p-3 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Total</span>
              <span className="font-mono-data font-semibold text-[var(--text-primary)]">${total.toFixed(2)}</span>
            </div>
            {mode === 'buy' && (
              <div className="flex justify-between text-xs mt-1">
                <span className="text-[var(--text-muted)]">Cash after</span>
                <span className="font-mono-data text-[var(--text-muted)]">${(gameState.cash - total).toFixed(2)}</span>
              </div>
            )}
            {mode === 'sell' && position && (
              <div className="flex justify-between text-xs mt-1">
                <span className="text-[var(--text-muted)]">Shares after</span>
                <span className="font-mono-data text-[var(--text-muted)]">{Math.max(0, position.shares - shares)}</span>
              </div>
            )}
          </div>

          {/* Confirm */}
          <button onClick={handleTrade} disabled={!canAfford}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
              mode === 'buy' ? 'bg-[var(--profit-green)] text-black hover:brightness-110' : 'bg-[var(--loss-red)] text-white hover:brightness-110'
            }`}>
            {mode === 'buy' ? 'Buy' : 'Sell'} {shares} {stock.ticker}
          </button>

          {mode === 'sell' && !position && (
            <p className="text-xs text-center text-[var(--text-muted)] mt-2">You don't own any shares</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
