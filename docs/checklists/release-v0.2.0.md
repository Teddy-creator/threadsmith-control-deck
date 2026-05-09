# Threadsmith Release Checklist - v0.2.0

## Goal

Use this checklist before tagging or publishing `v0.2.0`.

`v0.2.0` is the Context OS release. It should make Threadsmith clearly useful as a token-aware, truth-first control deck for AI coding work while staying web-first and Codex-only.

## CI-safe Checks

- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] `npm run verify:launchers`
- [ ] `npm run smoke:self-host`
- [ ] `git diff --check`
- [ ] `jq empty .threadsmith/*.json .threadsmith/context/*.json`
- [ ] GitHub Actions CI is green on the release PR

## Manual Product Checks

- [ ] Fresh clone the public repository and confirm `npm ci`, `npm run test`, `npm run build`, and `npm run verify:launchers` pass
- [ ] Run `npm run start` and confirm the startup message points to `http://127.0.0.1:5173/?appHome=1`
- [ ] Open the front door and connect a real project
- [ ] Confirm the homepage can show current project truth, current phase, acceptance, latest run, and context status
- [ ] Remove or stale `.threadsmith/context/current-packet.json` in a disposable project and confirm `sync-context` can regenerate it
- [ ] Confirm `刷新状态` rereads `.threadsmith` truth and does not pretend to know unsynced chat-only state
- [ ] Confirm provider routing copy still says multi-provider automation is future work, not a v0.2.0 promise

## Release Artifacts

- [ ] `CHANGELOG.md` includes `v0.2.0`
- [ ] `README.md` points to the v0.2.0 release docs
- [ ] `docs/releases/threadsmith-v0.2.0.md` is ready
- [ ] `docs/marketing/github-release-v0.2.0.md` is ready to paste into GitHub Release
- [ ] `docs/guides/usage-and-llm-configuration.md` describes Context Packet and `sync-context` boundaries
- [ ] `.threadsmith` committed truth is aligned with the release state
- [ ] Runtime artifacts such as logs, `events.ndjson`, and generated packets are not accidentally committed unless intentionally documented

## Publish Steps

- [ ] Squash merge the release hardening PR into `main`
- [ ] Confirm `main` CI is green
- [ ] Create tag `v0.2.0`
- [ ] Push tag
- [ ] Create the GitHub Release using `docs/marketing/github-release-v0.2.0.md`
