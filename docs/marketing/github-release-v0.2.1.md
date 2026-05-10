# Threadsmith v0.2.1 Release Copy

Threadsmith `v0.2.1` is a Windows Launcher Parity patch for the `v0.2.0` Context OS release.

This release keeps the same core idea:

> The next agent should read the right small project packet, not replay a long chat thread.

## What Changed

- Added `Launch-Threadsmith.ps1` for Windows PowerShell users.
- Added `Open-Threadsmith-App.ps1` as the Windows front-door shortcut.
- Added cross-platform launcher verification scripts for macOS `.command` and Windows `.ps1` entrypoints.
- Added a GitHub Actions Windows launcher job on `windows-latest`.
- Updated README and usage docs with Windows startup commands.

## Try It

```bash
git clone https://github.com/Teddy-creator/Threadsmith-control-deck.git
cd Threadsmith-control-deck
npm ci
npm run start
```

Then open:

```text
http://127.0.0.1:5173/?appHome=1
```

Windows PowerShell users can also run:

```powershell
.\Open-Threadsmith-App.ps1
```

macOS users can run:

```bash
./Open-Threadsmith-App.command
```

## Current Scope

This remains a local-first web control deck. `v0.2.1` adds Windows-friendly launchers; it is not a native Windows desktop app or installer.

Threadsmith does not replace your main chat surface. It acts as a mission-control layer for truth, workflow, context health, evidence, and acceptance.

Fully automated multi-provider execution, native desktop app packaging, hosted sync, embeddings, and RAG are planned as later work, not `v0.2.1` promises.

## Verification

The release path should be verified with:

- `npm run verify:launchers`
- `npm run test --workspace @threadsmith/control-deck -- src/test/renderDeck.shell.test.tsx`
- `npm run build`
- GitHub Actions Ubuntu CI
- GitHub Actions Windows launcher CI

## Links

- Repository: https://github.com/Teddy-creator/Threadsmith-control-deck
- Usage guide: ../guides/usage-and-llm-configuration.md
- Truth boundary: ../architecture/threadsmith-truth-boundary.md
- Previous release: ../releases/threadsmith-v0.2.0.md
