# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.2.1]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/jonathanwxh-cell/stock-simulator/releases/tag/v1.0.0
