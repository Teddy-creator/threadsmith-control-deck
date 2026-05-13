# Threadsmith v0.3.1

Threadsmith `v0.3.1` is a patch release for the public `v0.3.x` Skill
Orchestrator line.

It does not add a new automation model. Instead, it makes the public release
surface more accurate: risk review is now documented as an advisory route, and
the public repository no longer carries maintainer-local Codex skill paths in
examples or tests.

## What Changed

### Advisory Risk Review Documentation

The README, usage guide, changelog, and `v0.3.0` release notes now explain that
Threadsmith can surface high-cost decision risk before commitment.

Examples include:

- release / publish
- public product claims
- skipped verification
- broad architecture change
- provider / tooling / credential changes
- destructive operations

The route can recommend `critical-decision-review` and carry that recommendation
into role packets or command bridge artifacts.

### Boundary Clarification

Risk review remains deliberately bounded:

- no hidden `critical-decision-review` auto-run
- no hard risk-review blocking gate
- no arbitrary external skill execution
- low-risk, reversible changes should return to normal workflow instead of
  triggering ritualized review friction

### Public Repository Hygiene

The public repository examples now use neutral Codex skill paths such as
`~/.codex/skills/...` or `/home/user/.codex/skills/...` instead of
maintainer-local absolute paths.

The public scan guidance was also tightened so ordinary product language about
token budgets is not treated as a credential finding.

## Verification

This patch was verified with:

```bash
npm ci
npm run test
npm run build
npm run verify:launchers
npm audit --audit-level=moderate
git diff --check
```

The public GitHub Actions CI also validates workspace tests, build, launcher
checks, smoke E2E tests, and Windows launcher checks.

## Current Limits

`v0.3.1` keeps the same product boundaries as `v0.3.0`:

- Codex-first stable path
- no fully automated multi-provider execution
- no arbitrary external skill auto-execution
- no native desktop app packaging
- no hosted backend, embeddings, or RAG
- no replacement for the main Codex / CLI / Claude Code conductor conversation
