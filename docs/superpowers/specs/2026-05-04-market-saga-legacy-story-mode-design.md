# Market Saga / Legacy Story Mode Design

## Goal

Make repeated playthroughs feel like one evolving fund saga instead of disconnected runs. Each ending should become the seed for the next chapter, with enough variation that repeat players see new market conditions, rival behavior, sequel choices, and story beats without adding friction to the core stock-trading loop.

The intended emotional fantasy is: **the market remembers your fund**. A player should finish a season thinking, "That run changed my firm's story. What happens next?"

## Research Notes

- Roguelite replayability works because short runs combine procedural variation with persistent metagame progress. The current game already has short-ish seasons, trophies, rivals, and career continuation, so it can borrow the structure without becoming a dungeon crawler.
- Procedural narrative works best when it supports the player's own emergent stories instead of replacing them with repeated cutscenes. Story should be skippable, short, and grounded in actual run stats.
- Legacy-style continuity is a proven pattern: a completed or failed run creates an heir, successor, family tree, or persistent consequence. For this game, the successor is the fund itself: reputation, board trust, rival grudges, and market mythology.
- MDA framing: mechanics should produce the dynamics of "my choices have consequences across seasons," which creates the aesthetics of legacy, surprise, ambition, redemption, and discovery.

Sources used during design:

- MDA Framework: https://www.cs.northwestern.edu/~hunicke/MDA.pdf
- Rogue-lite metagame and procedural replayability overview: https://en.wikipedia.org/wiki/Roguelike
- Replay value factors: https://en.wikipedia.org/wiki/Replay_value
- Procedural roguelike narrative design: https://www.gamedeveloper.com/design/weaving-narratives-into-procedural-worlds
- Gameplay and story in roguelikes: https://www.gamedeveloper.com/design/balancing-act-gameplay-and-story-in-roguelikes

## Current Foundation

The codebase already supports most of the necessary hooks:

- `src/engine/careerSeasons.ts` has season themes, challenge modes, career continuation, goals, and unlocks.
- `src/engine/careerSystem.ts` has fund archetypes, rival funds, board reviews, objectives, and league standings.
- `src/engine/trophySystem.ts` has cross-run collection pressure and persistent achievement identity.
- `src/engine/completion.ts` records completed runs and creates leaderboard entries.
- `src/pages/GameOver.tsx` is the natural place to introduce "what this ending means" and "choose your next chapter."

The missing layer is a small deterministic story director that reads the completed run and produces:

- A short epilogue.
- A named ending archetype.
- Two or three sequel offers.
- A compact legacy record saved across seasons.
- Optional story modifiers for the next season.

## Tone

Use a balanced mix:

- Serious enough to feel like fund management: board pressure, rivals, capital mandates, reputation, drawdowns, style identity.
- Playful enough to avoid dry finance: market legends, absurd headline seasons, rival trash talk, mythic trophy language, rare weird events.

Avoid parody overload. The UI should feel like a glossy financial drama with occasional sparks of roguelite chaos.

## Core Player Flow

### Existing Flow

1. Player starts a run.
2. Player trades through turns.
3. The game ends by success, failure, or reaching a limit.
4. Game Over shows results.
5. Player can play again or continue career.

### New Flow

1. Player completes a season.
2. `LegacyDirector` evaluates the completed `GameState`.
3. Game Over shows a **Legacy Epilogue** card:
   - Ending title.
   - One or two sentence story recap.
   - Key tags such as `AI Darling`, `Leverage Scar`, `Dividend Cult Hero`, `Rival Slayer`.
   - Legacy impact summary.
4. Game Over shows **Choose Next Chapter** with three sequel offers:
   - One safer boardroom path.
   - One chaotic market path.
   - One personalized redemption or ascension path.
5. Player chooses a sequel.
6. `continueCareer` starts the next season with the selected saga modifier.
7. A **Legacy Archive** stores what happened for Phase 2 viewing.

## New Domain Model

### LegacyEnding

Represents what the completed season "meant."

Fields:

- `id`: stable ending id.
- `title`: player-facing ending name.
- `tone`: `triumph | survival | collapse | scandal | legend`.
- `summary`: short epilogue text.
- `tags`: compact story labels.
- `grade`: final grade.
- `seasonNumber`: completed season number.
- `runId`: source run id.
- `createdAtTurn`: completion turn.
- `createdAtDate`: completion date.
- `drivers`: structured reasons used to generate offers.

Example endings:

- `market_crowned`: strong grade, positive alpha, controlled risk.
- `reckless_rocket`: high returns with high or extreme risk.
- `cashflow_royalty`: dividend-heavy success.
- `short_squeeze_scar`: short-heavy loss or margin call.
- `sector_prophet`: major success concentrated in one sector.
- `quiet_survivor`: mediocre grade but avoided disaster in harsh conditions.
- `boardroom_fire`: failing grade, high drawdown, or unmet objective.

