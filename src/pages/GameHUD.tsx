import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Zap, AlertTriangle, BarChart3, Target, Clock } from 'lucide-react';
import { getNetWorth } from '../engine/marketSimulator';
import { getAlphaPct, getMarketReturnPct, getPlayerReturnPct } from '../engine/marketIndex';
import { getLatestRisk } from '../engine/riskSystem';
import { SECTOR_LABELS } from '../engine/config';
import type { GameState } from '../engine/types';
import { getMarketBreadthSummary, getUpcomingCatalysts, getWatchlistAlerts } from '../engine/marketInsights';
import { getScannerSignals } from '../engine/scannerSystem';
import { getMissionProgressLabel, getMissionProgressPercent, getMissionTargetLabel } from '../utils/missionFormatting';
import { getRegimeHeadwindSectors, getRegimeTailwindSectors } from '../utils/regimeUi';
import WatchlistAlertsCard from '../components/market/WatchlistAlertsCard';
import UpcomingCatalystsCard from '../components/market/UpcomingCatalystsCard';
import MarketPulseCard from '../components/market/MarketPulseCard';
import MacroBackdropCard from '../components/market/MacroBackdropCard';
import ScannerSignalsCard from '../components/market/ScannerSignalsCard';

function pct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function riskTextClass(level: string) {
  if (level === 'low') return 'text-[var(--profit-green)]';
  if (level === 'medium') return 'text-[var(--neutral-amber)]';
  if (level === 'high') return 'text-[var(--loss-red)]';
  return 'text-[var(--loss-red)]';
}

function riskBorderClass(level: string) {
  if (level === 'low') return 'border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.05)]';
  if (level === 'medium') return 'border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.05)]';
  return 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)]';
}

function countPlayerTrades(gameState: GameState): number {
  return gameState.transactionHistory.filter(t => t.type === 'buy' || t.type === 'sell' || t.type === 'short' || t.type === 'cover').length;
}

