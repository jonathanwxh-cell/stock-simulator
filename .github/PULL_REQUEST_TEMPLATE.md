## Summary
<!-- 1-3 bullets on what changes and why -->

## Linked issue
<!-- e.g. Closes #12 -->

## Agent
<!-- Which agent authored the bulk of this PR? Helps with attribution and coordination per AGENTS.md. -->
- [ ] `agent:claude`
- [ ] `agent:codex`
- [ ] human

## Scope confirmation
<!-- Per AGENTS.md, the agent that opens a PR owns its files until merge. -->
- [ ] No open PR is currently touching the same files (checked `gh pr list`)
- [ ] If this PR modifies `package-lock.json`, the `deps:locked` label is applied and no other lockfile-touching PR is open

## Test plan
- [ ] `npm run test:run` passes
- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] Manual smoke test (start a game, place a trade, advance a turn) where applicable

## Changelog
<!-- Add an entry under [Unreleased] in CHANGELOG.md if user-visible. Refactors and test-only changes can skip. -->
