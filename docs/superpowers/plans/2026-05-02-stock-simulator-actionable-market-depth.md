# Stock Simulator Actionable Market Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship watchlist-driven alerts, a catalyst calendar that resolves into stock-moving news, compact market breadth / sector heatmap views, and a stronger season recap on `GameOver`.

**Architecture:** Keep all simulation and analytics logic in pure engine modules. Add catalyst scheduling plus read-only market-insight selectors, expose minimal watchlist actions through `GameContext`, and render focused UI cards across the existing HUD, market, news, stock detail, and game-over screens.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Recharts, Vitest, existing `GameContext` reducer and pure `src/engine` modules.

---

## File Structure

**Create**

- `src/engine/catalystSystem.ts`
- `src/engine/marketInsights.ts`
- `src/engine/__tests__/catalystSystem.test.ts`
- `src/engine/__tests__/marketInsights.test.ts`
- `src/components/market/WatchlistAlertsCard.tsx`
- `src/components/market/UpcomingCatalystsCard.tsx`
- `src/components/market/MarketPulseCard.tsx`
- `src/components/gameover/SeasonRecapCard.tsx`

**Modify**

- `src/engine/types.ts`
- `src/engine/gameState.ts`
- `src/engine/marketSimulator.ts`
- `src/engine/index.ts`
- `src/engine/saveSystem.ts`
- `src/engine/cloudSaveSystem.ts`
- `src/context/GameContext.tsx`
- `src/pages/GameHUD.tsx`
- `src/pages/StockMarket.tsx`
- `src/pages/StockDetailFixed.tsx`
- `src/pages/NewsPanel.tsx`
- `src/pages/GameOver.tsx`
- `CHANGELOG.md`

## Task Sequence

### Task 1: Add catalyst state and seed logic

- [ ] Add failing tests for catalyst seeding and resolution.
- [ ] Extend `GameState` with `watchlist` and `catalystCalendar`.
- [ ] Create `catalystSystem.ts` with:
  - initial catalyst seeding
  - due-turn resolution into `NewsEvent`s
  - rolling refill logic
- [ ] Wire catalyst seeding into `createNewGame()`.
- [ ] Wire due catalyst resolution + refill into `simulateTurn()`.

### Task 2: Add save migration for new market-depth state

- [ ] Extend save import schema and revive/migration logic for:
  - `watchlist`
  - `catalystCalendar`
- [ ] Ensure missing fields default cleanly on old saves.
- [ ] Verify a legacy save path still loads into a valid `GameState`.

### Task 3: Add pure market-insight selectors

- [ ] Add failing tests for:
  - watchlist alerts
  - breadth totals
  - sector averages
  - season recap math
- [ ] Create `marketInsights.ts` with selectors for:
  - `getWatchlistAlerts`
  - `getUpcomingCatalysts`
  - `getMarketBreadthSummary`
  - `getSectorPerformance`
  - `buildSeasonRecap`

### Task 4: Expose watchlist actions through context

- [ ] Add context actions to:
  - add/remove a stock from the watchlist
  - query whether a stock is watched
- [ ] Keep these updates autosaved through the existing save flow.
- [ ] Migrate loaded saves so old runs get an empty watchlist rather than crashing.

### Task 5: Build reusable market-depth UI cards

- [ ] Create `WatchlistAlertsCard.tsx`.
- [ ] Create `UpcomingCatalystsCard.tsx`.
- [ ] Create `MarketPulseCard.tsx`.
- [ ] Keep props selector-driven so cards stay dumb and reusable.

### Task 6: Integrate the new cards into live screens

- [ ] Mount alerts + catalysts + pulse into `GameHUD`.
- [ ] Add watchlist toggles and pulse/heatmap context into `StockMarket`.
- [ ] Add watchlist toggle + next catalyst context into `StockDetailFixed`.
- [ ] Add breadth + catalyst context into `NewsPanel`.

### Task 7: Expand Game Over into a season recap

- [ ] Create `SeasonRecapCard.tsx`.
- [ ] Use `buildSeasonRecap()` from the engine instead of page-local ad hoc math.
- [ ] Add alpha, best/worst stretch, drawdown, trade highlights, and run-defining stats.

### Task 8: Verify and document

- [ ] Run `npm run test:run`.
- [ ] Run `npm run build`.
- [ ] Play through the affected flow in the in-app browser.
- [ ] Update `CHANGELOG.md` with the new feature bundle and any test stabilization needed along the way.