export default function GameHUD() {
  const { gameState, navigateTo } = useGame();
    if (!gameState) return null;

  const netWorth = getNetWorth(gameState);
    const goalAmount = gameState.difficulty === 'easy' ? 150000 : gameState.difficulty === 'normal' ? 125000 : gameState.difficulty === 'hard' ? 100000 : 100000;
  const progress = Math.min(100, (netWorth / goalAmount) * 100);

  const prevSnap = gameState.netWorthHistory.length > 1 ? gameState.netWorthHistory[gameState.netWorthHistory.length - 2] : null;
  const nwChange = prevSnap ? netWorth - prevSnap.netWorth : 0;

  const latestIndex = gameState.marketIndexHistory.length > 0 ? gameState.marketIndexHistory[gameState.marketIndexHistory.length - 1] : { turn: 0, value: 1000, changePct: 0 };
  const marketReturn = getMarketReturnPct(gameState);
  const playerReturn = getPlayerReturnPct(gameState);
  const alpha = getAlphaPct(gameState);
  const marketPulse = getMarketBreadthSummary(gameState);
  const upcomingCatalysts = getUpcomingCatalysts(gameState, 4);
  const watchlistAlerts = getWatchlistAlerts(gameState, 4);
  const scannerSignals = getScannerSignals(gameState, 4);
  const risk = getLatestRisk(gameState);
  const mission = gameState.activeMission;
  const regime = gameState.currentRegime;
  const positiveSectors = getRegimeTailwindSectors(regime).slice(0, 3);
  const negativeSectors = getRegimeHeadwindSectors(regime).slice(0, 3);
  const totalTrades = countPlayerTrades(gameState);

  const marginUsed = gameState.marginUsed;
  const marginMax = netWorth * 0.5;
  const marginLevel = marginMax > 0 ? (marginUsed / marginMax) * 100 : 0;

  const latestNews = gameState.newsHistory.filter(n => n.turn === gameState.currentTurn);

  const movers = [...gameState.stocks].map(s => {
    const prev = s.priceHistory.length > 1 ? s.priceHistory[s.priceHistory.length - 2].price : s.currentPrice;
    return { ...s, change: ((s.currentPrice - prev) / prev) * 100 };
  }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 4);

  const openStock = (stockId: string) => {
    localStorage.setItem('mm_selected', stockId);
    navigateTo('stock-detail');
  };

  return (
    <div className="min-h-[100dvh] p-4 max-w-2xl mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            {gameState.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} — Month {gameState.currentTurn}
          </span>
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            {gameState.difficulty === 'easy' ? 'EASY' : gameState.difficulty === 'normal' ? 'NORMAL' : gameState.difficulty === 'hard' ? 'HARD' : 'EXPERT'}
          </span>
        </div>

        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Net Worth</span>
            <div className={`flex items-center gap-1 text-xs ${nwChange >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
              {nwChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {nwChange >= 0 ? '+' : ''}\${nwChange.toFixed(2)}
            </div>
          </div>
          <span className="text-3xl font-mono-data font-bold text-[var(--text-primary)]">\${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
              <span>Goal Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: progress >= 100 ? '#22C55E' : progress >= 70 ? '#3B82F6' : progress >= 40 ? '#F59E0B' : '#6B7280' }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-3 text-center">
            <DollarSign className="w-4 h-4 text-[var(--neutral-amber)] mx-auto mb-1" />
            <span className="text-[10px] text-[var(--text-muted)] block">Cash</span>
            <span className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">\${gameState.cash.toLocaleString()}</span>
          </div>
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-3 text-center">
            <PieChart className="w-4 h-4 text-[var(--info-blue)] mx-auto mb-1" />
            <span className="text-[10px] text-[var(--text-muted)] block">Holdings</span>
            <span className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">{Object.values(gameState.portfolio).filter(p => p.shares > 0).length + Object.values(gameState.shortPositions).filter(p => p.shares > 0).length}</span>
          </div>
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-3 text-center">
            <Target className="w-4 h-4 text-[var(--profit-green)] mx-auto mb-1" />
            <span className="text-[10px] text-[var(--text-muted)] block">Turns Left</span>
            <span className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">{Math.max(0, (gameState.difficulty === 'easy' ? 120 : gameState.difficulty === 'normal' ? 100 : gameState.difficulty === 'hard' ? 80 : 60) - gameState.currentTurn)}</span>
          </div>
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-3 text-center">
            <BarChart3 className="w-4 h-4 text-[var(--purple)] mx-auto mb-1" />
            <span className="text-[10px] text-[var(--text-muted)] block">Trades</span>
            <span className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">{totalTrades}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-3">
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Current Mission</h3>
              {mission && <span className="text-[10px] text-[var(--neutral-amber)]">Reward \${mission.rewardCash.toLocaleString()}</span>}
            </div>
            {mission ? (
              <>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{mission.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{mission.description}</p>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-[var(--text-secondary)]">{getMissionProgressLabel(mission)}</span>
                  <span className="font-mono-data text-[var(--text-primary)]">{getMissionTargetLabel(mission)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--surface-2)] mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--profit-green)]" style={{ width: `${getMissionProgressPercent(mission)}%` }} />
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-2">Turns left: {Math.max(0, mission.endTurn - gameState.currentTurn)}</div>
              </>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No active mission yet. Advance one turn to receive one.</p>
            )}
          </div>

          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Benchmark</h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><span className="text-[10px] text-[var(--text-muted)] block">Index</span><span className="text-sm font-mono-data text-[var(--text-primary)]">{latestIndex.value.toFixed(0)}</span></div>
              <div><span className="text-[10px] text-[var(--text-muted)] block">Market</span><span className="text-sm font-mono-data text-[var(--text-primary)]">{pct(marketReturn)}</span></div>
              <div><span className="text-[10px] text-[var(--text-muted)] block">You</span><span className="text-sm font-mono-data text-[var(--text-primary)]">{pct(playerReturn)}</span></div>
              <div><span className="text-[10px] text-[var(--text-muted)] block">Alpha</span><span className={`text-sm font-mono-data font-semibold ${alpha >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>{pct(alpha)}</span></div>
            </div>
          </div>

          <MacroBackdropCard macro={gameState.macroEnvironment} />

          <MarketPulseCard summary={marketPulse} />

          <ScannerSignalsCard signals={scannerSignals} onOpenStock={openStock} />

          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Current Regime</h3>
              <span className="text-[10px] text-[var(--text-muted)]">{regime ? `${regime.remainingTurns} turns left` : 'Neutral'}</span>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{regime?.title || 'Neutral Market'}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{regime?.description || 'No dominant macro force. Stock selection matters more than broad regime bets.'}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-lg bg-[var(--surface-1)] p-2"><span className="text-[10px] text-[var(--profit-green)] uppercase tracking-wider">Tailwinds</span><p className="text-xs text-[var(--text-secondary)] mt-1">{positiveSectors.length ? positiveSectors.map(sector => SECTOR_LABELS[sector] || sector).join(', ') : 'None'}</p></div>
              <div className="rounded-lg bg-[var(--surface-1)] p-2"><span className="text-[10px] text-[var(--loss-red)] uppercase tracking-wider">Headwinds</span><p className="text-xs text-[var(--text-secondary)] mt-1">{negativeSectors.length ? negativeSectors.map(sector => SECTOR_LABELS[sector] || sector).join(', ') : 'None'}</p></div>
            </div>
          </div>

          <WatchlistAlertsCard alerts={watchlistAlerts} stocks={gameState.stocks} onOpenStock={openStock} />

          <UpcomingCatalystsCard catalysts={upcomingCatalysts} stocks={gameState.stocks} currentTurn={gameState.currentTurn} onOpenStock={openStock} />

          <div className={`border rounded-2xl p-4 ${riskBorderClass(risk.level)}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Risk Meter</h3>
              <span className={`text-xs font-semibold uppercase ${riskTextClass(risk.level)}`}>{risk.level} · {risk.totalScore}/100</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden mb-3">
              <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, risk.totalScore))}%`, background: risk.level === 'low' ? '#22C55E' : risk.level === 'medium' ? '#F59E0B' : '#EF4444' }} />
            </div>
            {risk.warnings.length > 0 ? <div className="space-y-1">{risk.warnings.slice(0, 3).map(warning => <p key={warning} className="text-xs text-[var(--text-secondary)]">• {warning}</p>)}</div> : <p className="text-xs text-[var(--text-muted)]">No major risk warnings.</p>}
          </div>
        </div>

        {marginUsed > 0 && (
          <div className={`rounded-xl p-3 mb-3 border ${marginLevel > 70 ? 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]' : 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${marginLevel > 70 ? 'text-[var(--loss-red)]' : 'text-[var(--neutral-amber)]'}`} />
              <span className={`text-xs font-semibold ${marginLevel > 70 ? 'text-[var(--loss-red)]' : 'text-[var(--neutral-amber)]'}`}>Margin Active</span>
            </div>
            <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>\${marginUsed.toFixed(2)} reserved</span><span>{marginLevel.toFixed(0)}% of limit</span></div>
            <div className="w-full h-1 rounded-full bg-[var(--surface-2)] mt-1"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, marginLevel)}%`, background: marginLevel > 70 ? '#EF4444' : '#F59E0B' }} /></div>
          </div>
        )}

        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3"><h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Top Movers</h3><button onClick={() => navigateTo('stock-market')} className="text-[10px] text-[var(--profit-green)] hover:underline">View All</button></div>
          <div className="grid grid-cols-2 gap-2">
            {movers.map(s => (
              <button key={s.id} onClick={() => openStock(s.id)} className="bg-[var(--surface-1)] rounded-lg p-2.5 text-left hover:bg-[var(--surface-2)] transition-all border border-transparent hover:border-[var(--border)]">
                <div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold text-[var(--text-primary)]">{s.ticker}</span><span className={`text-[10px] font-mono-data ${s.change >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>{s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%</span></div>
                <span className="text-[10px] text-[var(--text-muted)]">\${s.currentPrice.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>

        {latestNews.length > 0 && (
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Breaking News</h3>
            {latestNews.map(n => (
              <div key={n.id} className={`p-2.5 rounded-lg border text-xs mb-2 last:mb-0 ${n.impact === 'positive' ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)]' : n.impact === 'negative' ? 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)]' : 'border-[var(--border)] bg-[var(--surface-1)]'}`}>
                <p className="text-[var(--text-primary)] font-medium">{n.headline}</p><p className="text-[var(--text-muted)] mt-1 line-clamp-2">{n.description}</p>
              </div>
            ))}
          </div>
        )}

        {gameState.transactionHistory.filter(t => t.type === 'split' && t.turn === gameState.currentTurn).length > 0 && (
          <div className="bg-[var(--surface-0)] border border-[rgba(14,165,233,0.3)] rounded-2xl p-4 mt-3">
            <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-[var(--info-blue)]" /><h3 className="text-xs font-semibold text-[var(--info-blue)] uppercase tracking-wider">Stock Splits This Turn</h3></div>
            {gameState.transactionHistory.filter(t => t.type === 'split' && t.turn === gameState.currentTurn).map(t => {
              const stock = gameState.stocks.find(s => s.id === t.stockId);
              return <div key={t.id} className="flex justify-between text-xs text-[var(--text-primary)]"><span>{stock?.ticker || t.stockId}</span><span className="font-mono-data text-[var(--info-blue)]">{t.shares}x split</span></div>;
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
