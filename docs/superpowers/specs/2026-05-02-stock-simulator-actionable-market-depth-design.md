# Stock Simulator Actionable Market Depth Design

**Date:** 2026-05-02
**Project:** `jonathanwxh-cell/stock-simulator`
**Status:** Approved for autonomous implementation

## Goal

Make each turn feel more consequential, readable, and market-like by adding:

1. a player watchlist with actionable alerts
2. a scheduled catalyst calendar that resolves into real stock-moving events
3. market breadth and sector heatmap views
4. a stronger end-of-run season recap

This phase is based directly on a live playthrough where the core loop was stable, but too many turns could be advanced without enough anticipation, urgency, or post-turn interpretation.

## Why This Phase

The current game already has:

- a solid turn loop
- good headline flavor
- benchmark tracking
- mission and risk overlays

The main missing layer is actionable market context. Players can see prices move, but the game rarely tells them:

- what to watch next
- which sectors are leading or lagging
- which owned names have upcoming catalysts
- why a finished season felt strong or weak

This phase improves decision density without changing the core turn-based simulation model.

## Locked Scope

- `Watchlist` is a saved per-run list of stock ids.
- `Alerts` are derived from watchlist price moves, watchlist news, and imminent catalysts.
- `Catalysts` are scheduled future events such as earnings, guidance, product launches, analyst days, and regulatory decisions.
- `Catalysts` resolve on their scheduled turn into real `NewsEvent`s that already plug into stock pricing.
- `Market breadth` and `sector heatmap` are read-only analytics derived from existing turn data.
- `Season recap` expands `GameOver` with performance and narrative summary cards.

## Non-Goals

- No rival traders
- No slippage / liquidity / borrow-fee trading math in this round
- No new route or standalone dashboard screen
- No intraturn simulation
- No live push notifications outside the current game UI
- No asset-generation requirement unless UI polish reveals a true visual gap

## Product Design

### 1. Watchlist

Players can star stocks from:

- `StockMarket`
- `StockDetailFixed`

Watchlist behavior:

- saved in `GameState`
- survives save/load
- can be toggled any time
- drives alert prioritization in the HUD and news surfaces

Watchlist should feel like a lightweight command center, not a separate subsystem.

### 2. Alerts

Alerts are not manual orders or reminders. They are automated “pay attention” summaries generated from existing state.

Primary triggers:

- watchlist stock moved sharply this turn
- watchlist stock appeared in a new headline this turn
- watchlist stock has a catalyst next turn

Alert tone:

- `positive`
- `negative`
- `neutral`

The HUD should surface a short, readable list rather than a noisy feed.

### 3. Catalyst Calendar

Each run maintains a rolling calendar of upcoming catalysts.

Supported catalyst types:

- `earnings`
- `guidance`
- `product_launch`
- `analyst_day`
- `regulatory`

Design rules:

- catalysts are scheduled a few turns ahead
- players can see them before they resolve
- outcomes are not shown in advance
- on the due turn, the catalyst becomes a `NewsEvent`
- the resolved event uses the stock’s sector and ticker so it feels grounded

This creates anticipation and setup/payoff instead of pure random surprise.

### 4. Market Breadth and Sector Heatmap

Add a compact “market pulse” layer to the game.

Derived metrics:

- advancers
- decliners
- unchanged
- best sector
- worst sector
- average last-turn move by sector

The heatmap should be simple and mobile-friendly:

- one tile per sector
- color and copy based on last-turn sector average
- no requirement for a full chart library surface

### 5. Season Recap

`GameOver` should feel like a satisfying debrief, not just a grade card.

Add recap modules for:

- alpha vs market
- best month
- worst month
- max drawdown
- best trade
- worst trade
- top winning stock contribution
- most painful drag
- catalyst / news activity summary

This makes finished runs more memorable and helps players learn what actually happened.

## UX Placement

### GameHUD

Add:

- `Watchlist Alerts` card
- `Upcoming Catalysts` card
- `Market Pulse` summary strip or card

### StockMarket

Add:

- watchlist star toggle on rows
- optional watchlist-first sorting / highlighting
- compact sector heatmap above the stock list

### StockDetailFixed

Add:

- watchlist toggle
- next catalyst card for the current stock
- recent stock-specific watchlist/news context

### NewsPanel

Add:

- market breadth summary
- upcoming catalyst list
- existing headline feed remains the main body

### GameOver

Expand with:

- season recap grid
- performance context vs benchmark
- “what defined this run” style summary content

## Technical Design

### New Engine State

Add to `GameState`:

- `watchlist: string[]`
- `catalystCalendar: CatalystEvent[]`

No separate persisted alert history is required for this phase. Alerts are derived from current state.

### New Engine Types

Add:

- `CatalystType`
- `CatalystVolatility`
- `CatalystEvent`
- `WatchlistAlert`
- `SectorPerformance`
- `MarketBreadthSummary`
- `SeasonRecap`
- `SeasonRecapTrade`

### New Engine Modules

Create:

- `src/engine/catalystSystem.ts`
- `src/engine/marketInsights.ts`

`catalystSystem.ts` responsibilities:

- seed a new game’s initial catalyst queue
- maintain a rolling upcoming catalyst list
- resolve due catalysts into `NewsEvent`s

`marketInsights.ts` responsibilities:

- derive watchlist alerts
- derive sector-performance heatmap data
- derive market breadth
- derive season recap metrics

### Simulation Integration

Inside `simulateTurn()`:

1. advance turn/date
2. resolve due catalysts into `newsHistory`
3. refill upcoming catalysts if needed
4. generate normal random news
5. price stocks using the combined current-turn news

This keeps catalysts fully inside the existing pricing model.

### Save / Migration

Older saves must continue to load.

Migration defaults:

- `watchlist: []`
- `catalystCalendar: []`

Imported saves should also tolerate those fields being absent.

## Testing

Add engine coverage for:

- initial catalyst seeding
- catalyst resolution into news
- rolling catalyst refill
- no resolved catalyst remaining in upcoming calendar
- watchlist alert derivation
- sector heatmap math
- market breadth totals
- season recap calculations

UI verification:

- `npm run test:run`
- `npm run build`
- browser smoke test of title -> game -> market -> stock detail -> news -> game over surfaces

## Risks

- If catalyst generation is too frequent, the game could become noisy instead of tense
- If alerts are too sensitive, players will ignore them
- If season recap logic tries to be too clever, it can feel arbitrary
- If heatmap cards are over-designed, mobile readability will suffer

## Recommended Implementation Slice

Ship this phase in one cohesive round with:

1. engine support for watchlist + catalysts
2. market insights selectors
3. HUD / market / news UI
4. season recap expansion

This keeps the feature bundle unified around one theme: better information, better anticipation, better payoff.
