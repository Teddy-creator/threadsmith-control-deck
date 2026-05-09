# Threadsmith v0.1.0 Release Copy

Threadsmith `v0.1.0` is the first public release of a local-first web control deck for AI coding projects.

It sits beside your main AI coding conversation and keeps project truth, workflow state, evidence, acceptance, and next steps visible in one place.

## Short Description

Threadsmith is a web control deck for long-running AI coding work. It helps you see what the project is trying to do, which phase is active, what the latest run produced, and whether the work is actually accepted.

## What It Helps With

- Keep project truth out of overloaded chat threads.
- Inspect the current phase, roadmap, evidence, and acceptance state.
- Connect a real project directory and initialize `.threadsmith` truth.
- Use a Codex-only release lane while keeping provider-routing boundaries explicit.
- Run locally without a hosted backend.

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

macOS users can also run:

```bash
./Open-Threadsmith-App.command
```

## Current Scope

This release is intentionally web-first and Codex-only.

Threadsmith does not replace your main chat surface. It acts as a mission-control layer for truth, workflow, evidence, and acceptance.

Fully automated multi-provider execution and native desktop app packaging are planned as later work, not `v0.1.0` promises.

## Verification

The public release path has been verified with:

- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run verify:launchers`
- `npm run smoke:self-host`

## Links

- Repository: https://github.com/Teddy-creator/Threadsmith-control-deck
- Usage guide: ../guides/usage-and-llm-configuration.md
- Truth boundary: ../architecture/threadsmith-truth-boundary.md
- Release checklist: ../checklists/release-v0.1.0.md
