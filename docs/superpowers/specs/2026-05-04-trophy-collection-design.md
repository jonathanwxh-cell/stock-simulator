# Trophy Collection Design

## Goal

Add a low-friction trophy and achievement collection that gives players long-term goals without adding new trading chores. Trophies should unlock naturally from normal play, display unique collectible art, and make every run feel like it contributed to the player's fund legacy.

## Player Experience

Players see trophy progress from a new Trophy Room screen. During play, unlocks appear as short celebratory overlays that do not block trading or turn advancement. Locked trophies appear as frosted silhouettes; unlocked trophies show colorful, unique SVG artwork and rarity styling.

The first version ships with five collections:

- First Steps
- Trading Styles
- Market Mastery
- Risk Control
- Collector Badges

Each collection shows unlocked count, total count, and progress percentage. Individual trophies show name, short description, rarity, unlocked state, and an unlock date when available.

## Architecture

The trophy system is a pure engine module plus small persistence helpers. Trophy progress is stored separately from individual save slots in localStorage so it survives completed runs, lost runs, and career continuation. Game state remains the input for unlock evaluation, but the trophy collection belongs to the player profile rather than a single run.

Core files:

- `src/engine/trophySystem.ts` defines trophy metadata, unlock rules, persistence, and collection summaries.
- `src/components/trophies/TrophyArt.tsx` renders unique SVG trophy art from metadata.
- `src/components/trophies/TrophyUnlockToast.tsx` renders non-blocking unlock celebrations.
- `src/pages/TrophyRoom.tsx` displays the collection gallery.
- `src/context/GameContext.tsx` runs trophy checks after key game actions and exposes new unlocks to the UI.

## Unlock Timing

The engine checks trophies after:

- new game start
- buy/sell/short/cover trades
- watchlist changes
- turn advancement
- game over / completed season state
- career continuation

The checks are idempotent: already unlocked trophies are ignored. New unlocks are saved immediately and returned to the UI for toast display.

## Starter Trophy Set

The first pass includes at least 32 trophies:

- First Steps: first trade, first buy, first sale, first watched stock, first season, first board review.
- Trading Styles: Growth Hunter start, Dividend Baron start, Contrarian start, Short Shark start, Long-Only player, Small-Cap Sprint player.
- Market Mastery: beat the market, positive alpha, high net worth milestones, S-rank season, season streak.
- Risk Control: low-risk finish, no margin win, long-only win, recovery from drawdown.
- Collector Badges: sector diversity, dividend collector, catalyst watcher, stock universe explorer, all challenge modes sampled.

## Visual Direction

The trophy room should feel like a neon fund vault rather than a generic achievement list. Cards use deep glass panels, rarity glows, and compact SVG illustrations. Each trophy's SVG composition is unique enough to be recognizable at small sizes: bells, shields, rockets, laurels, coin fountains, storm desks, market wheels, and crystal towers.

## Testing

Engine tests cover:

- first unlock from a new collection
- idempotent unlock behavior
- persistence roundtrip
- collection summaries
- milestone unlocks from representative game state

Browser playtests cover:

- navigating to Trophy Room from title/settings or in-game chrome
- unlocking a trophy after first buy
- seeing a toast without blocking next-turn flow
- verifying locked and unlocked art states render on desktop and mobile
