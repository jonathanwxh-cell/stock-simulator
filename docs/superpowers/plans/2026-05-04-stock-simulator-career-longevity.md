# Stock Simulator Career Longevity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Market Master from a single 100-month run into a low-friction career loop with season continuation, season themes, challenge modes, unlocks, and stronger rival context.

**Architecture:** Add career-season metadata to `CareerState`, keep the existing turn simulator as the source of truth, and make win/loss checks season-relative. UI changes should surface the active season and offer continuation from Game Over without making regular trading more complex.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, existing engine modules and local save migration.

---

### Task 1: Career Season Engine

**Files:**
- Create: `src/engine/careerSeasons.ts`
- Modify: `src/engine/types.ts`
- Modify: `src/engine/careerSystem.ts`
- Modify: `src/engine/index.ts`
- Test: `src/engine/__tests__/careerSeasons.test.ts`

- [ ] Add `SeasonThemeId`, `ChallengeModeId`, `CareerSeason`, and `CareerUnlock` types.
- [ ] Add default migration fields to `ensureCareerState`.
- [ ] Add helpers for active theme, season turn, season goal, season limit, unlock awards, season finalization, and career continuation.
- [ ] Cover initialization, migration, continuation, and season-relative turn behavior with Vitest.

### Task 2: Simulation Integration

**Files:**
- Modify: `src/engine/marketSimulator.ts`
- Modify: `src/engine/gameState.ts`
- Test: `src/engine/__tests__/careerSeasons.test.ts`

- [ ] Use active season theme to adjust volatility, broad drift, sector pressure, and scenario frequency.
- [ ] Replace absolute `currentTurn >= config.turnLimit` game-over logic with season-relative turn limits.
- [ ] Use season goals instead of fixed first-run goals after Season 1.
- [ ] Add challenge-mode guardrails for no-shorts and dividend-focused runs where appropriate.

### Task 3: Career Continuation UX

**Files:**
- Modify: `src/context/GameContext.tsx`
- Modify: `src/pages/GameOver.tsx`
- Modify: `src/pages/GameHUD.tsx`
- Modify: `src/pages/NextTurn.tsx`

- [ ] Add `continueCareer` to game context.
- [ ] Add a prominent Game Over "Continue Career" action with the next season theme.
- [ ] Show active season, theme, season target, season month, unlocks, and challenge label on the HUD.
- [ ] Make turn summaries label season months clearly.

### Task 4: New Game Challenge UX

**Files:**
- Modify: `src/pages/TitleScreen.tsx`
- Modify: `src/engine/gameState.ts`
- Test: `src/engine/__tests__/careerSeasons.test.ts`

- [ ] Add simple challenge-mode cards after fund style selection.
- [ ] Default to "Standard Career" to keep the new-player path low-friction.
- [ ] Start bear-market style challenges with the matching season theme.

### Task 5: Verification and Shipping

**Files:**
- Verify all changed files.

- [ ] Run focused Vitest tests.
- [ ] Run the full test suite.
- [ ] Run production build.
- [ ] Browser-playtest title screen, new game, season HUD, Game Over, and Continue Career.
- [ ] Commit phase work, merge to `main`, and push to `origin`.
