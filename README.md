# Stock Simulator

A turn-based stock market simulation game built with React, TypeScript, and Vite.

Trade 60 fictional stocks across 12 sectors, react to randomly generated market events, manage margin and short positions, and try to multiply your starting capital before time runs out.

## Features

- **60 stocks** across 12 sectors (Tech, Semiconductors, Healthcare, Biotech, Energy, Financials, Consumer, Media, Industrial, Real Estate, Telecom, Materials)
- **4 difficulty levels** — Easy, Normal, Hard, Expert — each with different starting capital, volatility, fees, and win conditions
- **Market simulation engine** — sector rotation, mean-reverting prices, dividend payouts, stock splits
- **Event system** — breaking news, earnings reports, regulatory actions, macro events that move sectors and individual stocks
- **Margin trading & short selling** with maintenance requirements and interest
- **Limit orders** with per-order fees
- **Save/load system** — games persist to IndexedDB, resume anytime
- **Leaderboard** — tracks best performances across sessions
- **Grade system** — S/A/B/C/D/F based on final portfolio value

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS + shadcn/ui (40+ components)
- Framer Motion
- Recharts (price charts)
- IndexedDB (via `idb`) for save persistence

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── engine/              # Game logic (pure TypeScript, no UI)
│   ├── config.ts        # Difficulty configs, sector colors, fee calculation
│   ├── gameState.ts     # State machine: start, trade, next-turn, game-over
│   ├── marketSimulator.ts   # Price engine: GBM, mean reversion, sector rotation
│   ├── scenarioGenerator.ts # 600+ event templates across 30+ categories
│   ├── stockData.ts     # 60 stock definitions with real-ish fundamentals
│   ├── leaderboard.ts   # Score tracking
│   ├── saveSystem.ts    # IndexedDB persistence
│   └── types.ts         # TypeScript interfaces
├── pages/
│   ├── TitleScreen.tsx  # Landing page with difficulty selection
│   ├── GameHUD.tsx      # Main game interface
│   ├── StockMarket.tsx  # Browse and filter all stocks
│   ├── StockDetail.tsx  # Individual stock chart + order placement
│   ├── TradingModal.tsx # Buy/sell/short/limit order dialog
│   ├── Portfolio.tsx    # Holdings, P&L, margin status
│   ├── NewsPanel.tsx    # Event feed and history
│   ├── NextTurn.tsx     # Turn summary with price changes and events
│   ├── GameOver.tsx     # Final results, grade, leaderboard entry
│   └── ...              # Leaderboard, settings, how-to-play, load/save
├── context/
│   └── GameContext.tsx   # React context bridging engine ↔ UI
└── components/ui/       # shadcn/ui component library
```

## How It Works

Each turn represents one month. The simulation:

1. **Generates events** — earnings beats/misses, FDA approvals, geopolitical shocks, sector rotations, etc.
2. **Moves prices** — geometric Brownian motion with sector momentum, mean reversion, and event impact
3. **Applies dividends** — quarterly payouts for dividend-yielding stocks
4. **Checks margin calls** — forced liquidation if maintenance requirement breached
5. **Resolves limit orders** — trigger if price crosses the threshold

The game ends when you hit the turn limit or your portfolio goes to zero. Your goal: multiply starting cash by the difficulty's goal multiplier.

## License

MIT
