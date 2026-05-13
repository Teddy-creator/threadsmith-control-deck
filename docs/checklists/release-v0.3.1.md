# Threadsmith Release Checklist - v0.3.1

Use this checklist before tagging or publishing `v0.3.1`.

`v0.3.1` is a patch release for public documentation accuracy and repository
hygiene. It should not introduce a new product scope beyond `v0.3.0`.

## Scope Check

- [x] README mentions advisory risk-review support without implying auto-run.
- [x] Usage guide explains that `critical-decision-review` remains explicit and
  advisory.
- [x] Release notes include the no-auto-run / no-blocking-gate boundary.
- [x] Public examples no longer use maintainer-local absolute Codex skill
  paths.
- [x] Public scan guidance avoids flagging ordinary token-budget product copy as
  a credential finding.

## Verification Check

- [x] `npm ci`
- [x] `npm run test`
- [x] `npm run build`
- [x] `npm run verify:launchers`
- [x] `npm audit --audit-level=moderate`
- [x] public scan
- [x] `git diff --check`
- [ ] GitHub Actions CI after push

## Publish Check

- [x] Package versions are `0.3.1`.
- [x] `CHANGELOG.md` contains a dedicated `v0.3.1` section.
- [x] `docs/releases/threadsmith-v0.3.1.md` is ready.
- [x] `docs/marketing/github-release-v0.3.1.md` is ready to paste into GitHub
  Release.
- [ ] Create tag `v0.3.1`.
- [ ] Create GitHub Release `Threadsmith v0.3.1`.

## Non-goals

- Fully automated multi-provider execution.
- Arbitrary external skill auto-execution.
- Native desktop app packaging.
- Hosted backend, embeddings, or RAG.
- Replacing the user's main conductor conversation.
