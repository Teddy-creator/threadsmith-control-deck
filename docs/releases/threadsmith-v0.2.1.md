# Threadsmith v0.2.1

Threadsmith `v0.2.1` is a Windows Launcher Parity patch for the `v0.2.0` Context OS line.

It keeps the same product scope as `v0.2.0`: local-first, web-first, Codex-only by default, and focused on `.threadsmith` truth, context packets, evidence, and acceptance.

## Highlights

- Added `Launch-Threadsmith.ps1` for Windows PowerShell users.
- Added `Open-Threadsmith-App.ps1` as the Windows front-door shortcut.
- Added `verify:launchers:windows` to syntax-check and dry-run the PowerShell launchers.
- Added a Windows GitHub Actions job on `windows-latest`.
- Updated README and usage docs so Windows users have first-class startup instructions.

## How To Start

Install dependencies:

```bash
npm ci
```

Universal path:

```bash
npm run start
```

Windows PowerShell front door:

```powershell
.\Open-Threadsmith-App.ps1
```

Windows PowerShell project entry:

```powershell
.\Launch-Threadsmith.ps1 "C:\path\to\your-project"
```

macOS front door:

```bash
./Open-Threadsmith-App.command
```

## Current Scope

This is not a native Windows desktop app or installer. It is a web control deck with Windows-friendly PowerShell entrypoints.

Fully automated multi-provider execution, native desktop packaging, hosted sync, embeddings, and RAG remain later work.

## Verification Baseline

- `npm run verify:launchers`
- `npm run test --workspace @threadsmith/control-deck -- src/test/renderDeck.shell.test.tsx`
- `npm run build`
- `git diff --check`
- GitHub Actions Ubuntu CI
- GitHub Actions Windows launcher CI

## Links

- Usage guide: [Usage and LLM Configuration Guide](../guides/usage-and-llm-configuration.md)
- Truth boundary: [Threadsmith Truth Boundary](../architecture/threadsmith-truth-boundary.md)
- Previous release: [Threadsmith v0.2.0](threadsmith-v0.2.0.md)
