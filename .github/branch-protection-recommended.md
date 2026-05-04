# Branch protection (recommended config for `main`)

GitHub branch protection cannot be enabled from a PR — it must be set in
**Settings → Branches → Add rule** (or via the GitHub API). This file documents
the recommended settings so any agent or human can re-apply them.

## Apply via the GitHub UI

Settings → Branches → Branch protection rules → Add rule

- **Branch name pattern:** `main`
- ✅ Require a pull request before merging
  - ✅ Require approvals: **1** (or 0 if solo and using AI agents only — but at least require the PR)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - **Required check:** `build` (the job name in `.github/workflows/ci.yml`)
- ✅ Require conversation resolution before merging
- ✅ Require linear history (optional but cleaner — forces rebase/squash)
- ❌ Allow force pushes — leave **off**
- ❌ Allow deletions — leave **off**

## Apply via `gh` CLI

```bash
gh api -X PUT "repos/jonathanwxh-cell/stock-simulator/branches/main/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

> Note: `required_approving_review_count: 0` lets you self-merge agent PRs
> without a human reviewer, while still requiring the PR + green CI gate.
> Bump to `1` once you have a reviewer (human or agent) who can approve.

## What this gives you

- Two agents can't both push directly to `main` and clobber each other.
- A red-CI PR cannot be merged.
- A stale branch (behind `main`) must rebase before merging — prevents the
  "merged a thing whose tests passed against old `main`" footgun.
- Force pushes to `main` are blocked — the history of `main` is permanent.
