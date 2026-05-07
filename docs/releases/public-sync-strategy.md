# Public Sync Strategy

Threadsmith currently uses two repositories on purpose:

- private working repository: `Teddy-creator/Threadsmith`
- public release repository: `Teddy-creator/threadsmith-control-deck`

The private repository remains the development workspace. The public repository is a clean release surface with a fresh public history.

## Why We Do This

The private repository contains long-running development history, internal planning churn, local Threadsmith runtime artifacts, and experimental slices that should not become public history by accident.

The public repository should stay boring:

- no private Git history
- no local absolute paths
- no runtime `.threadsmith` artifacts from the working machine
- no internal planning docs
- no stale release claims

## Current Release Flow

1. Develop and verify in the private working repository.
2. Clean the public-facing surface in the private repository.
3. Export a clean snapshot into a separate public repository directory.
4. Reinitialize or update the public repository from that snapshot.
5. Run the public release verification matrix from the public snapshot.
6. Push `main` to `Teddy-creator/threadsmith-control-deck`.
7. Tag and publish releases from the public repository.
8. Keep the private repository private.

## Snapshot Export Rules

When exporting from the private repository to the public snapshot, exclude root-level private/runtime material:

- `.git/`
- `node_modules/`
- `dist/`
- `apps/control-deck/dist/`
- `.threadsmith-runtime/`
- `playwright-report/`
- `test-results/`
- `coverage/`
- `.vite/`
- `.superpowers/`
- `docs/superpowers/`
- root `.threadsmith/runs/`
- root `.threadsmith/action-queue.ndjson`
- root `.threadsmith/events.ndjson`
- root `.threadsmith/evidence/`
- root `.threadsmith/packets/`
- root `.threadsmith/closeouts/`
- root `.threadsmith/bridges/`
- root `.threadsmith/phase-reset-drafts/`

Important: do not exclude `examples/**/.threadsmith/events.ndjson` or `examples/**/.threadsmith/packets/`. Those are fixture data required by tests.

## Verification Before Public Push

Run these from the public snapshot:

```bash
npm ci
npm run test
npm run build
npm run verify:launchers
npm run test:e2e
npm run smoke:self-host
npm audit --audit-level=moderate
git diff --check
```

Also run a public scan:

```bash
git grep -n -E '/Users/cloud|docs/superpowers|Threadsmith App|api[_-]?key|secret|token|password|gmncode|wechat|com\.tencent|qq' -- ':!package-lock.json' ':!docs/assets/*' ':!docs/releases/public-sync-strategy.md' || true
```

Expected benign matches are currently limited to:

- `.gitignore` mentioning ignored `docs/superpowers/`
- test strings containing `Unexpected token`

## Fresh Clone Smoke

After pushing public `main`, verify the public user path from a clean clone:

```bash
rm -rf /tmp/threadsmith-public-fresh-smoke
git clone https://github.com/Teddy-creator/threadsmith-control-deck.git /tmp/threadsmith-public-fresh-smoke
cd /tmp/threadsmith-public-fresh-smoke
npm ci
npm run test
npm run build
npm run verify:launchers
```

For release candidates, also run:

```bash
npm run test:e2e
npm run smoke:self-host
```

## Tag Rule

Tags should be created in the public repository.

If `main` receives a small post-release truth or documentation update after a tag is cut, do not move the existing release tag unless the published artifact itself is wrong. Prefer a follow-up commit on `main`.

## Long-Term Options

Option A: Keep private working repo as source of truth.

- Best while Threadsmith is still highly experimental.
- Requires disciplined snapshot export.
- Avoids exposing private iteration history.

Option B: Move main development to public repo.

- Best once workflow, roadmap, and contribution model stabilize.
- Reduces sync overhead.
- Requires treating all planning and committed truth as public by default.

Current recommendation: stay on Option A until post-release feedback and all-Codex workflow polish settle.
