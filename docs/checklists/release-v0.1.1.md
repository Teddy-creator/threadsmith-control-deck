# Threadsmith Release Checklist - v0.1.1

## Goal

Use this checklist before tagging or publishing `v0.1.1`.

`v0.1.1` is an onboarding polish release. It should not expand the product boundary into multi-provider automation or native desktop packaging.

## CI-safe Checks

- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] `npm run verify:launchers`
- [ ] `git diff --check`
- [ ] GitHub Actions CI is green on the release PR

## Manual Checks

- [ ] Fresh clone the public repository and confirm `npm ci`, `npm run test`, `npm run build`, and `npm run verify:launchers` pass
- [ ] Run `npm run start` and confirm the startup message points to `http://127.0.0.1:5173/?appHome=1`
- [ ] Open the front door and confirm first-run guidance explains real project connection and `.threadsmith`
- [ ] Open `Demo：已收口项目` and confirm it reads like a learning demo, not a real user project
- [ ] Open `Demo：过期交接点` and confirm stale handoff risk is understandable
- [ ] Connect a real project and confirm `刷新状态` shows a recent sync time after reload
- [ ] Confirm README screenshot still represents the current product surface closely enough

## Release Artifacts

- [ ] `CHANGELOG.md` includes `v0.1.1`
- [ ] `README.md` points to `docs/releases/threadsmith-v0.1.1.md`
- [ ] `docs/releases/threadsmith-v0.1.1.md` is ready
- [ ] `docs/marketing/github-release-v0.1.1.md` is ready to paste into GitHub Release
- [ ] `docs/guides/usage-and-llm-configuration.md` explains demo mode, refresh semantics, and `$threadsmith` boundaries
- [ ] Claims still say web-first and Codex-only
- [ ] Multi-provider automatic execution and native desktop shell remain clearly out of scope

## Publish Steps

- [ ] Squash merge the release PR into `main`
- [ ] Confirm `main` CI is green
- [ ] Create tag `v0.1.1`
- [ ] Push tag
- [ ] Create the GitHub Release using `docs/marketing/github-release-v0.1.1.md`
