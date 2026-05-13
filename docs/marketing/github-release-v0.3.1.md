# Threadsmith v0.3.1

Threadsmith `v0.3.1` is a patch release for the public `v0.3.x` Skill
Orchestrator line.

This release keeps the same Codex-first workflow kernel as `v0.3.0`, while
making the public documentation and repository hygiene sharper.

## Highlights

- README and usage guide now document advisory risk-review support.
- `critical-decision-review` is clearly framed as explicit and advisory:
  Threadsmith can recommend it, but does not auto-run it or turn it into a hard
  gate.
- Low-risk, reversible changes are documented as returning to normal workflow
  instead of triggering ritualized review friction.
- Public examples and tests now use neutral Codex skill paths instead of
  maintainer-local absolute paths.
- Public scan guidance avoids treating normal token-budget product copy as a
  credential finding.

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

`v0.3.1` does not add:

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
npm audit --audit-level=moderate
git diff --check
```

GitHub Actions also runs workspace tests, build, launcher checks, smoke E2E
tests, and Windows launcher checks.

## Links

- Release notes: ../releases/threadsmith-v0.3.1.md
- Release checklist: ../checklists/release-v0.3.1.md
- Usage guide: ../guides/usage-and-llm-configuration.md
