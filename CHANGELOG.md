# Changelog

All notable changes to Threadsmith will be documented in this file.

## v0.3.0 - 2026-05-10

### Added

- Harness Skill Orchestrator foundation with built-in mini protocols for brief, plan, debug, review, verify, closeout, handoff, recover, and research.
- External Skill Adapter schema and routing metadata for discovering local Codex skills, explaining route health, and falling back to built-in mini protocols when optional skills are unavailable.
- Protocol-guided role packets and autopilot execution packets so role loops receive bounded inputs, outputs, guardrails, stop conditions, and route metadata.
- Autopilot continuation hardening with safer start / resume / wait / reset-needed decisions across accepted, running, and paused phase-run states.
- Context routing and budget checks that point roles to compact `.threadsmith/context` artifacts instead of replaying long thread history.
- Self-hosting safety checks that keep repository skill source separate from the installed global `$threadsmith` controller.
- First-run onboarding, demo polish, and clearer `$threadsmith` install/upgrade guidance.

### Changed

- Calibrated Threadsmith's post-merge project truth after PR #21 so the current track is `v0.3.0 post-merge polish`, not the old release-readiness / PR-boundary state.
- Updated the App Home front door to describe itself as an entry surface, with `v0.2.1` as the stable line and `v0.3.0` as a merged but unpublished candidate baseline.
- Clarified `$threadsmith` skill install/upgrade guidance, continuous mode, and autopilot continuation usage in README and the usage guide.
- Updated startup copy and homepage verification expectations to avoid implying that `v0.3.0` has already been tagged or released.
- Kept v0.3.0 explicitly Codex-first: provider routing and skill routing are explainable workflow metadata, not a promise of fully automated multi-provider execution.

### Known Limits

- `v0.3.0` does not execute arbitrary external skills automatically.
- `v0.3.0` does not include fully automated multi-provider execution, native desktop packaging, hosted sync, embeddings, or RAG.
- The main AI coding conversation still happens in Codex Desktop, Codex CLI, Claude Code, or another conductor surface.

## v0.2.1 - 2026-05-10

### Added

- Windows PowerShell launchers: `Launch-Threadsmith.ps1` and `Open-Threadsmith-App.ps1`.
- Cross-platform launcher verification scripts for macOS `.command` and Windows `.ps1` entrypoints.
- GitHub Actions Windows launcher job on `windows-latest`.
- Windows startup instructions in README, usage guide, release checklist, and GitHub Release copy.

### Fixed

- `npm run verify:launchers` now works as a cross-platform launcher check instead of assuming `zsh` is always available.
- Windows launcher now prefers `npm.cmd` to avoid common PowerShell execution-policy issues around `npm.ps1`.

## v0.2.0 - 2026-05-09

### Added

- GitHub issue templates, pull request template, security policy, and code of conduct for the public repository.
- README and contributing guide links for open-source feedback and security reporting.
- v0.2.0 Context OS release docs, checklist, and GitHub Release copy.
- Context Packet, Repo Map, Evidence Summary, Context Budget Ledger, Role-specific Packets, context recovery, and `sync-context` regeneration surfaces for the v0.2.0 line.

### Changed

- README and usage docs now describe the v0.2.0 Context OS line while keeping multi-provider and desktop app work out of scope.
- Startup and current-entry copy now separate stable and development tracks instead of implying one stale current line.

## v0.1.1 - 2026-05-09

### Added

- clearer first-run guidance for connecting a real project, understanding `.threadsmith`, and returning to the conductor surface
- clearer demo mode labels for the accepted-project and stale-handoff examples
- visible truth source hints and last-sync language in the project/source workbench
- `v0.1.1` release copy focused on onboarding polish

### Fixed

- GitHub Actions now installs `zsh` before validating macOS launcher scripts on Ubuntu runners.

### Changed

- README and usage guide now explain refresh semantics, demo mode, and `$threadsmith` skill boundaries more directly.

## v0.1.0 - 2026-04-11

### Added

- Threadsmith front door and project-entry flow
- install surface and first-run onboarding surface
- project / phase / evidence / acceptance workbenches
- command bridge and supervision truth surfaces
- open-source repo surface with README, license, contribution guide, and product screenshot

### Changed

- `app-home` is now a synthetic front-door source instead of a committed fake project fixture
- the repo now exposes a public-facing `v0.1.0` release surface and release verification path
- launcher scripts now coexist with a product-style web entry surface

### Known Limits

- Threadsmith is still web-first; there is no native desktop shell in `v0.1.0`
- it does not replace the main conductor chat surface
- multi-provider routing truth exists, but fully automated non-Codex execution is not complete
- some release gates, such as `npm run smoke:self-host`, still depend on a local environment and are kept as manual checks
