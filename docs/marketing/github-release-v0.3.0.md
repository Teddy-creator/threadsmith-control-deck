# Threadsmith v0.3.0 Release Copy

Threadsmith `v0.3.0` is the Harness Skill Orchestrator release.

It builds on the Context OS work from `v0.2.x`: Threadsmith still keeps project truth, context packets, evidence, and acceptance outside the long chat fog, but now adds a workflow-kernel layer for routing work through bounded protocols.

## Highlights

- Built-in mini protocols for `brief`, `plan`, `debug`, `review`, `verify`, `closeout`, `handoff`, `recover`, and `research`.
- External Skill Adapter metadata for discovering local Codex skills, explaining route health, and falling back safely when optional skills are unavailable.
- Protocol-guided role packets and autopilot execution packets with explicit inputs, outputs, guardrails, stop conditions, and route metadata.
- Safer autopilot continuation decisions for accepted, running, and paused phase-run states.
- Context routing and budget checks that point roles to compact `.threadsmith/context` artifacts instead of replaying long thread history.
- Self-hosting safety boundaries so repository skill source does not mutate the installed global `$threadsmith` controller.
- First-run onboarding, demo polish, startup copy, and docs that explain the stable `v0.2.1` line versus the `v0.3.0` orchestrator line.

## What This Means In Practice

Threadsmith can now act more like a workflow kernel:

- It can say which protocol should run next.
- It can describe what each role should receive.
- It can make stop and recovery rules explicit.
- It can show whether a project is using built-in mini protocols or optional local skill adapters.
- It can continue all-Codex phase work more safely through the autopilot path.

This is still intentionally local-first and Codex-first. Threadsmith remains a control deck and workflow truth layer, not a hosted agent platform or replacement for your main AI coding conversation.

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

macOS launchers:

```bash
./Open-Threadsmith-App.command
./Launch-Threadsmith.command "/path/to/your-project"
```

Windows PowerShell launchers:

```powershell
.\Open-Threadsmith-App.ps1
.\Launch-Threadsmith.ps1 "C:\path\to\your-project"
```

## Optional `$threadsmith` Skill

To use the bundled Codex skill locally:

```bash
mkdir -p ~/.codex/skills/threadsmith
cp -R codex/skills/threadsmith/. ~/.codex/skills/threadsmith/
```

If you already customized your installed skill, back it up first:

```bash
cp -R ~/.codex/skills/threadsmith ~/.codex/skills/threadsmith.backup
```

Example prompt:

```text
使用 $threadsmith，连续推进当前 phase，直到 accepted、paused、需要我决策、或遇到安全 stop condition。
```

Autopilot continuation:

```bash
npm run threadsmith:autopilot -- continue "/path/to/your-project"
```

## Verification

Release verification includes:

```bash
npm run test --workspaces --if-present
npm run build --workspaces --if-present
npm run verify:launchers
npm run smoke:self-host
npm run smoke:autopilot
npm run smoke:deck-route
jq empty .threadsmith/*.json
git diff --check
```

## Non-goals

`v0.3.0` does not include:

- fully automated multi-provider execution
- real arbitrary external skill invocation
- native desktop app packaging
- hosted backend, embeddings, or RAG
- replacing Codex Desktop, Codex CLI, Claude Code, or your main conductor conversation

## Links

- Release notes: ../releases/threadsmith-v0.3.0.md
- Release checklist: ../checklists/release-v0.3.0.md
- Usage guide: ../guides/usage-and-llm-configuration.md
