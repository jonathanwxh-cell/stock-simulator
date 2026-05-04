# Trophy Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent trophy collection with unique SVG trophy cards, unlock toasts, and a Trophy Room page.

**Architecture:** Keep trophy logic pure in `src/engine/trophySystem.ts`, persist player-wide unlocks in localStorage, and integrate checks through `GameContext`. Render trophy art through a reusable SVG component so the first version has distinctive visuals without a PNG asset pipeline.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Vitest.

---

### Task 1: Engine And Persistence

**Files:**
- Create: `src/engine/trophySystem.ts`
- Test: `src/engine/__tests__/trophySystem.test.ts`
- Modify: `src/engine/index.ts`

- [ ] Write failing tests for metadata count, first-buy unlock, idempotent unlocks, persistence roundtrip, and collection summaries.
- [ ] Implement trophy types, metadata, unlock predicates, `evaluateTrophies`, `loadTrophyCase`, `saveTrophyCase`, and `summarizeTrophyCollections`.
- [ ] Export the module from `src/engine/index.ts`.
- [ ] Run `npm.cmd run test:run -- src/engine/__tests__/trophySystem.test.ts` and confirm green.

### Task 2: Context Integration

**Files:**
- Modify: `src/context/GameContext.tsx`
- Modify: `src/engine/types.ts`

- [ ] Add `TrophyUnlock` types and context fields for `trophyCase`, `newTrophyUnlocks`, `dismissTrophyUnlock`.
- [ ] Run trophy checks after new game, trades, watchlist toggles, turn advancement, game over states, and career continuation.
- [ ] Ensure checks are non-blocking and persisted immediately.
- [ ] Run `npm.cmd run test:run` and confirm no regressions.

### Task 3: Trophy Art And Toast UI

**Files:**
- Create: `src/components/trophies/TrophyArt.tsx`
- Create: `src/components/trophies/TrophyUnlockToast.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] Build SVG trophy artwork variants keyed by trophy `artKey`.
- [ ] Build toast UI that animates in, shows the unique trophy image, and can be dismissed.
- [ ] Mount the toast in `Layout` so it works from all screens.
- [ ] Run `npm.cmd run lint` and fix any React Compiler warnings.

### Task 4: Trophy Room Page And Navigation

**Files:**
- Create: `src/pages/TrophyRoom.tsx`
- Modify: `src/App.tsx`
- Modify: `src/engine/types.ts`
- Modify: `src/pages/TitleScreen.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] Add `trophy-room` to the `Screen` union and route switch.
- [ ] Add a Trophy Room button from title and in-game navbar.
- [ ] Build grouped collection cards with locked/unlocked trophy art, rarity treatment, and progress counts.
- [ ] Run a browser playtest for title navigation, in-game navigation, and mobile layout.

### Task 5: Verification And Commit

**Files:**
- All changed files

- [ ] Run `npm.cmd run test:run`.
- [ ] Run `npm.cmd run lint`.
- [ ] Run `npm.cmd run build`.
- [ ] Run `npm.cmd run test:smoke`.
- [ ] Browser playtest: unlock first buy trophy, view Trophy Room, verify toast and gallery.
- [ ] Commit with `feat: add trophy collection`.
- [ ] Push `main` to `origin`.
