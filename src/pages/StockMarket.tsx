import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ArrowDownUp } from 'lucide-react';
import { SECTOR_COLORS, SECTOR_LABELS } from '../engine/config';
import { getRegimeToneForSector } from '../utils/regimeUi';

const MARKET_CAPS = ['all', 'mega', 'large', 'mid', 'small'];
const SORT_OPTIONS = [
  { id: 'name', label: 'Name' },
  { id: 'price', label: 'Price' },
  { id: 'change', label: 'Change %' },
  { id: 'volatility', label: 'Volatility' },
  { id: 'dividend', label: 'Dividend' },
  { id: 'beta', label: 'Beta' },
  { id: 'marketCap', label: 'Market Cap' },
];

export default function StockMarket() {
  const { gameState, navigateTo } = useGame();
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedCap, setSelectedCap] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  if (!gameState) return null;

  const currentRegime = gameState.currentRegime;

  const sectorBreakdown = useMemo(() => {
    const counts: Record<string, number> = { all: gameState.stocks.length };
    gameState.stocks.forEach(s => { counts[s.sector] = (counts[s.sector] || 0) + 1; });
    return counts;
  }, [gameState.stocks]);

  const filtered = useMemo(() => {
    let stocks = gameState.stocks;
    if (search) {
      const q = search.toLowerCase();
      stocks = stocks.filter(s =>
        s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    if (selectedSector !== 'all') stocks = stocks.filter(s => s.sector === selectedSector);
    if (selectedCap !== 'all') stocks = stocks.filter(s => s.marketCap === selectedCap);

    return [...stocks].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'name': return dir * a.name.localeCompare(b.name);
        case 'price': return dir * (b.currentPrice - a.currentPrice);
        case 'change': {
          const ga = a.priceHistory.length >= 2 ? ((a.currentPrice - a.priceHistory[a.priceHistory.length - 2].price) / a.priceHistory[a.priceHistory.length - 2].price) * 100 : 0;
          const gb = b.priceHistory.length >= 2 ? ((b.currentPrice - b.priceHistory[b.priceHistory.length - 2].price) / b.priceHistory[b.priceHistory.length - 2].price) * 100 : 0;
          return dir * (gb - ga);
        }
        case 'volatility': return dir * (b.volatility - a.volatility);
        case 'dividend': return dir * (b.dividendYield - a.dividendYield);
        case 'beta': return dir * (b.beta - a.beta);
        case 'marketCap': {
          const order: Record<string, number> = { mega: 4, large: 3, mid: 2, small: 1 };
          return dir * ((order[b.marketCap] || 0) - (order[a.marketCap] || 0));
        }
        default: return 0;
      }
    });
  }, [gameState.stocks, search, selectedSector, selectedCap, sortBy, sortDir]);

  function getChange(s: any) {
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
            return (
              <button key={stock.id} onClick={() => openStock(stock.id)}
                className="w-full flex items-center justify-between p-3 bg-[var(--surface-0)] border border-[var(--border)] rounded-xl hover:border-[var(--border-hover)] hover:bg-[var(--surface-1)] transition-all text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: SECTOR_COLORS[stock.sector] + '20', color: SECTOR_COLORS[stock.sector] }}>
                    {stock.ticker.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{stock.ticker}</span>
                      {stock.dividendYield > 0 && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--neutral-amber)]/15 text-[var(--neutral-amber)]">DIV</span>}
                      {position && position.shares > 0 && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--profit-green)]/15 text-[var(--profit-green)]">HOLD</span>}
                      {shortPosition && shortPosition.shares > 0 && <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--loss-red)]/15 text-[var(--loss-red)]">SHORT</span>}
                      {regimeTone === 'tailwind' && <span className="text-[10px] px-1 py-0.5 rounded bg-[rgba(34,197,94,0.15)] text-[var(--profit-green)]">TAILWIND</span>}
                      {regimeTone === 'headwind' && <span className="text-[10px] px-1 py-0.5 rounded bg-[rgba(239,68,68,0.15)] text-[var(--loss-red)]">HEADWIND</span>}
                    </div>
                    <span className="text-xs text-[var(--text-muted)] truncate block max-w-[180px]">{stock.name}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">${stock.currentPrice.toFixed(2)}</div>
                  <div className={`text-xs font-mono-data ${change >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </div>
              </button>
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
