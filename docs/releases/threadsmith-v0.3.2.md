# Threadsmith v0.3.2

Threadsmith `v0.3.2` is a tiny patch release for the public `v0.3.x` Skill
Orchestrator line.

It does not add a new workflow feature. It makes the public source archive and
committed release truth line up after the `v0.3.1` release exposed invalid
`.threadsmith` schema values in smoke E2E checks.

## What Changed

### Release Truth Schema Alignment

The committed `.threadsmith` release truth now uses schema-valid acceptance and
active-work values, including:

- `implementationStatus: ready-for-review`
- `reviewStatus: ready-for-verification`
- `verificationStatus: passed`
- `finalState: accepted-with-closeout-pending`
- closeout active work represented with a valid `running` status

### Source Archive Consistency

The homepage smoke E2E expectations, package versions, README status, usage
guide, and front-door copy now point at `v0.3.2` as the latest stable patch
release.

This avoids the confusing state where the GitHub Release exists, but a fresh
checkout or source archive still says the project is preparing an older release.

## Verification

This patch should be verified with:

```bash
npm ci
npm run test
npm run build
npm run verify:launchers
npm run test:e2e
npm audit --audit-level=moderate
git diff --check
```

The final release also depends on GitHub Actions passing after the tag is pushed.

## Current Limits

`v0.3.2` keeps the same product boundaries as `v0.3.0` and `v0.3.1`:

- Codex-first stable path
- no fully automated multi-provider execution
- no arbitrary external skill auto-execution
- no native desktop app packaging
- no hosted backend, embeddings, or RAG
- no replacement for the main Codex / CLI / Claude Code conductor conversation

