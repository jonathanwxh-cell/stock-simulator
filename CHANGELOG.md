# Changelog

All notable
## [1.5.0] — 2026-04-27

### Added

- **Seeded PRNG** (`src/engine/rng.ts`): `RNG` interface with `MathRandomRNG` (production)
  and `SeededRNG` (mulberry32, deterministic). Same seed → identical game sequences.
  Functions accept optional `rng` parameter; defaults to `Math.random()` wrapper.
- **Stock data extracted to JSON**: `data/stocks.json` replaces 913-line inline array.
  `stockData.ts` reduced to 26-line thin loader.
- **Test helper** (`_helpers.ts`): `unwrap()` function reduces trade-result boilerplate
  from 5 lines to 1 across all test files.
- **9 new RNG tests** including deterministic replay verification.
- **ARCHITECTURE.md "Randomness" section**: documents injection pattern and debugging usage.

### Fixed

- **splits.test.ts**: 4 tautology tests (pure arithmetic) replaced with real engine tests
  that exercise `maybeStockSplit` — cost basis invariant, entry value invariant,
  multiplier tracking, cumulative split verification.
- **dividend long+short test**: now asserts dividend transactions directly (long credit ≈ 2×
  short debit, net positive) instead of tolerating $50 negative via net cash.
- **scenarios test**: comment/code mismatch fixed — threshold bumped from 0.3 to 0.4
  to match the "majority (> 40%)" comment.
- **ARCHITECTURE.md**: corrected filenames (`saveSystem.ts`, `cloneState.ts`), added
  `rng.ts`, `stocks.json`, `index.ts`. Cross-checked against actual repo.
- **CHANGELOG**: preamble restored to correct position; added missing `[1.2.2]` link ref.

### Internal

- Zero `Math.random()` calls in engine outside `rng.ts`.
- Zero raw `if (!r.ok) throw` patterns in test files — all use `unwrap()`.
- 50 tests across 6 files, all deterministic (except integration split test).

 changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [1.4.0] — 2026-04-27

### Added

- **Test coverage**: 4 new test files covering limit orders, dividends, splits, and scenarios.
  Suite now has 41 tests across 5 files. All deterministic, flake-free.
- **`ARCHITECTURE.md`**: documents directory layout, engine purity contract, state flow,
  audio system, and how to extend the game.
- **`TradeError` discriminated union**: `executeBuy`/`executeSell`/`executeShort`/`executeCover`/`placeLimitOrder`
  now return `{ ok: true, state, transaction }` or `{ ok: false, reason }` instead of throwing.
- **Error display in UI**: `StockDetail` page shows trade failure reason in plain English
  (e.g. "Not enough cash", "Invalid number of shares").
- **`tradeErrorMessage()` helper**: centralised error-to-string mapping for future i18n.

### Changed

- **Trade functions no longer throw**. This is technically API-breaking for any external
  consumer of the engine, but there are none, so it's safe as a minor version bump.
- **GameContext tracks `lastError`**: exposed via `useGame()` alongside `clearError()`.
- **Scenario generator**: news templates loaded from `src/engine/data/news-templates.json`
  (extracted in v1.3.0). Import moved to top of file, divider comments removed.

### Internal

- CHANGELOG link references now include all versions (1.0.0 through 1.4.0).
- Deleted orphaned v1.2.2 GitHub Release (redundant with v1.3.0).
- Scenario generator import order cleaned up.


All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] — 2026-04-28

Quality pass: financial correctness, dead code removal, data/code separation, audio polish.

### Fixed
- **Margin maintenance double-multiplication** (critical financial bug): `checkMarginCall` was multiplying `shortMarginRequirement × marginMaintenance` to get 0.45× liability threshold, meaning shorts were artificially safe. Now correctly uses `marginMaintenance` alone (0.30×). Shorts in Expert mode are now properly risky.
- **Hardcoded fee rates in UI** replaced with config imports from `DIFFICULTY_CONFIGS` — fee display now stays in sync with engine config automatically.
- **Mislabeled error log** in `newGame`: `autoSave().catch` logged as `audio:` instead of `save:`.
- **Audio useCallback defeat**: all SFX methods now individually memoized via `useCallback` keyed on `[soundEnabled]`, so GameContext `useCallback`s that depend on them actually memoize correctly.
- **Music engine mid-fade reset**: `stopAllMusic` now sets `volume = 0` after `pause()` to prevent one-frame leak; `playTrack` sets incoming volume to 0 before `play()`.

### Removed
- **Long-side margin dead config**: `marginEnabled` and `marginRequirement` removed from `GameConfig` interface and all difficulty configs. These fields were never wired into `canBuy`/`executeBuy` — buying always required full cash. The config was lying about what the system does. Long margin trading may return as a designed feature in v2.0.
- **53 unused shadcn/ui components** deleted (~6000 lines of dead code) plus 33 orphaned `@radix-ui/react-*` dependencies removed from `package.json`.
- **Dead audio exports**: `setMusicVolume` (private, never called) removed from musicEngine; `unlock` alias removed from useAudio return object.

