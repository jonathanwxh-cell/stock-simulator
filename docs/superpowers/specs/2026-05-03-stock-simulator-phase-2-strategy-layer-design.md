# Stock Simulator Phase 2 Strategy Layer Design

**Date:** 2026-05-03
**Project:** `jonathanwxh-cell/stock-simulator`
**Status:** Approved for autonomous implementation

## Goal

Make runs feel more strategic by adding persistent company identities, a readable macro backdrop, and stock scanners that help players form stronger theses before placing trades.

## Scope

Phase 2 builds three connected systems:

- Company traits on every stock, such as `growth`, `defensive`, `cyclical`, `income`, `speculative`, `turnaround`, `value`, and `momentum`.
- A monthly macro environment with interest rates, inflation, growth, credit stress, oil, and sentiment, plus a compact narrative.
- Scanner and research selectors that turn traits, prices, dividends, macro tailwinds, and risk conditions into actionable signals.

## Architecture

Keep behavior in pure engine modules and expose it through selector-style functions. `stockData` enriches cloned stocks with traits, `macroSystem` owns state transitions and macro price adjustments, and `scannerSystem` derives ranked signals and stock research briefs. React components stay presentational and read from those selectors through existing game state.

The simulator applies macro pressure as a modest drift component beside existing regime, scenario, random-walk, and news effects. Macro state is saved with the run and migrated for older saves.

## UI Placement

- `GameHUD`: show a macro backdrop card and top scanner signals.
- `StockMarket`: add trait badges, a scanner spotlight, and a scanner sort option.
- `StockDetailFixed`: add a compact research brief explaining traits, macro fit, and current signal.
- `NewsPanel`: show the macro backdrop next to market pulse and upcoming catalysts.

## Testing

Engine tests cover trait assignment, macro bounds and price pressure, scanner ranking, research brief output, new-game initialization, and monthly macro advancement. Existing test and build commands remain the verification gate.
