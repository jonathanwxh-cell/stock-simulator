# Stock Simulator Core Gameplay Milestone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Portfolio performance chart, native Portfolio rebalancing, and Stock Detail advanced pending orders without changing the game's turn-based execution model.

**Architecture:** Keep gameplay rules in pure engine modules. Add a shared pending-order service, a rebalance engine, and chart-series helpers, expose them through `GameContext`, and render them in focused Portfolio/Trading UI components so the existing pages stay readable.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, Vitest, IndexedDB via `idb`, existing pure engine modules in `src/engine`.

---

## File Structure

**Create**

- `src/engine/orders.ts`
- `src/engine/rebalancing.ts`
- `src/engine/performanceSeries.ts`
- `src/engine/__tests__/conditional-orders.test.ts`
- `src/engine/__tests__/rebalancing.test.ts`
- `src/engine/__tests__/performanceSeries.test.ts`
- `src/components/portfolio/PerformanceChartCard.tsx`
- `src/components/portfolio/OpenOrdersCard.tsx`
- `src/components/portfolio/RebalanceCard.tsx`
- `src/components/trading/PendingOrdersCard.tsx`

**Modify**

- `src/engine/types.ts`
- `src/engine/gameState.ts`
- `src/engine/marketSimulator.ts`
- `src/engine/index.ts`
- `src/engine/saveSystem.ts`
- `src/context/GameContext.tsx`
- `src/pages/StockDetailFixed.tsx`
- `src/pages/Portfolio.tsx`
- `src/engine/__tests__/limit-orders.test.ts`
- `src/engine/__tests__/splits.test.ts`
- `CHANGELOG.md`

## Assumptions

- Work happens inside a checked-out local copy of `stock-simulator`.
- Existing saves must keep loading.
- UI form state does not belong in save files.
- Verification remains `vitest`, `build`, `lint`, and manual smoke testing.

## Task Sequence

### Task 1: Extract Shared Pending-Order Engine

**Files**

- Create: `src/engine/orders.ts`
- Modify: `src/engine/gameState.ts`
- Modify: `src/engine/marketSimulator.ts`
- Modify: `src/engine/index.ts`
- Test: `src/engine/__tests__/limit-orders.test.ts`

- [ ] Add a failing test that calls `resolvePendingOrders()` directly for a triggered limit buy.
- [ ] Move existing limit-order placement/cancel logic out of `gameState.ts` into `orders.ts`.
- [ ] Replace `marketSimulator.ts`’s private limit-order resolution with `resolvePendingOrders()`.
- [ ] Re-run:

```bash
npm run test:run -- src/engine/__tests__/limit-orders.test.ts src/engine/__tests__/gameState.test.ts
```

- [ ] Commit:

```bash
git add src/engine/orders.ts src/engine/gameState.ts src/engine/marketSimulator.ts src/engine/index.ts src/engine/__tests__/limit-orders.test.ts
git commit -m "refactor: extract shared pending order engine"
```

### Task 2: Add Stop-Loss / Take-Profit Orders

**Files**

- Modify: `src/engine/types.ts`
- Modify: `src/engine/orders.ts`
- Modify: `src/engine/index.ts`
- Modify: `src/engine/__tests__/splits.test.ts`
- Create: `src/engine/__tests__/conditional-orders.test.ts`

- [ ] Add failing tests for:
  - valid stop-loss placement on owned long shares
  - invalid take-profit when shares exceed the long position
  - triggered stop-loss execution
  - triggered take-profit execution
  - zombie consumption when shares disappear before trigger
- [ ] Implement `placeConditionalOrder(...)` and `cancelConditionalOrder(...)`.
- [ ] Extend `resolvePendingOrders()` to process `conditionalOrders` after limit orders.
- [ ] Extend split-adjustment logic to update conditional-order share counts and trigger prices.
- [ ] Re-run:

```bash
npm run test:run -- src/engine/__tests__/conditional-orders.test.ts src/engine/__tests__/limit-orders.test.ts src/engine/__tests__/splits.test.ts
```

- [ ] Commit:

```bash
git add src/engine/types.ts src/engine/orders.ts src/engine/index.ts src/engine/__tests__/conditional-orders.test.ts src/engine/__tests__/splits.test.ts
git commit -m "feat: add stop loss and take profit orders"
```

### Task 3: Add Performance-Series Selectors

**Files**

- Create: `src/engine/performanceSeries.ts`
- Create: `src/engine/__tests__/performanceSeries.test.ts`
- Modify: `src/engine/index.ts`

- [ ] Add failing tests for:
  - normalization to `100`
  - `12m`, `24m`, and `all` ranges
  - zipped benchmark/net-worth history rows
- [ ] Implement `buildPerformanceSeries(state, range)`.
- [ ] Re-run:

```bash
npm run test:run -- src/engine/__tests__/performanceSeries.test.ts
```

- [ ] Commit:

```bash
git add src/engine/performanceSeries.ts src/engine/__tests__/performanceSeries.test.ts src/engine/index.ts
git commit -m "feat: add portfolio performance series helpers"
```

### Task 4: Build the Rebalancing Engine

**Files**

- Create: `src/engine/rebalancing.ts`
- Create: `src/engine/__tests__/rebalancing.test.ts`
- Modify: `src/engine/types.ts`
- Modify: `src/engine/index.ts`

