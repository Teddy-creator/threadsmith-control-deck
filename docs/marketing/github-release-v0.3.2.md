# Threadsmith v0.3.2

Threadsmith `v0.3.2` is a tiny patch release for the public `v0.3.x` Skill
Orchestrator line.

This release keeps the same Codex-first workflow kernel as `v0.3.1`. The main
fix is release truth alignment: a fresh checkout/source archive now carries
schema-valid `.threadsmith` truth and matching homepage smoke expectations.

## Highlights

- Fixed committed `.threadsmith` acceptance-state values so smoke E2E checks can
  validate the public source archive cleanly.
- Fixed the closeout active-work status to use a schema-valid role status.
- Updated homepage E2E expectations to match the current release truth.
- Bumped workspace package versions to `0.3.2`.
- Updated README, usage guide, front-door copy, release notes, and checklist to
  point at `v0.3.2` as the latest stable patch release.

## Install / Run

```bash
git clone https://github.com/Teddy-creator/Threadsmith-control-deck.git
cd Threadsmith-control-deck
npm ci
npm run start
```

Open:

```text
http://127.0.0.1:5173/?appHome=1
```

macOS:

```bash
./Open-Threadsmith-App.command
./Launch-Threadsmith.command "/path/to/your-project"
```

Windows PowerShell:

```powershell
.\Open-Threadsmith-App.ps1
.\Launch-Threadsmith.ps1 "C:\path\to\your-project"
```

## Current Limits

`v0.3.2` does not add:

- fully automated multi-provider execution
- arbitrary external skill auto-execution
- native desktop app packaging
- hosted backend, embeddings, or RAG
- replacement for Codex Desktop, Codex CLI, Claude Code, or your main conductor
  conversation

## Verification

Release verification includes:

```bash
npm ci
npm run test
npm run build
npm run verify:launchers
npm run test:e2e
npm audit --audit-level=moderate
git diff --check
```

GitHub Actions also runs workspace tests, build, launcher checks, smoke E2E
tests, and Windows launcher checks.

## Links

- Release notes: ../releases/threadsmith-v0.3.2.md
- Release checklist: ../checklists/release-v0.3.2.md
- Usage guide: ../guides/usage-and-llm-configuration.md

