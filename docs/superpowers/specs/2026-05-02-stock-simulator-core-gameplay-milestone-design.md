# Stock Simulator Core Gameplay Milestone Design

**Date:** 2026-05-02
**Project:** `jonathanwxh-cell/stock-simulator`
**Status:** Approved for planning

## Goal

Plan the next gameplay milestone around three shipped features:

1. Portfolio rebalancing from the Portfolio screen
2. Advanced pending orders on top of the existing turn-based market model
3. A portfolio-vs-benchmark performance chart over time

Options trading is explicitly deferred.

## Locked Scope

- `Limit orders` already exist and stay turn-based.
- `Stop-loss / take-profit` are added as long-only pending sell orders.
- `Order execution` happens only on turn advance, using the resolved end-of-turn price.
- `Rebalancing` supports full gross exposure with signed net-worth weights and an explicit cash row.
- `UX placement` stays native to current screens:
  - `Portfolio`: chart, rebalance tool, open orders
  - `StockDetail`: limit-order ticket plus stop-loss / take-profit ticket
- `Options trading` is out of scope for this round.

## Non-Goals

- No intraturn high/low simulation
- No live market execution loop
- No options chain, strikes, expiry, or pricing model
- No dedicated global trading workstation screen

## Current-State Notes

Useful groundwork already exists:

- `limitOrders` are present and resolve in `simulateTurn()`
- `conditionalOrders` types exist in `src/engine/types.ts` but have no implementation
- `netWorthHistory` and `marketIndexHistory` are already recorded each turn
- `Portfolio.tsx` already shows benchmark summary stats
- `StockDetailFixed.tsx` is the currently routed trading screen

This milestone should extend those foundations rather than replace them.

## Product Design

### Portfolio Performance Chart

Add a `Performance` card to `Portfolio` near the existing benchmark summary.

The chart shows two normalized lines:

- `You`
- `Market`

Both start at `100` on the first visible point so the player can compare trend and alpha visually.

#### Behavior

- Range chips:
  - `12m`
  - `24m`
  - `All`
- X-axis follows the game's monthly turn cadence
- Tooltip shows:
  - turn/month
  - normalized portfolio value
  - normalized benchmark value
  - raw net worth
  - raw benchmark index value

### Rebalancing

Add a `Rebalance` card to `Portfolio` below the chart.

Modes:

- `Sector`
- `Stock`

Workflow:

1. Load current allocation into editable target rows
2. Player edits target weights
3. `Preview rebalance` generates a deterministic trade plan
4. `Execute rebalance` applies that exact plan

#### Target Model

Targets are percentages of current net worth:

- positive = desired long exposure
- negative = desired short exposure
- `Cash` is required

Signed weights must sum to `100%`.

#### Stock Mode

- Preload current long positions
- Preload current short positions
- Preload `Cash`
- Allow adding more stocks by search

#### Sector Mode

Sector mode edits sector buckets plus cash, but must still emit stock-level trades.

Execution rule:

1. reduce existing positions in an overweight sector first
2. increase existing positions in an underweight sector first
3. use a deterministic sector proxy stock only for residual exposure

Sector proxy heuristic:

1. highest `marketCap` bucket (`mega > large > mid > small`)
2. lowest `volatility`
3. alphabetical ticker tie-break

#### Preview Output

Show:

- ordered trade list
- estimated value per trade
- estimated fee per trade
- projected cash after
- warnings

Warnings should cover:

- targets not summing to `100%`
- short targets on difficulties where shorting is disabled
- insufficient cash or margin
- sector proxy use
- whole-share rounding residuals

#### Execution Order

Apply trades in this order:

1. sell long overweights
2. cover short overweights
3. buy long underweights
4. open / expand short underweights

Within each bucket, sort by largest absolute dollar delta first.

### Advanced Orders

Add a second trade surface to `StockDetailFixed.tsx` under the existing market-order ticket.

Supported order types:

