# Threadsmith Release Checklist - v0.3.0

Use this checklist before tagging or publishing `v0.3.0`.

Status as of `2026-05-10T13:53:31.000Z`: release-readiness review passed locally. This means the current v0.3.0 work is ready for curated commit / PR boundary review, not that a GitHub Release has already been published.

`v0.3.0` is the Harness Skill Orchestrator release-candidate line. It builds on `v0.2.0 Context OS` with a workflow-kernel layer: built-in mini protocols, optional external adapter routing contracts, protocol-guided role packets, safer autopilot continuation, context routing/budget tests, and self-hosting safety.

## Scope Check

- [x] README clearly separates latest stable `v0.2.0` from current `v0.3.0` release-candidate work
- [x] Usage guide says `v0.3.0` remains Codex-only and does not promise multi-provider automation
- [x] Release notes explain that external adapters are represented by route contracts, not real external skill invocation
- [x] Self-hosting safety notes say repo skill source must not mutate the installed global `$threadsmith` skill
- [x] Historical `v0.1.x` / `v0.2.0` release docs remain historical and are not rewritten as current truth

## Verification Check

- [x] `npm run test --workspaces --if-present`
- [x] `npm run build --workspaces --if-present`
- [x] `npm run verify:launchers`
- [x] `npm run smoke:self-host`
- [x] `npm run smoke:autopilot`
- [x] `npm run smoke:deck-route` (deterministic isolated project with fake Codex)
- [x] `jq empty .threadsmith/*.json .threadsmith/context/*.json .threadsmith/context/role-packets/*.json`
- [x] `git diff --check`

## Release Notes Check

- [x] `docs/releases/threadsmith-v0.3.0.md` is ready
- [x] `CHANGELOG.md` mentions the v0.3.0 RC surface
- [x] README links to this checklist and the v0.3.0 notes
- [x] `.threadsmith` truth records the final ready/not-ready decision

## Publish Check

- [ ] Confirm release branch and PR scope
- [x] Confirm committed truth vs runtime artifacts are separated
- [ ] Tag `v0.3.0` only after local and CI verification pass
- [ ] Create the GitHub Release from `docs/releases/threadsmith-v0.3.0.md`

Optional local realism check:

- [ ] `npm run smoke:deck-route -- --real <project-root>` only when you intentionally want to exercise the real Codex CLI against a chosen project

## Known Non-goals

- Fully automated multi-provider execution
- Real external skill invocation
- Native desktop app packaging
- Hosted backend, embeddings, or RAG
- Turning the control deck into the main chat surface
