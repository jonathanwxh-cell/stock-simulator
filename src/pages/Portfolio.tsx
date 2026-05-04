import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, BarChart3, AlertTriangle } from 'lucide-react';
import { SECTOR_COLORS, SECTOR_LABELS } from '../engine/config';
import { getPortfolioValue, getNetWorth, getShortLiability } from '../engine/marketSimulator';
import { getAlphaPct, getMarketReturnPct, getPlayerReturnPct } from '../engine/marketIndex';
import { getLatestRisk } from '../engine/riskSystem';
import { getTransactionLanguage } from '../engine/tradeLanguage';
import type { Stock } from '../engine/types';
import PerformanceChartCard from '../components/portfolio/PerformanceChartCard';
import OpenOrdersCard from '../components/portfolio/OpenOrdersCard';
import RebalanceCard from '../components/portfolio/RebalanceCard';

function pct(value: number) { return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`; }
function money(value: number) { return `$${Math.abs(value).toFixed(2)}`; }
function riskTextClass(level: string) { if (level === 'low') return 'text-[var(--profit-green)]'; if (level === 'medium') return 'text-[var(--neutral-amber)]'; return 'text-[var(--loss-red)]'; }
function scoreBarColor(level: string) { if (level === 'low') return '#22C55E'; if (level === 'medium') return '#F59E0B'; return '#EF4444'; }

type HoldingRow =
  | { kind: 'long'; stockId: string; stock: Stock; shares: number; basis: number; value: number; pnl: number; pnlPct: number }
  | { kind: 'short'; stockId: string; stock: Stock; shares: number; basis: number; value: number; pnl: number; pnlPct: number };

export default function Portfolio() {
  const { gameState, navigateTo, cancelOrder, cancelProtectiveOrder, executeRebalance } = useGame();
  if (!gameState) return null;

  const portfolioValue = getPortfolioValue(gameState);
  const shortLiability = getShortLiability(gameState);
  const grossExposure = portfolioValue + shortLiability;
  const netWorth = getNetWorth(gameState);
  const latestIndex = gameState.marketIndexHistory.length > 0 ? gameState.marketIndexHistory[gameState.marketIndexHistory.length - 1] : { turn: 0, value: 1000, changePct: 0 };
  const playerReturn = getPlayerReturnPct(gameState);
  const marketReturn = getMarketReturnPct(gameState);
  const alpha = getAlphaPct(gameState);
  const risk = getLatestRisk(gameState);

  const holdings: HoldingRow[] = [];
  for (const [stockId, pos] of Object.entries(gameState.portfolio)) {
    if (pos.shares <= 0) continue;
    const stock = gameState.stocks.find(s => s.id === stockId);
    if (!stock) continue;
    const value = stock.currentPrice * pos.shares;
    const pnl = (stock.currentPrice - pos.avgCost) * pos.shares;
    const pnlPct = pos.avgCost > 0 ? ((stock.currentPrice - pos.avgCost) / pos.avgCost) * 100 : 0;
    holdings.push({ kind: 'long', stockId, stock, shares: pos.shares, basis: pos.avgCost, value, pnl, pnlPct });
  }
  for (const [stockId, pos] of Object.entries(gameState.shortPositions)) {
    if (pos.shares <= 0) continue;
    const stock = gameState.stocks.find(s => s.id === stockId);
    if (!stock) continue;
    const value = stock.currentPrice * pos.shares;
    const pnl = (pos.entryPrice - stock.currentPrice) * pos.shares;
    const pnlPct = pos.entryPrice > 0 ? ((pos.entryPrice - stock.currentPrice) / pos.entryPrice) * 100 : 0;
    holdings.push({ kind: 'short', stockId, stock, shares: pos.shares, basis: pos.entryPrice, value, pnl, pnlPct });
  }

  const sectorBreakdown: Record<string, number> = {};
  for (const holding of holdings) sectorBreakdown[holding.stock.sector] = (sectorBreakdown[holding.stock.sector] || 0) + holding.value;
  const totalPnL = holdings.reduce((sum, holding) => sum + holding.pnl, 0);
  const openStock = (stockId: string) => {
    localStorage.setItem('mm_selected', stockId);
    navigateTo('stock-detail');
  };

  return (
    <div className="min-h-[calc(100dvh-56px-72px)] p-4 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-display font-bold text-[var(--text-primary)] mb-4">Portfolio</h1>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4"><p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Net Worth</p><p className="text-xl font-mono-data font-bold text-[var(--text-primary)] mt-1">${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4"><p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Gross Exposure</p><p className="text-xl font-mono-data font-bold text-[var(--text-primary)] mt-1">${grossExposure.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
        </div>

        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-[var(--info-blue)]" /><h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Portfolio vs Market</h2></div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><span className="text-[10px] text-[var(--text-muted)] block">You</span><span className="text-sm font-mono-data text-[var(--text-primary)]">{pct(playerReturn)}</span></div>
            <div><span className="text-[10px] text-[var(--text-muted)] block">Market</span><span className="text-sm font-mono-data text-[var(--text-primary)]">{pct(marketReturn)}</span></div>
            <div><span className="text-[10px] text-[var(--text-muted)] block">Alpha</span><span className={`text-sm font-mono-data font-semibold ${alpha >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>{pct(alpha)}</span></div>
            <div><span className="text-[10px] text-[var(--text-muted)] block">Index</span><span className="text-sm font-mono-data text-[var(--text-primary)]">{latestIndex.value.toFixed(0)}</span></div>
          </div>
        </div>

        <PerformanceChartCard gameState={gameState} />

        <OpenOrdersCard
          gameState={gameState}
          onOpenStock={openStock}
          onCancelLimitOrder={cancelOrder}
          onCancelProtectiveOrder={cancelProtectiveOrder}
        />

        <RebalanceCard
          gameState={gameState}
          onExecute={executeRebalance}
        />

        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[var(--neutral-amber)]" /><h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Risk Breakdown</h2></div><span className={`text-xs font-semibold uppercase ${riskTextClass(risk.level)}`}>{risk.level} · {risk.totalScore}/100</span></div>
          <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden mb-3"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, risk.totalScore))}%`, background: scoreBarColor(risk.level) }} /></div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-[var(--surface-1)] rounded-lg p-2 flex justify-between"><span className="text-[var(--text-muted)]">Concentration</span><span className="font-mono-data text-[var(--text-primary)]">{risk.concentrationScore}</span></div>
            <div className="bg-[var(--surface-1)] rounded-lg p-2 flex justify-between"><span className="text-[var(--text-muted)]">Sector</span><span className="font-mono-data text-[var(--text-primary)]">{risk.sectorScore}</span></div>
            <div className="bg-[var(--surface-1)] rounded-lg p-2 flex justify-between"><span className="text-[var(--text-muted)]">Cash Buffer</span><span className="font-mono-data text-[var(--text-primary)]">{risk.cashBufferScore}</span></div>
            <div className="bg-[var(--surface-1)] rounded-lg p-2 flex justify-between"><span className="text-[var(--text-muted)]">Shorts</span><span className="font-mono-data text-[var(--text-primary)]">{risk.shortExposureScore}</span></div>
            <div className="bg-[var(--surface-1)] rounded-lg p-2 flex justify-between col-span-2"><span className="text-[var(--text-muted)]">Drawdown</span><span className="font-mono-data text-[var(--text-primary)]">{risk.drawdownScore}</span></div>
          </div>
          {risk.warnings.length > 0 ? <div className="space-y-1">{risk.warnings.map(warning => <p key={warning} className="text-xs text-[var(--text-secondary)]">• {warning}</p>)}</div> : <p className="text-xs text-[var(--text-muted)]">No major risk warnings.</p>}
        </div>

        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between"><p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total P&L</p><div className={`flex items-center gap-1 ${totalPnL >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>{totalPnL >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}<span className="font-mono-data font-semibold">{totalPnL >= 0 ? '+' : '-'}{money(totalPnL)}</span></div></div>
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--surface-2)] mt-3">{Object.entries(sectorBreakdown).map(([sector, val]) => <div key={sector} style={{ width: `${grossExposure > 0 ? (val / grossExposure) * 100 : 0}%`, backgroundColor: SECTOR_COLORS[sector] || '#888' }} />)}{grossExposure === 0 && <div className="flex-1 bg-[var(--surface-2)]" />}</div>
          <div className="flex flex-wrap gap-2 mt-2">{Object.entries(sectorBreakdown).map(([sector]) => <span key={sector} className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTOR_COLORS[sector] || '#888' }} />{SECTOR_LABELS[sector] || sector}</span>)}</div>
        </div>

        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Holdings ({holdings.length})</h2>
        {holdings.length === 0 ? (
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-8 text-center"><p className="text-[var(--text-muted)]">No holdings yet. Visit the Market to Buy Now or open a Bet Down position.</p></div>
        ) : (
          <div className="space-y-2">
            {holdings.map(holding => (
              <motion.button key={`${holding.kind}-${holding.stockId}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} onClick={() => openStock(holding.stockId)} className="w-full bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4 text-left hover:border-[var(--border-hover)] transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2"><span className="font-semibold text-[var(--text-primary)]">{holding.stock.ticker}</span><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${holding.kind === 'long' ? 'bg-[rgba(34,197,94,0.15)] text-[var(--profit-green)]' : 'bg-[rgba(239,68,68,0.15)] text-[var(--loss-red)]'}`}>{holding.kind === 'long' ? 'OWNED' : 'BET DOWN'}</span><span className="text-xs text-[var(--text-muted)]">{holding.shares} shares</span></div>
                    <span className="text-xs text-[var(--text-muted)]">{holding.kind === 'long' ? 'Avg' : 'Entry'}: ${holding.basis.toFixed(2)}</span>
                  </div>
                  <div className="text-right"><p className="font-mono-data font-semibold text-[var(--text-primary)]">${holding.value.toFixed(2)}</p><p className={`text-xs font-mono-data ${holding.pnl >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>{holding.pnl >= 0 ? '+' : ''}{holding.pnl.toFixed(2)} ({holding.pnlPct >= 0 ? '+' : ''}{holding.pnlPct.toFixed(1)}%)</p></div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {gameState.transactionHistory.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Recent Trades</h2>
            <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
              {gameState.transactionHistory.slice(-5).reverse().map(txn => {
                const stock = gameState.stocks.find(s => s.id === txn.stockId);
                const label = getTransactionLanguage(txn.type);
                const positive = txn.type === 'buy' || txn.type === 'cover' || txn.type === 'limit_buy' || txn.type === 'dividend' || txn.type === 'mission_reward';
                return (
                  <div key={txn.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${positive ? 'bg-[rgba(34,197,94,0.15)] text-[var(--profit-green)]' : 'bg-[rgba(239,68,68,0.15)] text-[var(--loss-red)]'}`}>{label.shortLabel}</span>
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
    </div>
  );
}