### LegacyPathOffer

Represents a next-season choice.

Fields:

- `id`: stable offer id.
- `title`: choice card title.
- `subtitle`: short flavor line.
- `description`: gameplay-facing explanation.
- `tone`: `stable | volatile | redemption | prestige | weird`.
- `arcId`: saga arc this belongs to.
- `nextThemeId`: season theme to apply.
- `challengeMode`: optional challenge mode override.
- `modifierIds`: list of lightweight modifiers.
- `rivalFocusId`: optional rival fund id.
- `rewardPreview`: what unlock/progress is at stake.

Example offers:

- **Board Confidence Mandate**: larger capital expectations, safer objective mix.
- **AI Bubble Backlash**: high tech volatility, stronger semiconductor tailwinds early, crash risk in the final third of the season.
- **Redemption Tour**: easier goal, stricter risk review, bonus trophy for comeback.
- **Hostile Rival Campaign**: one rival gains edge and taunts the player through board reviews.
- **Dividend Dynasty**: lower volatility, dividend objectives, slower but steadier scoring.

### LegacyRecord

Persistent saga history.

Fields:

- `version`: migration guard.
- `fundId`: persistent id for the player's fund legacy.
- `endings`: recent and historic endings.
- `chosenPaths`: sequel choices made.
- `rivalMemory`: grudges, rivals defeated, rivals outperforming player.
- `arcProgress`: progress through active story arcs.
- `seenEventIds`: prevents stale repetition.
- `rareEventPity`: increases odds of rare events after dry streaks.

Storage should be local-first, similar to trophy case storage. Cloud sync is out of scope until the cloud save layer becomes the canonical cross-device profile store.

## Saga Arcs

Arcs are reusable story containers. Each arc should be modular, not a fully branching novel.

### Arc 1: Boardroom Ascent

Fantasy: the fund becomes institutional. The board gives more capital, bigger targets, and less tolerance for sloppy risk.

Triggers:

- A or S grade.
- Positive alpha.
- Low or medium risk.

Gameplay:

- Higher target.
- More board reviews.
- Prestige-flavored objectives.
- Rival funds become more aggressive.

### Arc 2: Redemption Tour

Fantasy: the fund stumbled, but the next season can save its reputation.

Triggers:

- D or F grade.
- Margin call.
- Severe drawdown.
- Failed board objective.

Gameplay:

- Moderate target.
- Stricter risk cap.
- Comeback rewards.
- Board commentary remembers the prior failure.

### Arc 3: Mania And Backlash

Fantasy: the player rode or missed a speculative boom, and the market now reacts.

Triggers:

- Heavy concentration in technology, semiconductors, biotech, or media.
- Strong gains with high volatility.
- AI Mania season completion.

Gameplay:

- Sector-specific volatility.
- More catalyst events.
- Rare crash/rebound event chain.
- Rival may become a hype-chaser.

### Arc 4: Credit Winter

Fantasy: liquidity tightens. Cash, dividends, and risk discipline matter.

Triggers:

- Credit Crunch season.
- High margin usage.
- Poor cash buffer.
- Real estate or financials exposure.

Gameplay:

- Negative broad drift.
- Higher penalty for extreme risk.
- Defensive sectors get a mild tailwind.
- Board rewards survival and cash discipline.

### Arc 5: Rival Grudge

Fantasy: the player's relationship with rival funds becomes personal.

Triggers:

- Player repeatedly beats the same rival.
- Rival repeatedly beats player.
- Player and rival share the same style.

Gameplay:

- Rival focus card on HUD.
- Rival gets a temporary edge in league simulation.
- Special objective: beat or survive rival this season.
- Ending can resolve, intensify, or transfer the grudge.

## Variation Rules

The system should avoid stale repetition without making the game unpredictable in a bad way.

Rules:

- Do not show the same `LegacyPathOffer.id` twice in a row.
- Prefer arcs connected to the completed run, but always include one wildcard offer.
- Avoid repeating the same season theme if it was used in the last two seasons, unless the player explicitly chooses a challenge mode that maps to it.
- Increase rare event odds slightly after each completed season with no rare event, then reset after one appears.
- Use deterministic seeded selection from `runId`, `seasonNumber`, and `ending.id` so tests remain stable.
- Keep all story text short. No modal should require reading more than about 80 words to continue.

## Image And Asset Strategy

Phase 1 does not require external generated raster images. Use:

- Existing icon style from `lucide-react`.
- Inline SVG crests for path cards.
- CSS gradients and metallic card treatments.

Generate bespoke images only when they add clear value:

- Saga archive hero banners.
- Rare arc illustrations.
- Rival portrait cards.
- Chapter splash art for major milestones.

If generated images are introduced, they should be:

- Fictional and generic, no real logos or public figures.
- Stored under `public/assets/legacy/`.
- Named by stable art key, e.g. `legacy-boardroom-ascent.webp`.
- Small enough for web use, ideally under 250 KB each after optimization.