- `Limit buy`
- `Limit sell`
- `Stop-loss`
- `Take-profit`

#### Limit Orders

Keep current behavior:

- buy triggers when end-of-turn price is `<= target`
- sell triggers when end-of-turn price is `>= target`

#### Conditional Orders

Add long-only protective exits:

- `stop_loss` triggers when end-of-turn price is `<= triggerPrice`
- `take_profit` triggers when end-of-turn price is `>= triggerPrice`

Each order sells up to the configured whole-share amount from the current long position.

Fee model:

- charge `config.limitOrderFee` when placed
- charge normal broker fee on execution

Triggered orders are consumed even if they can no longer execute, to avoid zombie orders.

#### Visibility

On `StockDetail`:

- show active orders for the current stock
- allow cancel per order

On `Portfolio`:

- show an aggregated `Open Orders` card
- allow jump-to-stock and cancel

## Technical Design

### Engine Boundaries

Keep all rule logic inside `src/engine/`.

New modules:

- `src/engine/orders.ts`
  shared placement, cancellation, resolution, and split adjustment for pending orders
- `src/engine/rebalancing.ts`
  signed exposure math, preview building, and rebalance execution
- `src/engine/performanceSeries.ts`
  normalized chart-series selectors from `netWorthHistory` and `marketIndexHistory`

Modify:

- `src/engine/types.ts`
- `src/engine/gameState.ts`
- `src/engine/marketSimulator.ts`
- `src/engine/index.ts`
- `src/engine/saveSystem.ts`
- `src/engine/cloudSaveSystem.ts`

### Orders Service

`orders.ts` should expose:

- `placeLimitOrder(...)`
- `cancelLimitOrder(...)`
- `placeConditionalOrder(...)`
- `cancelConditionalOrder(...)`
- `resolvePendingOrders(state)`
- `adjustPendingOrdersForSplit(state, stockId, splitRatio)`

### Rebalancing Service

Treat current exposures as signed dollars:

- long = positive
- short liability = negative
- cash = positive cash balance

Preview algorithm:

1. compute current exposures
2. convert target weights to target dollars using current net worth
3. compute deltas
4. translate deltas into concrete trades
5. round to whole shares
6. estimate fees
7. simulate execution ordering and emit warnings

Execution should consume a preview result, not recompute from raw inputs.

### Performance Series

`performanceSeries.ts` should produce rows with:

- `turn`
- `dateLabel`
- `netWorth`
- `benchmarkValue`
- `playerNormalized`
- `marketNormalized`

## UI Design

### Portfolio

Add, in order:

1. `Performance` chart card
2. `Rebalance` card
3. `Open Orders` card

Keep the current summary cards, risk block, holdings list, and recent trades.

### Stock Detail

Keep the current market-order ticket intact.

Add:

1. order-type tabs: `limit`, `stop-loss`, `take-profit`
2. target-price input
3. shares input
4. active-order list for the current stock

## Save / Migration

Older saves must continue to load.

Migration defaults:

- `conditionalOrders: []`

Do not persist UI form state. Persist only durable simulation state:

- pending limit orders
- pending conditional orders
- resulting transactions

## Testing

Add engine coverage for:

- conditional-order placement and validation
- stop-loss / take-profit execution
- zombie-order consumption
- split adjustment for conditional orders
- rebalance preview ordering
- sector proxy selection
- normalization and chart range trimming

UI verification stays:

- `npm run test:run`
- `npm run build`
- `npm run lint`
- manual browser smoke testing

## Risks

- Sector-mode rebalancing can feel arbitrary if proxy-stock choice is not shown clearly
- Whole-share rounding can make small accounts feel imprecise
- Preview and execution can drift if they do not share a common trade list
- Save migration is easy to miss because conditional-order types already exist in `types.ts`

## Follow-Up After This Milestone

Potential later work:

- short-side stop / take exits
- intraturn execution realism
- options trading as a separate subsystem
- richer benchmark/performance UI on the HUD
