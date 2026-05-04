import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ArrowDownUp, Star } from 'lucide-react';
import { SECTOR_COLORS, SECTOR_LABELS } from '../engine/config';
import { getMarketBreadthSummary } from '../engine/marketInsights';
import { getTraitLabel } from '../engine/companyTraits';
import { getScannerSignals } from '../engine/scannerSystem';
import { getRegimeToneForSector } from '../utils/regimeUi';
import MarketPulseCard from '../components/market/MarketPulseCard';
import ScannerSignalsCard from '../components/market/ScannerSignalsCard';
import type { Stock } from '../engine/types';

const MARKET_CAPS = ['all', 'mega', 'large', 'mid', 'small'];
const SORT_OPTIONS = [
  { id: 'name', label: 'Name' },
  { id: 'price', label: 'Price' },
  { id: 'change', label: 'Change %' },
  { id: 'volatility', label: 'Volatility' },
  { id: 'dividend', label: 'Dividend' },
  { id: 'beta', label: 'Beta' },
  { id: 'marketCap', label: 'Market Cap' },
  { id: 'scanner', label: 'Scanner' },
];

export default function StockMarket() {
  const { gameState, navigateTo, toggleWatchlist } = useGame();
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedCap, setSelectedCap] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  if (!gameState) return null;

  const currentRegime = gameState.currentRegime;
  const marketPulse = getMarketBreadthSummary(gameState);
  const scannerSignals = getScannerSignals(gameState, 5);
  const scannerScoreByStock = new Map<string, number>();
  for (const signal of getScannerSignals(gameState, 100)) {
    scannerScoreByStock.set(signal.stockId, Math.max(scannerScoreByStock.get(signal.stockId) || 0, signal.score));
  }
  const watchedSet = new Set(gameState.watchlist || []);

  const sectorBreakdown: Record<string, number> = { all: gameState.stocks.length };
  gameState.stocks.forEach(s => { sectorBreakdown[s.sector] = (sectorBreakdown[s.sector] || 0) + 1; });

  let filtered = gameState.stocks;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }
  if (selectedSector !== 'all') filtered = filtered.filter(s => s.sector === selectedSector);
  if (selectedCap !== 'all') filtered = filtered.filter(s => s.marketCap === selectedCap);

  filtered = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name': return dir * a.name.localeCompare(b.name);
      case 'price': return dir * (b.currentPrice - a.currentPrice);
      case 'change': return dir * (getChange(b) - getChange(a));
      case 'volatility': return dir * (b.volatility - a.volatility);
      case 'dividend': return dir * (b.dividendYield - a.dividendYield);
      case 'beta': return dir * (b.beta - a.beta);
      case 'marketCap': {
        const order: Record<string, number> = { mega: 4, large: 3, mid: 2, small: 1 };
        return dir * ((order[b.marketCap] || 0) - (order[a.marketCap] || 0));
      }
      case 'scanner': return dir * ((scannerScoreByStock.get(b.id) || 0) - (scannerScoreByStock.get(a.id) || 0));
      default: return 0;
    }
  });

  function getChange(s: Stock) {
    if (s.priceHistory.length < 2) return 0;
    const prev = s.priceHistory[s.priceHistory.length - 2]?.price || s.basePrice;
    return ((s.currentPrice - prev) / prev) * 100;
  }

  const toggleSort = (id: string) => {
    if (sortBy === id) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(id); setSortDir('asc'); }
  };

  const openStock = (stockId: string) => {
    localStorage.setItem('mm_selected', stockId);
    navigateTo('stock-detail');
  };

  const capLabels: Record<string, string> = { all: 'All', mega: 'Mega', large: 'Large', mid: 'Mid', small: 'Small' };

  return (
    <div className="min-h-[calc(100dvh-56px-72px)] p-4 pb-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-4">
          <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">
            Stock Market <span className="text-sm text-[var(--text-muted)] font-normal">({filtered.length}/{gameState.stocks.length})</span>
          </h1>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-[var(--surface-0)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Regime:</span>
            <span className="font-semibold text-[var(--text-primary)]">{currentRegime?.title || 'Neutral Market'}</span>
            <span className="text-[var(--text-muted)]">· {currentRegime ? currentRegime.remainingTurns : 0} turns left</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tickers or names..."
              className="w-full bg-[var(--surface-0)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--profit-green)] transition-all outline-none" />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            aria-label={showFilters ? 'Hide stock filters' : 'Show stock filters'}
            className={`px-3 rounded-lg border transition-all ${showFilters ? 'bg-[var(--profit-green)] border-[var(--profit-green)] text-black' : 'bg-[var(--surface-0)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]'}`}>
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4">
              <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                <div>
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Sector</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', ...Object.keys(SECTOR_COLORS)].map(s => (
                      <button key={s} onClick={() => setSelectedSector(s)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${selectedSector === s ? 'bg-[var(--profit-green)] text-black' : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)]'}`}
                        style={selectedSector === s && s !== 'all' ? { backgroundColor: SECTOR_COLORS[s] } : undefined}>
                        {s === 'all' ? 'All' : (SECTOR_LABELS[s] || s)}
                        <span className="ml-1 text-[10px] opacity-60">({sectorBreakdown[s] || 0})</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Market Cap</span>
                  <div className="flex gap-1.5">
                    {MARKET_CAPS.map(c => (
                      <button key={c} onClick={() => setSelectedCap(c)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${selectedCap === c ? 'bg-[var(--profit-green)] text-black' : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)]'}`}>
                        {capLabels[c]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-4 space-y-4">
          <ScannerSignalsCard signals={scannerSignals} onOpenStock={openStock} />
          <MarketPulseCard summary={marketPulse} />
        </div>

        <div className="flex gap-1 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => toggleSort(opt.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${sortBy === opt.id ? 'bg-[var(--surface-2)] text-[var(--profit-green)] border border-[var(--profit-green)]/20' : 'bg-[var(--surface-0)] text-[var(--text-muted)] border border-[var(--border)]'}`}>
              {opt.label}
              {sortBy === opt.id && (sortDir === 'asc' ? <ArrowDownUp className="w-3 h-3 rotate-180" /> : <ArrowDownUp className="w-3 h-3" />)}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          {filtered.map((stock) => {
            const change = getChange(stock);
            const position = gameState.portfolio[stock.id];
            const shortPosition = gameState.shortPositions[stock.id];
            const regimeTone = getRegimeToneForSector(currentRegime, stock.sector);
            const isWatched = watchedSet.has(stock.id);
            return (
              <div key={stock.id} className="w-full flex items-center justify-between gap-3 p-3 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl hover:border-[var(--border-hover)] hover:bg-[var(--surface-1)] transition-all text-left">
                <button type="button" onClick={() => openStock(stock.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: SECTOR_COLORS[stock.sector] + '20', color: SECTOR_COLORS[stock.sector] }}>
                    {stock.ticker.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{stock.ticker}</span>
                      {stock.traits.slice(0, 2).map((trait) => (
                        <span key={trait} className="text-[10px] px-1 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-secondary)]">{getTraitLabel(trait)}</span>
                      ))}
                      {stock.dividendYield > 0 && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--neutral-amber)]/15 text-[var(--neutral-amber)]">DIV</span>}
                      {isWatched && <span className="text-[10px] px-1 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[var(--info-blue)]">WATCH</span>}
                      {position && position.shares > 0 && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--profit-green)]/15 text-[var(--profit-green)]">HOLD</span>}
                      {shortPosition && shortPosition.shares > 0 && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--loss-red)]/15 text-[var(--loss-red)]">BET DOWN</span>}
                      {regimeTone === 'tailwind' && <span className="text-[10px] px-1 py-0.5 rounded bg-[rgba(34,197,94,0.15)] text-[var(--profit-green)]">TAILWIND</span>}
                      {regimeTone === 'headwind' && <span className="text-[10px] px-1 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[var(--loss-red)]">HEADWIND</span>}
                    </div>
                    <span className="text-xs text-[var(--text-muted)] truncate block max-w-[180px]">{stock.name}</span>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleWatchlist(stock.id)}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${isWatched ? 'border-[var(--info-blue)] bg-[rgba(59,130,246,0.12)] text-[var(--info-blue)]' : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    aria-label={isWatched ? `Remove ${stock.ticker} from watchlist` : `Add ${stock.ticker} to watchlist`}
                  >
                    <Star className={`w-4 h-4 ${isWatched ? 'fill-current' : ''}`} />
                  </button>
                  <div className="text-right shrink-0">
                  <div className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">${stock.currentPrice.toFixed(2)}</div>
                  <div className={`text-xs font-mono-data ${change >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">No stocks match your filters</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
