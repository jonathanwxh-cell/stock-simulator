# Stock Simulator Phase 2 Strategy Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for behavior changes. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add company traits, macro conditions, and scanner/research signals so players can reason about playstyles instead of only reacting to price moves.

**Architecture:** Add focused engine modules for company traits, macro simulation, and scanners. Store macro state in `GameState`, enrich stocks at clone time, and render new cards from pure selectors.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Tailwind CSS, lucide-react.

---

## File Structure

**Create**

- `src/engine/companyTraits.ts`
- `src/engine/macroSystem.ts`
- `src/engine/scannerSystem.ts`
- `src/engine/__tests__/companyTraits.test.ts`
- `src/engine/__tests__/macroSystem.test.ts`
- `src/engine/__tests__/scannerSystem.test.ts`
- `src/components/market/MacroBackdropCard.tsx`
- `src/components/market/ScannerSignalsCard.tsx`
- `src/components/market/ResearchBriefCard.tsx`

**Modify**

- `src/engine/types.ts`
- `src/engine/stockData.ts`
- `src/engine/gameState.ts`
- `src/engine/marketSimulator.ts`
- `src/engine/saveSystem.ts`
- `src/engine/index.ts`
- `src/context/GameContext.tsx`
- `src/pages/GameHUD.tsx`
- `src/pages/StockMarket.tsx`
- `src/pages/StockDetailFixed.tsx`
- `src/pages/NewsPanel.tsx`
- `CHANGELOG.md`

## Tasks

- [ ] Write failing tests for company trait assignment and stock identity helpers.
- [ ] Implement trait derivation in `companyTraits.ts` and wire it into `cloneInitialStocks()`.
- [ ] Write failing tests for macro environment creation, advancement bounds, and stock-level macro drift.
- [ ] Implement `macroSystem.ts`, add `macroEnvironment` and `macroHistory` to `GameState`, initialize and migrate them, and advance macro once per simulated turn.
- [ ] Write failing tests for scanner signals and stock research briefs.
- [ ] Implement `scannerSystem.ts` with ranked signals and research brief derivation.
- [ ] Add macro/scanner/research cards and mount them in HUD, market, news, and stock detail screens.
- [ ] Run `npm run test:run`, `npm run build`, and `npm run lint`; fix issues found by those commands.