### Internal
- **News templates → data file**: 600+ lines of template arrays extracted from `scenarioGenerator.ts` (683 → 198 lines) into `src/engine/data/news-templates.json`. Editing news is now JSON, not code.
- **deepClone deduplicated**: identical `deepClone` in gameState.ts and marketSimulator.ts consolidated into `src/engine/cloneState.ts`. One source of truth for state cloning.
- **Dead Radix dependencies purged**: 33 unused `@radix-ui/react-*` packages removed alongside the shadcn component cleanup.
- **Screen policy documented**: music useEffect now has a comment explaining that submenu screens inherit the current track; only `'title'`, `'game'`, and `'game-over'` change tracks.
- **Bundle split optimized**: Vite vendor chunks now properly separated (react, motion, chart, main index).

### Balance Notice
Existing saves load unchanged. Margin call thresholds for shorts are now stricter (0.30× liability, was effectively 0.45×). Shorts in flight when upgrading may receive margin calls sooner than they would have under v1.2.x — this is the intended, correct behavior.

---

## [1.2.2] — 2026-04-28

### Fixed
- **Mislabeled error log** in `newGame`: `autoSave().catch` logged as `audio:` instead of `save:` — copy-paste residue from v1.2.1
- **useCallback defeat**: all SFX methods in `useAudio` were inline arrow functions in the return object, recreated every render, defeating memoization in GameContext callbacks. Now each SFX method is individually wrapped in `useCallback` keyed on `[soundEnabled]`
- **Mid-fade volume leak**: `stopAllMusic()` cancelled the fade interval but left audio elements at fractional volumes. Next `playTrack()` would briefly play at stale volume before crossfade overwrote it. Now both audio volumes are reset to 0 on stop, and `incoming.volume = 0` is set before `play()` to prevent one-frame leak
- **Screen handling clarity**: added explicit comment documenting that submenu screens (stock-market, stock-detail, portfolio, news, next-turn, leaderboard, settings, how-to-play, load-save) intentionally inherit the parent screen's music — not a fallthrough bug

### Changed
- **Hook move** (preceding commit): `useAudio` relocated from `src/hooks/` to `src/hooks/useAudio.ts` for consistency with audio module

## [1.2.1] — 2026-04-28

### Fixed

- **`musicEnabled` toggle is inert.** The music useEffect now gates on
  `state.settings.musicEnabled`. Toggling music off stops within 100 ms;
  toggling back on resumes the correct track for the current screen.
  Reloading with music off → no music plays.
- **`hadDividend` detection missed non-last transactions.** Now uses
  `.some()` on the new-transaction slice instead of only checking the last
  element. A turn producing dividend → margin_call now plays both sounds.
- **`hadBankrupt` index-based matching was fragile.** Now matches by
  `stock.id` instead of assuming both arrays are in identical order.
  Robust to future array reordering.
- **AudioUnlock played unsolicited click on first tap.** Now calls
  `unlockAudio()` which silently resumes the AudioContext — no oscillator,
  no sound.
- **Crossfade not actually implemented.** `playTitleMusic` /
  `playGameplayMusic` now perform a real 500 ms crossfade (15 steps) —
  outgoing track ramps 0.4 → 0, incoming ramps 0 → 0.4. In-flight ramps
  are cancelled if a new switch happens before completion.
- **Silent error swallowing.** All `.catch(() => {})` related to audio
  replaced with `.catch(e => console.warn('audio:', e))`. Audio failures
  now show in DevTools with the `audio:` prefix.
- **GameContext imported audio functions directly.** Refactored to use the
  `useAudio()` hook exclusively. GameContext no longer imports from
  `audioEngine` or `musicEngine` — all audio goes through the hook.
- **Music did not pause on tab blur.** Added `document.visibilitychange`
  listener that pauses music when the tab is hidden and resumes (respecting
  `musicEnabled`) when the tab is visible again.
- **Audio files in `src/engine/` violated module contract.** Moved
  `audioEngine.ts` and `musicEngine.ts` to `src/audio/`. The `src/engine/`
  directory now has no DOM/browser-API dependencies.

## [1.2.0] — 2026-04-27

Full audio system — synthesised SFX + AI-generated background music. No gameplay changes.

### Added

- **Web Audio API synthesiser** (`src/engine/audioEngine.ts`). All SFX are generated
  at runtime via OscillatorNode + GainNode envelopes — zero external audio assets,
  ~0 KB download overhead, instant init. Sounds:
  - `playBuy` — rising 3-note tone (confirmed purchase)
  - `playSell` — descending 2-note tone (liquidation)
  - `playShort` — descending sawtooth (bearish move)
  - `playCover` — rising sine (position closed)
  - `playDividend` — soft chime (passive income)
  - `playBankrupt` — low rumble (company failure)
  - `playGameOver` — dramatic descending phrase (game ends)
  - `playMarginCall` — pulsing square wave (warning)
  - `playNews` — sharp ping (alert)
  - `playTurn` — soft tick (turn advance)
  - `playLevelUp` — celebratory arpeggio (difficulty milestone)
  - `playClick` — UI tap
  - `playError` — low buzz (invalid action)
