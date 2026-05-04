# Project Roadmap

This is the quick reference for where the stock simulator is now, what has shipped, and which planning docs to open next. Detailed specs and step-by-step plans still live under `docs/superpowers/`.

## Current Direction

The game is becoming a fictional-market career sim: low-friction trading, readable market signals, trophy/collection goals, and a longer-running Market Saga loop where one ending can seed the next season.

## Shipped Phase Map

| Area | Status | Reference |
| --- | --- | --- |
| Core gameplay milestone: advanced orders, rebalancing, portfolio-vs-benchmark chart | Shipped | [Plan](superpowers/plans/2026-05-02-stock-simulator-core-gameplay-milestone.md), [Design](superpowers/specs/2026-05-02-stock-simulator-core-gameplay-milestone-design.md) |
| Actionable market depth: watchlists, catalysts, market pulse, richer recap | Shipped | [Plan](superpowers/plans/2026-05-02-stock-simulator-actionable-market-depth.md), [Design](superpowers/specs/2026-05-02-stock-simulator-actionable-market-depth-design.md) |
| Phase 2 strategy layer: traits, macro backdrop, scanner, research briefs | Shipped | [Plan](superpowers/plans/2026-05-03-stock-simulator-phase-2-strategy-layer.md), [Design](superpowers/specs/2026-05-03-stock-simulator-phase-2-strategy-layer-design.md) |
| Guided market coach and trading-language simplification | Shipped | [Coach Plan](superpowers/plans/2026-05-04-stock-simulator-guided-market-coach.md), [Trading UX Plan](superpowers/plans/2026-05-04-stock-simulator-trading-language-simplification.md) |
| Trophy collection | Shipped | [Plan](superpowers/plans/2026-05-04-trophy-collection.md), [Design](superpowers/specs/2026-05-04-trophy-collection-design.md) |
| Career longevity and season continuation | Shipped | [Plan](superpowers/plans/2026-05-04-stock-simulator-career-longevity.md) |
| Market Saga legacy story mode, Phase 1 | Shipped | [Plan](superpowers/plans/2026-05-04-market-saga-legacy-story-mode.md), [Design](superpowers/specs/2026-05-04-market-saga-legacy-story-mode-design.md) |

## Active Product Pillars

- Frictionless play: make the next good action obvious without turning the game into autopilot.
- Fictional but believable market: keep stock names, tickers, news, and sectors fictional to reduce real-world brand/legal risk.
- Repeat-run longevity: vary seasons, objectives, rivals, trophies, and saga outcomes so a run is not just a reset.
- Learn-by-playing UX: explain trade intent, risk, and market context at the moment the player needs it.
- Clear endgame momentum: every ending should either feel like closure, a trophy chase, or a hook into the next chapter.

## Suggested Next Phases

| Priority | Phase | Why It Matters |
| --- | --- | --- |
| 1 | Market Saga Phase 2: recurring rivals, sequel events, and branching callbacks | Makes repeat careers feel authored instead of just randomized. |
| 2 | Trophy room polish: collection sets, progress hints, and rare showcase states | Gives players long-term goals outside net worth alone. |
| 3 | New-player guided first run | Reduces confusion around buying, selling, risk, and turn flow in the first five minutes. |
| 4 | Season modifier visibility | Makes the current market regime and challenge rules easier to remember while playing. |
| 5 | Release hygiene pass | Convert `[Unreleased]` into versioned releases when milestones are stable, then tag and publish. |

## Release References

- Player-facing changes are summarized in [CHANGELOG.md](../CHANGELOG.md).
- GitHub release entries should mirror the changelog section for each tag.
- Before a new release, verify `npm.cmd run test:run`, `npm.cmd run lint`, and `npm.cmd run build`.

