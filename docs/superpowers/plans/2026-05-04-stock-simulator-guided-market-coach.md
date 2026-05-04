# Guided Market Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a low-friction guided market coach that explains what happened last turn and suggests the next useful action without becoming a trade journal.

**Architecture:** Create a pure engine module that composes existing turn performance, risk, scanner, catalyst, watchlist, and mission signals into concise coach cards. Render those cards in the HUD and stock detail screens with compact game-like UI. Keep all gameplay mechanics unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright smoke harness.

---

### Task 1: Coach Engine

**Files:**
- Create: `src/engine/marketCoach.ts`
- Create: `src/engine/__tests__/marketCoach.test.ts`
- Modify: `src/engine/index.ts`

- [ ] Write failing tests for first-turn guidance, turn recap language, and stock catalyst guidance.
- [ ] Implement typed coach card helpers that return deterministic text from `GameState`.
- [ ] Export helpers from the engine barrel.
- [ ] Run focused coach tests.

### Task 2: HUD Coach Surface

**Files:**
- Create: `src/components/market/MarketCoachCard.tsx`
- Modify: `src/pages/GameHUD.tsx`

- [ ] Render a compact coach card near the top of the HUD after net worth.
- [ ] Show a turn recap when `currentTurn > 0`.
- [ ] Show 1-2 next-step tips that can navigate to Market, Portfolio, or News.
- [ ] Keep the card visually distinct from raw data widgets.

### Task 3: Stock Detail Coach Surface

**Files:**
- Create: `src/components/market/StockCoachCard.tsx`
- Modify: `src/pages/StockDetailFixed.tsx`

- [ ] Render a stock playbook card above Trade Now.
- [ ] Explain when to use Buy Now versus Plan Ahead.
- [ ] Surface catalyst, watchlist, position, and signal context when available.

### Task 4: Smoke Test Update

**Files:**
- Modify: `scripts/playtest-market-depth.mjs`

- [ ] Assert the HUD coach appears after starting a run.
- [ ] Assert stock detail shows the stock coach.
- [ ] Preserve the full playthrough coverage.

### Task 5: Verification And Commit

**Files:**
- All modified files above.

- [ ] Run `npm.cmd run test:run -- src/engine/__tests__/marketCoach.test.ts`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run test:run`.
- [ ] Run `npm.cmd run test:smoke`.
- [ ] Commit with `feat: add guided market coach`.
- [ ] Push `main` to `origin`.
