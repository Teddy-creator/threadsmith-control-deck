# Threadsmith v0.2.0 Release Copy

Threadsmith `v0.2.0` is the Context OS release for the local-first web control deck for AI coding projects.

This release focuses on a sharper workflow idea:

> The next agent should read the right small project packet, not replay a long chat thread.

## What Changed

- Added Context Packet v1 for compact project continuation from committed `.threadsmith` truth.
- Added Repo Map v1 so packets can include lightweight repository shape and changed-file signals.
- Added Evidence Summary v1 so verification results stay compact and raw logs remain artifacts.
- Added Context Budget Ledger to make oversized context visible.
- Added Role-specific Packets for planner, executor, reviewer, verifier, closeout, and hygiene.
- Added context recovery signals for missing, stale, invalid, and out-of-sync packets.
- Made `sync-context` a real action that regenerates `.threadsmith/context/current-packet.json`.
- Updated docs around `$threadsmith`, durable truth writeback, and the conductor/control-deck boundary.

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

This remains a web-first, Codex-only release.

Threadsmith does not replace your main chat surface. It acts as a mission-control layer for truth, workflow, context health, evidence, and acceptance.

Fully automated multi-provider execution, native desktop app packaging, hosted sync, embeddings, and RAG are planned as later work, not `v0.2.0` promises.

## Verification

The public release path should be verified with:

- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run verify:launchers`
- `npm run smoke:self-host`
- GitHub Actions CI

## Links

- Repository: https://github.com/Teddy-creator/Threadsmith-control-deck
- Usage guide: ../guides/usage-and-llm-configuration.md
- Truth boundary: ../architecture/threadsmith-truth-boundary.md
- Previous release: ../releases/threadsmith-v0.1.1.md