- **MiniMax Music-2.6 integration** (`src/engine/musicEngine.ts`). Two AI-generated
  background tracks via MiniMax API:
  - `title.mp3` — jazz lo-fi, chill, soft piano (title/character creation screen)
  - `gameplay.mp3` — chill hop, mellow beats, subtle synth (gameplay loop)
  Music fades smoothly (500 ms crossfade) on screen transitions and auto-loops.
- **Audio hooks** (`src/hooks/useAudio.ts`). React hooks for music/SFX control:
  - `useMusic` — play/pause/fade/track control with automatic screen-aware switching
  - `useSfx` — per-sound triggers with master volume control
- **Audio wiring** in `GameContext.tsx`. All game actions now trigger appropriate SFX:
  - `buyStock` → `playBuy`, `sellStock` → `playSell`, `shortStock` → `playShort`,
    `coverStock` → `playCover`, `advanceTurn` → `playTurn`, `placeOrder` → `playLimitOrder`,
    `cancelOrder` → `playClick`, `navigateTo` → `playClick`, `loadGame` → `playGameStart`
  - Music auto-switches: title screen → title.mp3, any game screen → gameplay.mp3
  - Turn-simulated events: `playNews` (5 % chance per turn), `playLevelUp` (periodic),
    `playGameOver` (on game over)
- **`AudioUnlock` component** (`src/App.tsx`). Global `click`/`touchstart` listener
  that resumes the AudioContext on first user gesture (Chrome/Safari autoplay policy).

## [1.1.0] — 2026-04-26

Engine correctness pass. No breaking changes; existing saves load unchanged.

### Fixed

- **Short PnL calculation in `executeCover`.** The price-difference term was
  missing, so profitable shorts always returned a loss. Now matches the
  margin-call accounting path: `cash += marginRelease + pnl - fee` where
  `pnl = (entryPrice - currentPrice) * shares`.
- **`canCover` gate** now checks net cash after the cover would be ≥ 0
  (margin release + PnL − fee), instead of demanding full `coverCost` cash
  on hand. More permissive when the trade is profitable, only stricter
  when the player can't absorb a loss.
- **Game-over loss detection.** Previously triggered only on
  `netWorth ≤ 0 && cash ≤ 0`; short squeezes that produced negative net
  worth while keeping cash positive could never end the game. Now triggers
  on `netWorth ≤ 0` alone.
- **Limit order zombies.** Orders whose triggers fired but couldn't execute
  (insufficient cash/shares) used to persist forever, eating the
  `maxLimitOrders` cap. Now consumed regardless of execution outcome.
- **Short-side dividend payments** now produce transaction records so cash
  drift is reconcilable in the ledger (longs already had records).
- **Scenario generator net-worth bias.** `getNetWorthRatio` was recomputing
  a worse net-worth that ignored short liability and margin, so heavily-
  shorted players appeared richer than they actually were and the engine
  biased toward negative events. Now uses canonical `getNetWorth` from
  `marketSimulator`.
- **Save schema validation on import.** `importSave` runs through a Zod
  schema with `passthrough()`. Corrupt or malicious imports get rejected
  with a console warning instead of silently entering invalid state and
  crashing on first access.
- **`pickRandomN` shuffle bias.** Replaced
  `arr.sort(() => rng() - 0.5)` with a proper Fisher-Yates partial shuffle.
- **ID collisions.** All transaction / news / split / margin-call IDs now
  use `crypto.randomUUID()` instead of `Date.now()` + module-level
  counters. Eliminates same-millisecond collisions and cross-session reuse.
- **`executeShort` margin rounding** is now consistent in both new- and
  existing-position branches.
- **`placeLimitOrder` validation** for `targetPrice > 0` and `shares > 0`.

### Removed

- Dead `NewsEvent.expiresAt` field — set by generator, never read by
  `calculateNewPrice`. Removing keeps current one-shot impact behavior.
- Inline duplicate of `getGameConfig` in `scenarioGenerator` — now uses
  imported `DIFFICULTY_CONFIGS` directly.

### Added

- `vitest` dev dependency and `test` / `test:run` scripts.
- `src/engine/__tests__/marketSimulator.test.ts` — covers the short PnL
  fix, core trading flows, and game-over detection.

### Notes

- Long-side margin config (`marginRequirement`, `marginEnabled`) is still
  inert. `executeBuy` doesn't read it. Left untouched pending a decision
  on whether to wire it up or remove it.
- The `(Math.random() - 0.48)` upward drift in `calculateNewPrice` still
  compounds over long runs. That's a balance choice, not a bug, and is
  unchanged here.
- `O(turn²)` cost from cloning full price/news/transaction history every
  turn is unchanged. Will start to matter past ~150 turns.

## [1.0.0] — 2026-04-26

Initial commit. Turn-based stock market sim — 60 stocks across 12 sectors,
4 difficulty levels, margin trading, short selling, 600+ market events.

[1.5.0]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.3.0...v1.4.0
[1.2.2]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.2.1...v1.2.2
[1.3.0]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/jonathanwxh-cell/stock-simulator/releases/tag/v1.0.0
