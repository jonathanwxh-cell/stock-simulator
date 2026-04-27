# Architecture

## Directory Layout

```
src/
├── audio/           # Sound system — no DOM, no React
│   ├── audioEngine.ts    # Web Audio API synthesizer (SFX)
│   └── musicEngine.ts    # BGM player (loads MP3 from public/audio/music/)
├── components/      # Shared UI atoms (mostly unused after shadcn removal)
├── context/         # React state management
│   └── GameContext.tsx    # Central reducer: GameProvider + useGame() hook
├── engine/          # Pure game logic — ZERO DOM/React imports
│   ├── types.ts          # All TypeScript interfaces
│   ├── config.ts         # Difficulty configs, sector definitions, constants
│   ├── gameState.ts      # Trade execution (buy/sell/short/cover), limit orders, game creation
│   ├── marketSimulator.ts # Turn simulation: price calc, margin calls, dividends, splits
│   ├── scenarioGenerator.ts # News events and market scenarios
│   ├── leaderboard.ts    # High score tracking (IndexedDB)
│   ├── save.ts           # Save/load system (IndexedDB, 3 slots + auto)
│   ├── clone.ts          # Deep clone utility (shared by engine functions)
│   ├── data/             # Static data (news-templates.json)
│   └── __tests__/        # Vitest test suite (41 tests, 5 files)
├── hooks/           # Custom React hooks
│   ├── useAudio.ts       # Audio controls (volume, mute, unlock)
│   └── useTheme.ts       # Dark/light mode persistence
├── lib/             # Shared utilities (cn, etc.)
└── pages/           # Route-level components
    ├── TitleScreen.tsx
    ├── StockMarket.tsx    # Main dashboard
    ├── StockDetail.tsx    # Individual stock + trade execution
    ├── NextTurn.tsx       # Turn summary
    ├── GameOver.tsx
    ├── NewGame.tsx
    ├── SettingsPage.tsx
    └── Leaderboard.tsx
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

## Audio System

Two independent modules:

**SFX** (`audioEngine.ts`): Pure Web Audio API synthesis. 13 sounds generated from oscillators:
- `buy`, `sell`, `short`, `cover` — trade confirmations
- `profit`, `loss` — P&L feedback
- `news`, `alert`, `dividend`, `split` — market events
- `click`, `error`, `levelUp` — UI feedback

**BGM** (`musicEngine.ts`): Loads pre-generated MP3 files from `public/audio/music/`:
- `title.mp3` — title screen
- `gameplay.mp3` — main game loop (30s, loops seamlessly)
- `next-turn.mp3` — turn transition
- `game-over.mp3` — end screen

Both gated by `settings.soundEnabled` / `settings.musicEnabled`. Audio context requires user gesture to start (handled in `App.tsx`).

## Adding Things

**New SFX:** Add an `export function playXxx()` in `audioEngine.ts`. Call it from `GameContext.tsx` at the appropriate dispatch point.

**New news event:** Add a template to `src/engine/data/news-templates.json` under the relevant sector. Templates use `{company}` and `{sector}` placeholders. The scenario generator picks from these based on sector and difficulty.

**New stock:** Add an entry to the `INITIAL_STOCKS` array in `config.ts`. Required fields: `id`, `ticker`, `name`, `sector`, `currentPrice`, `basePrice`, `dividendYield`, `volatility`, `beta`.

**New sector:** Add to `SECTOR_COLORS`, `SECTOR_LABELS`, `SECTOR_EFFECTS` in `config.ts`, and add the `Sector` union type in `types.ts`. Then add stocks and news templates for it.

## Why No shadcn

shadcn/ui was installed in the initial scaffold but never used. All UI is built with Tailwind utility classes and custom CSS variables (`var(--surface-1)`, `var(--text-primary)`, etc.). The 33 unused Radix/shadcn dependencies were removed in v1.3.0. If you need a complex UI primitive (dialog, dropdown, etc.), install the specific Radix component directly.
