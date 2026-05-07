# Changelog

All notable changes to Threadsmith will be documented in this file.

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
