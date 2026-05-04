# Market Saga Legacy Story Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of Market Saga so completed runs generate a legacy epilogue, three sequel choices, and a selected next chapter that starts the next career season.

**Architecture:** Keep story generation in pure engine modules and keep persistence outside `GameState` to avoid save-schema churn. `legacyStory.ts` classifies endings and offers; `legacyStorage.ts` records history in localStorage; Game Over components render the epilogue and choices; `GameContext.continueCareer` accepts an optional selected offer.

**Tech Stack:** TypeScript, React 18, Vitest, existing Vite/Tailwind/lucide/framer-motion UI stack.

---

### Task 1: Legacy Story Engine

**Files:**
- Create: `src/engine/legacyStory.ts`
- Create: `src/engine/__tests__/legacyStory.test.ts`
- Modify: `src/engine/index.ts`

- [x] **Step 1: Write failing tests for ending classification and offer generation**

Create `src/engine/__tests__/legacyStory.test.ts` with tests that:
- Create completed `GameState` fixtures from `createNewGame`.
- Verify an A-grade high-risk run classifies as `reckless_rocket`.
- Verify an F-grade margin-heavy run classifies as `boardroom_fire`.
- Verify `buildLegacyOffers` returns three offers and avoids repeating the most recent chosen offer first.

Run: `npm.cmd run test:run -- src/engine/__tests__/legacyStory.test.ts`
Expected: FAIL because `../legacyStory` does not exist.

- [x] **Step 2: Implement minimal pure engine**

Create `src/engine/legacyStory.ts` exporting:
- `LegacyEndingTone`
- `LegacyEndingId`
- `LegacyEnding`
- `LegacyPathOffer`
- `LegacyRecord`
- `buildLegacyEnding(state: GameState): LegacyEnding`
- `buildLegacyOffers(state: GameState, ending: LegacyEnding, legacy?: LegacyRecord): LegacyPathOffer[]`
- `findLegacyOffer(offers: LegacyPathOffer[], offerId: string): LegacyPathOffer | null`

Rules:
- Compute ending from grade, risk, margin, dividends, alpha, and sector concentration.
- Return exactly three offers.
- Always include at least one personalized offer and one wildcard/market-chaos offer.
- Use deterministic ordering based on `runId`, `seasonNumber`, and `ending.id`.
- If the most recent chosen path matches the first offer, rotate it away from first position.

Run: `npm.cmd run test:run -- src/engine/__tests__/legacyStory.test.ts`
Expected: PASS.

- [x] **Step 3: Export engine API**

Modify `src/engine/index.ts`:

```ts
export * from './legacyStory';
```

Run: `npm.cmd run test:run -- src/engine/__tests__/legacyStory.test.ts`
Expected: PASS.

### Task 2: Legacy Storage

**Files:**
- Create: `src/engine/legacyStorage.ts`
- Create: `src/engine/__tests__/legacyStorage.test.ts`
- Modify: `src/engine/index.ts`

- [x] **Step 1: Write failing storage tests**

Create tests that:
- `loadLegacyRecord` returns an empty versioned record when localStorage is empty.
- `recordLegacyEnding` dedupes by `runId`.
- `recordLegacyChoice` appends a chosen path and records the source ending id.

Run: `npm.cmd run test:run -- src/engine/__tests__/legacyStorage.test.ts`
Expected: FAIL because `../legacyStorage` does not exist.

- [x] **Step 2: Implement localStorage persistence**

Create `src/engine/legacyStorage.ts` with:
- `LEGACY_STORAGE_KEY = 'marketmaster_legacy_saga_v1'`
- `createEmptyLegacyRecord()`
- `loadLegacyRecord()`
- `saveLegacyRecord(record)`
- `recordLegacyEnding(ending)`
- `recordLegacyChoice(ending, offer)`

Keep stored data compact and independent from `GameState`.

Run: `npm.cmd run test:run -- src/engine/__tests__/legacyStorage.test.ts`
Expected: PASS.

- [x] **Step 3: Export storage API**

Modify `src/engine/index.ts`:

```ts
export * from './legacyStorage';
```

