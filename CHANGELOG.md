# Changelog

All notable changes to Threadsmith will be documented in this file.

## Unreleased

### Added

- GitHub issue templates, pull request template, security policy, and code of conduct for the public repository.
- README and contributing guide links for open-source feedback and security reporting.

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
