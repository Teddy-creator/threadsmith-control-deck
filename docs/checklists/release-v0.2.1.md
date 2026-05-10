# Threadsmith Release Checklist - v0.2.1

## Goal

Use this checklist before tagging or publishing `v0.2.1`.

`v0.2.1` is a Windows Launcher Parity patch for the `v0.2.0` Context OS line. It should keep Threadsmith web-first and Codex-only while adding first-class Windows PowerShell startup support.

## CI-safe Checks

- [ ] `npm run verify:launchers`
- [ ] `npm run test --workspace @threadsmith/control-deck -- src/test/renderDeck.shell.test.tsx`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] GitHub Actions Ubuntu CI is green
- [ ] GitHub Actions Windows launcher CI is green

## Manual Product Checks

- [ ] Fresh clone the public repository and confirm `npm ci` passes
- [ ] Run `npm run start` and confirm the startup message points to `http://127.0.0.1:5173/?appHome=1`
- [ ] On Windows, run `.\Open-Threadsmith-App.ps1` and confirm the front door opens
- [ ] On Windows, run `.\Launch-Threadsmith.ps1 "C:\path\to\your-project"` against a disposable project and confirm the URL includes `projectRoot`
- [ ] On macOS, run `./Open-Threadsmith-App.command` and confirm the front door still opens
- [ ] Confirm docs still describe this as a web control deck, not a native desktop app

## Release Artifacts

- [ ] `package.json` and `package-lock.json` version is `0.2.1`
- [ ] `CHANGELOG.md` includes `v0.2.1`
- [ ] `README.md` includes Windows PowerShell launchers
- [ ] `docs/releases/threadsmith-v0.2.1.md` is ready
- [ ] `docs/marketing/github-release-v0.2.1.md` is ready to paste into GitHub Release

## Publish Steps

- [ ] Squash merge the Windows launcher parity PR into `main`
- [ ] Confirm `main` CI is green
- [ ] Create tag `v0.2.1`
- [ ] Push tag
- [ ] Create the GitHub Release using `docs/marketing/github-release-v0.2.1.md`