Run: `npm.cmd run test:run -- src/engine/__tests__/legacyStorage.test.ts`
Expected: PASS.

### Task 3: Continue Career With Selected Saga Path

**Files:**
- Modify: `src/engine/careerSeasons.ts`
- Create or update: `src/engine/__tests__/careerSeasons.test.ts`
- Modify: `src/context/GameContext.tsx`

- [x] **Step 1: Write failing career continuation test**

Add a test to `src/engine/__tests__/careerSeasons.test.ts` that calls:

```ts
continueCareer(state, { themeId: 'ai_mania', challengeMode: 'standard' })
```

Expected:
- `career.activeSeasonThemeId` is `ai_mania`.
- the new season uses `ai_mania`.
- existing `continueCareer(state)` behavior still picks the normal next theme.

Run: `npm.cmd run test:run -- src/engine/__tests__/careerSeasons.test.ts`
Expected: FAIL because `continueCareer` only accepts a challenge mode string.

- [x] **Step 2: Implement backward-compatible options**

Update `continueCareer` to accept either:

```ts
type ContinueCareerOptions = ChallengeModeId | {
  challengeMode?: ChallengeModeId;
  themeId?: SeasonThemeId;
};
```

Resolve `nextChallengeMode` and `nextThemeId` from options while preserving old calls.

Run: `npm.cmd run test:run -- src/engine/__tests__/careerSeasons.test.ts`
Expected: PASS.

- [x] **Step 3: Add selected-offer support to context**

Update `GameContextType.continueCareer` to accept an optional `LegacyPathOffer`. Inside the callback:
- Pass `{ challengeMode: offer.challengeMode, themeId: offer.nextThemeId }` to the engine when an offer is provided.
- Record the choice with `recordLegacyChoice`.
- Continue to create a mission, save auto, sync trophies, and navigate to `game`.

Run: `npm.cmd run test:run -- src/engine/__tests__/careerSeasons.test.ts src/engine/__tests__/legacyStorage.test.ts`
Expected: PASS.

### Task 4: Game Over Saga UI

**Files:**
- Create: `src/components/gameover/LegacyEpilogueCard.tsx`
- Create: `src/components/gameover/NextChapterPicker.tsx`
- Modify: `src/pages/GameOver.tsx`

- [x] **Step 1: Add UI components**

Create display components:
- `LegacyEpilogueCard` renders ending title, summary, tags, and a small "Legacy Impact" row.
- `NextChapterPicker` renders three cards with title, subtitle, description, reward preview, and a `Choose Chapter` button.

Use the existing dark glass/market card language. Use lucide icons and inline visual treatment; do not add raster images.

- [x] **Step 2: Integrate into Game Over**

In `GameOver.tsx`:
- Load legacy record.
- Build and record the current ending.
- Build offers.
- Render `LegacyEpilogueCard` above career recap.
- Replace the single `Continue Career` button with `NextChapterPicker` when `canContinueCareer`.
- Keep `Play Again` and `Save Score` available.
- The old `Continue Career` default can remain as a fallback button label inside the first offer path.

Run: `npm.cmd run build`
Expected: PASS.

### Task 5: Changelog And Verification

**Files:**
- Modify: `CHANGELOG.md`

- [x] **Step 1: Update changelog**

Add under `[Unreleased] > Added`:

```md
- Added Market Saga legacy story mode Phase 1, where completed runs generate a legacy epilogue and next-chapter sequel choices that shape the next career season.
```

- [x] **Step 2: Full verification**

Run:
- `npm.cmd run test:run`
- `npm.cmd run lint`
- `npm.cmd run build`
- Start dev server on `127.0.0.1:3000`
- `npm.cmd run test:smoke`
- Focused browser QA: finish or load a completed run, confirm `Your Fund's Legacy`, three chapter choices, choose one, confirm next season starts.

- [ ] **Step 3: Commit and PR**

Commit:

```bash
git add CHANGELOG.md src docs
git commit -m "feat: add market saga legacy mode"
git push -u origin codex/feat-market-saga
```

Open PR:
- Title: `feat: add market saga legacy mode`
- Body references `Closes #22`
- Include test plan and note that no generated images were required for Phase 1.