Initial art keys that can be implemented as SVG first:

- `boardroom_ascent`
- `redemption_tour`
- `mania_backlash`
- `credit_winter`
- `rival_grudge`
- `wildcard_market`

## UX Surfaces

### Game Over Additions

Add a `LegacyEpilogueCard` above or near season recap:

- Ending title.
- Summary text.
- Three tags.
- "Legacy Impact" mini-stat row.

Add `NextChapterPicker` below results:

- Three cards.
- Each card shows tone, title, description, modifier preview, and CTA.
- Player can still choose normal Play Again if they do not want saga continuation.

### HUD Additions

For active saga seasons, add a compact `Legacy Thread` chip/card:

- Current arc title.
- One sentence reminder.
- Current rival or board pressure.
- Link to archive when the Phase 2 archive screen exists; hide this link in Phase 1.

This should not crowd out the Opportunity Board. Keep it small.

### Legacy Archive

Not required for Phase 1, but planned for Phase 2:

- Timeline of completed endings.
- Chosen paths.
- Rival history.
- Trophy links.
- Rare events discovered.

## System Boundaries

### `legacyStory.ts`

Pure engine module. No React. Responsible for:

- Evaluating endings.
- Generating sequel offers.
- Applying selected story modifier metadata to career continuation.
- Managing deterministic selection and repeat avoidance.

### `legacyStorage.ts`

Local persistence layer. Responsible for:

- Loading and saving `LegacyRecord`.
- Migration/version defaults.
- Recording completed ending and chosen path.

### React Components

- `LegacyEpilogueCard.tsx`: display-only ending recap.
- `NextChapterPicker.tsx`: display offers and call selection handler.
- `LegacyThreadCard.tsx`: optional HUD summary.

### Existing Integration Points

- `completion.ts`: can remain focused on leaderboard completion.
- `careerSeasons.ts`: should accept or be wrapped by the selected sequel path to start the next season with the desired theme/challenge.
- `GameOver.tsx`: primary UX integration.
- `GameContext.tsx`: likely needs one action to continue career via a chosen legacy path.

## Phase Plan

### Phase 1: Endings Become Sequel Offers

Build:

- `LegacyEnding` evaluation.
- Three sequel offers on Game Over.
- Continue career with chosen path.
- Unit tests for ending classification and offer variation.
- Browser playtest that completes a run and selects a next chapter.

Definition of done:

- A completed run always shows a specific epilogue.
- The next run can start from a selected story path.
- Repeating the same ending does not produce the exact same offer ordering.
- Existing Play Again and normal career continuation are not broken.

### Phase 2: Legacy Archive And Rival Memory

Build:

- Persistent `LegacyRecord`.
- Timeline screen or modal.
- Rival memory in next-season text.
- More ending tags and arc progress.

Definition of done:

- Player can view prior season endings.
- Rival grudge/praise persists across seasons.
- Archive survives app reload.

### Phase 3: Rare Story Chains

Build:

- Rare multi-season events.
- Event pity counter.
- Arc-specific trophies.
- Optional generated hero art if needed.

Definition of done:

- Some events require prior endings or choices.
- Players can discover content across multiple playthroughs.
- Rare content never blocks normal progression.

## Testing Strategy

Unit tests:

- Ending classification for triumph, collapse, risky success, dividend success, and short-squeeze failure.
- Offer generation always returns three offers.
- Offer generation avoids immediate repeats when legacy history exists.
- Selected path maps to expected season theme/challenge modifier.
- Legacy storage migrates empty or old data safely.

Integration tests:

- Completing a game produces an epilogue on Game Over.
- Choosing a next chapter starts a new playable season.
- Existing Play Again remains available.

Browser smoke:

- Start a run.
- Fast-forward or simulate completion.
- Confirm epilogue and three choices render.
- Choose one.
- Confirm HUD shows next season and optional legacy thread.

## Risks And Mitigations

- **Risk: too much reading.** Keep story text short and skippable.
- **Risk: content gets repetitive.** Use modular offers, repeat avoidance, and rare-event pity.
- **Risk: system becomes hard to test.** Keep director pure and deterministic.
- **Risk: story choices feel cosmetic.** Every path must map to at least one gameplay modifier, theme, challenge, rival, or objective.
- **Risk: visual asset scope balloons.** Use SVG/UI art for Phase 1; only generate raster hero art for Phase 3 major arcs.

## Scope Decisions

Resolved:

- Tone: balanced financial drama plus playful market chaos.
- First implementation slice: ending epilogue plus next-chapter offers.
- Images: not required for Phase 1; generate only when bespoke chapter/rival art clearly improves the feature.

Out of Phase 1 scope:

- Whether Legacy Archive should be a full route or a modal.
- Whether generated hero art should be WebP, AVIF, or inline SVG-only.
- Whether cloud sync should include legacy profile data.
