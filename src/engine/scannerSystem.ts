import { getMacroStockDrift } from './macroSystem';
import { getTraitSummary } from './companyTraits';
import type { GameState, ResearchBrief, ScannerCategory, ScannerSignal, Stock } from './types';

function lastChangePct(stock: Stock): number {
  const prev = stock.priceHistory.length > 1 ? stock.priceHistory[stock.priceHistory.length - 2].price : stock.basePrice;
  return prev > 0 ? ((stock.currentPrice - prev) / prev) * 100 : 0;
}

function valuationGapPct(stock: Stock): number {
  return stock.basePrice > 0 ? ((stock.currentPrice - stock.basePrice) / stock.basePrice) * 100 : 0;
}

function makeSignal(stock: Stock, category: ScannerCategory, score: number, title: string, description: string, tone: ScannerSignal['tone']): ScannerSignal {
  return {
    id: `${category}_${stock.id}`,
    stockId: stock.id,
    ticker: stock.ticker,
    category,
    score: Math.round(score),
    title,
    description,
    tone,
  };
}

function signalsForStock(state: GameState, stock: Stock): ScannerSignal[] {
  const signals: ScannerSignal[] = [];
  const change = lastChangePct(stock);
  const gap = valuationGapPct(stock);
  const macroDrift = getMacroStockDrift(stock, state.macroEnvironment);

  if (stock.dividendYield >= 0.025) {
    signals.push(makeSignal(
      stock,
      'income',
      58 + stock.dividendYield * 900 + Math.max(0, -gap) * 0.35,
      `${stock.ticker} income setup`,
      `${(stock.dividendYield * 100).toFixed(1)}% yield with ${getTraitSummary(stock.traits)} traits.`,
      'positive',
    ));
  }

  if (gap <= -10 && !stock.traits.includes('speculative')) {
    signals.push(makeSignal(
      stock,
      'value',
      62 + Math.abs(gap) * 0.8,
      `${stock.ticker} value reset`,
      `Trades ${Math.abs(gap).toFixed(1)}% below its starting anchor while avoiding the most speculative profile.`,
      'positive',
    ));
  }

  if (change >= 4 || (stock.traits.includes('momentum') && gap >= 8)) {
    signals.push(makeSignal(
      stock,
      'momentum',
      60 + Math.max(change, gap * 0.4),
      `${stock.ticker} momentum tape`,
      `Last move is ${change >= 0 ? '+' : ''}${change.toFixed(1)}%, putting this name on the breakout screen.`,
      'positive',
    ));
  }

  if (macroDrift >= 0.018) {
    signals.push(makeSignal(
      stock,
      'macro_tailwind',
      68 + macroDrift * 1200,
      `${stock.ticker} macro tailwind`,
      `Current macro conditions favor its ${getTraitSummary(stock.traits)} profile.`,
      'positive',
    ));
  }

  if (macroDrift <= -0.018 || (stock.traits.includes('speculative') && state.macroEnvironment.creditStress >= 65)) {
    signals.push(makeSignal(
      stock,
      'risk_warning',
      64 + Math.abs(macroDrift) * 1200 + Math.max(0, state.macroEnvironment.creditStress - 60) * 0.4,
      `${stock.ticker} risk watch`,
      `Macro pressure is working against this profile; use sizing and exits carefully.`,
      'negative',
    ));
  }

  return signals;
}

export function getScannerSignals(state: GameState, limit = 8): ScannerSignal[] {
  return state.stocks
    .flatMap((stock) => signalsForStock(state, stock))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.ticker.localeCompare(right.ticker);
    })
    .slice(0, limit);
}

function macroFitLabel(score: number): ResearchBrief['macroFit']['label'] {
  if (score >= 0.018) return 'Tailwind';
  if (score <= -0.018) return 'Headwind';
  return 'Mixed';
}

