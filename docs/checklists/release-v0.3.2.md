# Threadsmith Release Checklist - v0.3.2

Use this checklist before tagging or publishing `v0.3.2`.

`v0.3.2` is a patch release for release truth schema alignment. It should not
introduce a new product scope beyond `v0.3.1`.

## Scope Check

- [x] Committed `.threadsmith` acceptance state uses valid schema enum values.
- [x] Committed `.threadsmith` active work uses valid role status values.
- [x] Homepage E2E expectations match the current release truth.
- [x] README, usage guide, front-door copy, and release docs point to `v0.3.2`
  as the latest stable patch release.
- [x] No new multi-provider, desktop packaging, hosted backend, RAG, or external
  skill auto-execution scope is included.

## Verification Check

- [x] `npm ci`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run verify:launchers`
- [x] `npm run test:e2e`
- [x] `npm audit --audit-level=moderate`
- [x] public scan
- [x] `git diff --check`
- [ ] GitHub Actions CI after push

## Publish Check

- [x] Package versions are `0.3.2`.
- [x] `CHANGELOG.md` contains a dedicated `v0.3.2` section.
- [x] `docs/releases/threadsmith-v0.3.2.md` is ready.
- [x] `docs/marketing/github-release-v0.3.2.md` is ready to paste into GitHub
  Release.
- [ ] Create tag `v0.3.2`.
- [ ] Create GitHub Release `Threadsmith v0.3.2`.

## Non-goals

- Fully automated multi-provider execution.
- Arbitrary external skill auto-execution.
- Native desktop app packaging.
- Hosted backend, embeddings, or RAG.
- Replacing the user's main conductor conversation.