- [ ] Add failing tests for:
  - trade ordering (`sell -> cover -> buy -> short`)
  - signed target validation
  - whole-share rounding warnings
  - deterministic sector proxy selection
- [ ] Implement `buildRebalancePreview(...)` and `executeRebalancePreview(...)`.
- [ ] Re-run:

```bash
npm run test:run -- src/engine/__tests__/rebalancing.test.ts src/engine/__tests__/gameState.test.ts src/engine/__tests__/conditional-orders.test.ts
```

- [ ] Commit:

```bash
git add src/engine/rebalancing.ts src/engine/__tests__/rebalancing.test.ts src/engine/types.ts src/engine/index.ts
git commit -m "feat: add portfolio rebalancing engine"
```

### Task 5: Expose Context Actions and Save Migration

**Files**

- Modify: `src/context/GameContext.tsx`
- Modify: `src/engine/saveSystem.ts`

- [ ] Add save migration defaults for `conditionalOrders`.
- [ ] Update the import schema to accept persisted conditional orders.
- [ ] Expose explicit context actions:
  - `placeLimitOrder`
  - `cancelLimitOrder`
  - `placeConditionalOrder`
  - `cancelConditionalOrder`
  - `previewRebalance`
  - `executeRebalance`
- [ ] Re-run:

```bash
npm run build
npm run lint
```

- [ ] Commit:

```bash
git add src/context/GameContext.tsx src/engine/saveSystem.ts
git commit -m "refactor: expose pending order and rebalance context actions"
```

### Task 6: Add Advanced-Order UI to Stock Detail

**Files**

- Create: `src/components/trading/PendingOrdersCard.tsx`
- Modify: `src/pages/StockDetailFixed.tsx`

- [ ] Build a focused pending-order card with:
  - tabs for `limit`, `stop-loss`, `take-profit`
  - target-price input
  - shares input
  - active-order list for the current stock
- [ ] Mount the card below the existing market-order ticket.
- [ ] Verify:

```bash
npm run build
npm run lint
```

- [ ] Manual QA:
  1. open a stock with no long position and confirm protective orders are disabled
  2. buy shares, place a limit order and a stop-loss
  3. cancel both and confirm the list updates immediately
- [ ] Commit:

```bash
git add src/components/trading/PendingOrdersCard.tsx src/pages/StockDetailFixed.tsx
git commit -m "feat: add advanced pending orders to stock detail"
```

### Task 7: Add Portfolio Chart and Open-Orders UI

**Files**

- Create: `src/components/portfolio/PerformanceChartCard.tsx`
- Create: `src/components/portfolio/OpenOrdersCard.tsx`
- Modify: `src/pages/Portfolio.tsx`

- [ ] Render the chart from `buildPerformanceSeries(...)`, not from duplicated page-level math.
- [ ] Add an aggregated open-orders card that combines limit and conditional orders.
- [ ] Mount both cards into `Portfolio.tsx` without disrupting existing holdings/risk sections.
- [ ] Verify:

```bash
npm run build
npm run lint
```

- [ ] Manual QA:
  1. confirm the chart renders in a fresh game
  2. advance enough turns to make `12m` / `24m` ranges meaningful
  3. confirm orders placed from `StockDetail` appear in `Portfolio`
- [ ] Commit:

```bash
git add src/components/portfolio/PerformanceChartCard.tsx src/components/portfolio/OpenOrdersCard.tsx src/pages/Portfolio.tsx
git commit -m "feat: add portfolio performance chart and open orders view"
```

### Task 8: Add Portfolio Rebalance UI

**Files**

- Create: `src/components/portfolio/RebalanceCard.tsx`
- Modify: `src/pages/Portfolio.tsx`

- [ ] Build a preview-first rebalance editor with:
  - `sector` / `stock` mode toggle
  - editable target rows
  - preview list
  - warnings
  - execute button that consumes the preview
- [ ] Mount it between the chart and open-orders sections.
- [ ] Verify:

```bash
npm run test:run -- src/engine/__tests__/rebalancing.test.ts
npm run build
npm run lint
```

- [ ] Manual QA:
  1. preview a stock-mode rebalance from existing holdings
  2. preview a sector-mode rebalance that opens a brand-new sector
  3. confirm proxy-stock choice is surfaced in warnings or trade-reason text
  4. execute once and verify holdings/cash update exactly once
- [ ] Commit:

```bash
git add src/components/portfolio/RebalanceCard.tsx src/pages/Portfolio.tsx
git commit -m "feat: add portfolio rebalancing workflow"
```

### Task 9: Final Regression and Release Notes

**Files**

- Modify: `CHANGELOG.md`
- Verify full automated and manual coverage

- [ ] Run:

```bash
npm run test:run
npm run build
npm run lint
```

- [ ] Manual smoke test:
  1. load an older save and confirm `conditionalOrders: []` migration
  2. place and trigger a stop-loss
  3. place and trigger a take-profit
  4. execute a rebalance with both long and short positions
  5. confirm the chart still renders after load
- [ ] Update release notes.
- [ ] Commit:

```bash
git add CHANGELOG.md
git commit -m "chore: document core gameplay milestone"
```
