import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { Newspaper, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { SECTOR_COLORS, SECTOR_LABELS } from '../engine/config';
import { getMarketBreadthSummary, getUpcomingCatalysts } from '../engine/marketInsights';
import MarketPulseCard from '../components/market/MarketPulseCard';
import UpcomingCatalystsCard from '../components/market/UpcomingCatalystsCard';

export default function NewsPanel() {
  const { gameState, navigateTo } = useGame();
  if (!gameState) return null;

  const recentNews = [...gameState.newsHistory].reverse().slice(0, 20);
  const scenario = gameState.currentScenario;
  const marketPulse = getMarketBreadthSummary(gameState);
  const upcomingCatalysts = getUpcomingCatalysts(gameState, 6);
  const openStock = (stockId: string) => {
    localStorage.setItem('mm_selected', stockId);
    navigateTo('stock-detail');
  };

  return (
    <div className="min-h-[calc(100dvh-56px-72px)] p-4 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-display font-bold text-[var(--text-primary)] mb-4">Market News</h1>

        {/* Active Scenario Banner */}
        {scenario && (
          <div className="bg-[var(--surface-0)] border border-[var(--neutral-amber)] rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[var(--neutral-amber)]" />
              <h3 className="text-sm font-semibold text-[var(--neutral-amber)]">Active Scenario</h3>
              <span className="text-xs text-[var(--text-muted)] ml-auto">{scenario.duration}/{scenario.totalDuration} turns left</span>
            </div>
            <p className="font-semibold text-[var(--text-primary)] mb-1">{scenario.title}</p>
            <p className="text-sm text-[var(--text-secondary)]">{scenario.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(scenario.sectorEffects).map(([sector, effect]) => {
                const eff = effect as number;
                if (Math.abs(eff - 1.0) < 0.01) return null;
                return (
                  <span key={sector} className={`text-xs px-2 py-1 rounded-lg ${eff > 1 ? 'bg-[rgba(34,197,94,0.1)] text-[var(--profit-green)]' : 'bg-[rgba(239,68,68,0.1)] text-[var(--loss-red)]'}`}>
                    {SECTOR_LABELS[sector]} {eff > 1 ? '+' : ''}{((eff - 1) * 100).toFixed(1)}%
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-4">
          <MarketPulseCard summary={marketPulse} />
          <UpcomingCatalystsCard catalysts={upcomingCatalysts} stocks={gameState.stocks} currentTurn={gameState.currentTurn} onOpenStock={openStock} />
        </div>

        {/* News Feed */}
        {recentNews.length === 0 ? (
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <Newspaper className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-[var(--text-muted)]">No news yet. Advance turns to see market events.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNews.map((news, i) => (
              <motion.div
                key={news.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-xl border p-4 ${
                  news.impact === 'positive' ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.03)]' :
                  news.impact === 'negative' ? 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)]' :
                  'border-[var(--border)] bg-[var(--surface-0)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    news.impact === 'positive' ? 'bg-[rgba(34,197,94,0.15)]' :
                    news.impact === 'negative' ? 'bg-[rgba(239,68,68,0.15)]' :
                    'bg-[var(--surface-1)]'
                  }`}>
                    {news.impact === 'positive' ? <TrendingUp className="w-3.5 h-3.5 text-[var(--profit-green)]" /> :
                     news.impact === 'negative' ? <TrendingDown className="w-3.5 h-3.5 text-[var(--loss-red)]" /> :
                     <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">{news.headline}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{news.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: (SECTOR_COLORS[news.sector] || '#888') + '20', color: SECTOR_COLORS[news.sector] || '#888' }}>
                        {news.sector === 'all' ? 'All Sectors' : (SECTOR_LABELS[news.sector] || news.sector)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">Turn {news.turn}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
