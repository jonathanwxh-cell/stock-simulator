# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.1.0]: https://github.com/jonathanwxh-cell/stock-simulator/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/jonathanwxh-cell/stock-simulator/releases/tag/v1.0.0
