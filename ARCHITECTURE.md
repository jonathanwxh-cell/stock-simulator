# Architecture

## Directory Layout

```
src/
├── audio/           # Sound system — no DOM, no React
│   ├── audioEngine.ts    # Web Audio API synthesizer (SFX)
│   └── musicEngine.ts    # BGM player (loads MP3 from public/audio/music/)
├── components/      # Shared UI shell (Layout, Navbar, Footer)
├── context/         # React state management
│   └── GameContext.tsx    # Central reducer: GameProvider + useGame() hook
├── engine/          # Pure game logic — ZERO DOM/React imports
│   ├── types.ts          # All TypeScript interfaces
│   ├── config.ts         # Difficulty configs, sector definitions, constants
│   ├── rng.ts            # RNG interface + MathRandomRNG + SeededRNG (mulberry32)
│   ├── gameState.ts      # Trade execution (buy/sell/short/cover), limit orders, game creation
│   ├── marketSimulator.ts # Turn simulation: price calc, margin calls, dividends, splits
│   ├── scenarioGenerator.ts # News events and market scenarios
│   ├── stockData.ts      # Thin loader for data/stocks.json (26 lines)
│   ├── cloneState.ts     # Deep clone utility (shared by engine functions)
│   ├── saveSystem.ts     # Save/load system (IndexedDB, 3 slots + auto)
│   ├── leaderboard.ts    # High score tracking (IndexedDB)
│   ├── index.ts          # Barrel export for all engine modules
│   ├── data/
│   │   ├── news-templates.json   # Sector-specific news headlines + descriptions
│   │   └── stocks.json           # 60 stock definitions (pure data, no logic)
│   └── __tests__/        # Vitest test suite (50 tests across 6 files + 1 helper)
├── hooks/           # Custom React hooks
│   ├── useAudio.ts       # Audio controls (volume, mute, unlock)
├── lib/             # Shared utilities (cn, etc.)
├── pages/           # 13 route-level components
    ├── TitleScreen.tsx      # Start screen — new game, load, settings
    ├── StockMarket.tsx      # Main dashboard — stock list, portfolio summary
    ├── StockDetail.tsx      # Individual stock view + trade execution
    ├── Portfolio.tsx        # Full portfolio breakdown
    ├── TradingModal.tsx     # Buy/sell/short/cover modal dialog
    ├── NewsPanel.tsx        # Breaking news and market events
    ├── NextTurn.tsx         # Turn summary — price changes, events
    ├── GameHUD.tsx          # In-game header bar (cash, net worth, turn)
    ├── GameOver.tsx         # Final grade and performance summary
    ├── HowToPlay.tsx        # Tutorial / instructions
    ├── LoadSave.tsx         # Save/load slot selection
    ├── SettingsPage.tsx     # Sound, music, difficulty settings
    └── LeaderboardPage.tsx  # High score table
```

## Engine Purity

`src/engine/` has **zero DOM, zero React, zero framer-motion imports**. This is enforced by convention (verified: `grep -rn "from 'react'" src/engine/*.ts` returns nothing). All engine functions are pure: `(GameState, ...args) => GameState | TradeResult`. This makes them trivially testable without mocking the DOM.

## State Flow

```
User action → GameContext callback → engine pure function → dispatch(UPDATE_GAME_STATE)
                                                              ↓
                                                        useReducer
                                                              ↓
                                                        React re-render
                                                              ↓
                                                        autoSave(newState) → IndexedDB
```

- **GameContext.tsx** owns all state via `useReducer`. No other component writes to game state.
- **Engine functions** receive state and return new state (or `TradeResult`). They never mutate.
- **Save system** uses IndexedDB (via `idb` library). 3 manual slots + auto-save.
- **Settings** persisted to localStorage separately.

## Randomness

All randomness in the engine goes through a `RNG` interface (`src/engine/rng.ts`). This enables deterministic replay and reproducible tests.

**Interface:**
```ts
export interface RNG {
  next(): number;              // [0, 1)
  int(min: number, max: number): number;   // inclusive
  range(min: number, max: number): number; // continuous
  pick<T>(arr: T[]): T;
  pickN<T>(arr: T[], n: number): T[];      // Fisher-Yates partial
}
```

**Two backends:**
- `MathRandomRNG` — wraps `Math.random()`, default for production
- `SeededRNG(seed)` — mulberry32, deterministic. Same seed → same sequence.

**Injection pattern:** Functions that need randomness accept an optional `rng?: RNG` parameter, defaulting to a shared `MathRandomRNG` instance. This keeps existing call sites unchanged in production:

```ts
// Production — works exactly as before
simulateTurn(state);

// Tests — deterministic
simulateTurn(state, new SeededRNG(42));
```

**Functions that accept RNG:**
- `simulateTurn(state, rng?)` — orchestrates all per-turn randomness
- `generateScenario(state, rng?)` — scenario type, events, sector effects
- `generateNewsEvent(state, sector?, impact?, rng?)` — news template selection

**No `Math.random()` calls exist in the engine** outside of `rng.ts` (the `MathRandomRNG` class). This is verified by: `grep -rn "Math\.random" src/engine/ --include="*.ts" | grep -v rng.ts`.

**Using seeded RNG for debugging:** To replay a specific game sequence, pass the same seed to every `simulateTurn` call. The seed and call count are accessible via `rng.getSeed()` and `rng.getCallCount()`.

## Audio System

Two independent modules under `src/audio/`:

**SFX** (`audioEngine.ts`): Pure Web Audio API synthesis using OscillatorNode + GainNode envelopes. No external assets.

14 exported `play*` functions:
- `playBuy`, `playSell`, `playShort`, `playCover` — trade confirmations
- `playDividend`, `playBankrupt`, `playMarginCall` — financial events
- `playTurn`, `playGameStart`, `playGameOver` — game lifecycle
- `playNews`, `playLevelUp` — market events
- `playClick`, `playError` — UI feedback

**BGM** (`musicEngine.ts`): Loads pre-generated MP3 files from `public/audio/music/`:
- `title.mp3` — title screen music
- `gameplay.mp3` — main game loop (loops seamlessly)

Both gated by `settings.soundEnabled` / `settings.musicEnabled`. Audio context requires user gesture to start (handled in `App.tsx` via `AudioUnlock` component).

## Adding Things

**New SFX:** Add an `export function playXxx()` in `audioEngine.ts`. Call it from `GameContext.tsx` at the appropriate dispatch point.

**New news event:** Add a template to `src/engine/data/news-templates.json` under the relevant sector. Templates use `{company}` and `{sector}` placeholders. The scenario generator picks from these based on sector and difficulty.

**New stock:** Add an entry to `src/engine/data/stocks.json`. Required fields: `id`, `ticker`, `name`, `sector`, `basePrice`, `dividendYield`, `volatility`, `beta`. The loader in `stockData.ts` adds `currentPrice`, `splitMultiplier`, and `priceHistory` at load time.

**New sector:** Add to `SECTOR_COLORS`, `SECTOR_LABELS`, `SECTOR_EFFECTS` in `config.ts`, and add the `Sector` union type in `types.ts`. Then add stocks and news templates for it.

## Why No shadcn

shadcn/ui was installed in the initial scaffold but never used. All UI is built with Tailwind utility classes and custom CSS variables (`var(--surface-1)`, `var(--text-primary)`, etc.). Unused Radix/shadcn dependencies were removed in v1.3.0. If you need a complex UI primitive (dialog, dropdown, etc.), install the specific Radix component directly.