function traitThesis(stock: Stock): string {
  const t = stock.traits;
  if (t.includes('growth') && t.includes('momentum')) {
    if (stock.sector === 'technology') return `${stock.name} combines top-line expansion with strong price momentum. Watch for earnings acceleration and multiple expansion.`;
    if (stock.sector === 'semiconductors') return `Chip-cycle upswings amplify ${stock.name}'s revenue leverage. Position sizing should respect the sector's boom-bust rhythm.`;
    return `${stock.name} rides a growth-and-momentum wave. Sentiment shifts can turn quickly — track insider selling and guidance tone.`;
  }
  if (t.includes('income')) {
    if (stock.dividendYield >= 0.04) return `At ${(stock.dividendYield * 100).toFixed(1)}% yield, ${stock.name} is a core income holding. Watch payout ratio and free-cash-flow coverage for sustainability signals.`;
    if (stock.sector === 'energy') return `${stock.name} offers energy-sector income with commodity price sensitivity. Hedge exposure if oil volatility spikes.`;
    if (stock.sector === 'telecom') return `Steady subscriber revenue underpins ${stock.name}'s dividend. Capital intensity and 5G rollout costs are the key variables.`;
    return `${stock.name} balances yield with modest growth. Rate shifts and credit spreads drive relative attractiveness.`;
  }
  if (t.includes('cyclical')) {
    if (stock.sector === 'energy') return `${stock.name} trades with the commodity cycle. Position around inventory data, OPEC signals, and rig-count trends.`;
    if (stock.sector === 'financials') return `Net interest margin expansion benefits ${stock.name} in rising-rate environments. Credit quality is the main swing factor.`;
    if (stock.sector === 'industrial') return `${stock.name} tracks capex cycles and infrastructure spending. Order backlog provides near-term visibility.`;
    return `${stock.name} is a cyclical bet that responds strongly to growth, credit, and commodity conditions.`;
  }
  if (t.includes('defensive')) {
    if (stock.sector === 'healthcare') return `${stock.name} provides defensive exposure through recurring demand. Pipeline risk and regulatory events are the main variables.`;
    if (stock.sector === 'consumer') return `Stable demand patterns make ${stock.name} a portfolio anchor during drawdowns. Margins compress in inflationary environments.`;
    return `${stock.name} is a defensive stabilizer that can anchor the portfolio when the tape gets rough.`;
  }
  if (t.includes('turnaround')) {
    if (stock.sector === 'technology') return `${stock.name} is mid-turnaround with new product bets and cost restructuring. Proof points will come in quarterly margins and guidance.`;
    return `${stock.name} is a higher-variance recovery candidate. Catalysts are binary — size positions accordingly and set clear exit levels.`;
  }
  if (t.includes('speculative')) {
    return `${stock.name} carries elevated volatility and event-driven risk. Position only with defined risk and tight stop levels.`;
  }
  if (t.includes('momentum')) {
    return `${stock.name} is on the momentum screen with strong recent price action. Fade risk increases after extended runs without consolidation.`;
  }
  return `${stock.name} is a balanced holding where valuation, catalysts, and macro fit should drive the thesis.`;
}

function riskNotes(stock: Stock, macroScore: number): string[] {
  const notes: string[] = [];
  if (stock.traits.includes('speculative')) notes.push('High-volatility profile can move sharply against the position.');
  if (stock.beta >= 1.25) notes.push('Above-market beta increases drawdown risk in weak tape.');
  if (stock.dividendYield > 0.035) notes.push('High yield can signal income support, but also sensitivity to rates and balance-sheet worries.');
  if (macroScore < -0.01) notes.push('Current macro backdrop is a mild headwind.');
  if (notes.length === 0) notes.push('Main risk is ordinary stock-specific news and sector rotation.');
  return notes;
}

export function buildResearchBrief(state: GameState, stockId: string): ResearchBrief | null {
  const stock = state.stocks.find((entry) => entry.id === stockId);
  if (!stock) return null;

  const score = getMacroStockDrift(stock, state.macroEnvironment);
  const label = macroFitLabel(score);
  const tone = label === 'Tailwind' ? 'positive' : label === 'Headwind' ? 'negative' : 'neutral';

  return {
    stockId: stock.id,
    ticker: stock.ticker,
    name: stock.name,
    traits: stock.traits,
    thesis: traitThesis(stock),
    macroFit: {
      score,
      label,
      description: `${label} macro fit for its ${getTraitSummary(stock.traits)} profile.`,
      tone,
    },
    risks: riskNotes(stock, score),
    signals: signalsForStock(state, stock).sort((left, right) => right.score - left.score).slice(0, 3),
  };
}
