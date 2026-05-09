# Threadsmith v0.2.0

Threadsmith `v0.2.0` is the Context OS release.

It turns the web control deck into a token-aware context layer for AI coding projects: committed project truth stays in `.threadsmith`, while compact context packets help conductor sessions continue without replaying long chat history.

## Highlights

- Context Packet v1 derives a compact current packet from Project Brief, Current Phase, Acceptance State, project status, risks, evidence, and relevant files.
- Repo Map v1 captures lightweight local repository shape and git status without embeddings or hosted services.
- Evidence Summary v1 records verification conclusions and artifact paths without stuffing raw logs into prompts.
- Context Budget Ledger warns when context sections become too heavy.
- Role-specific Packets give planner, executor, reviewer, verifier, closeout, and hygiene roles narrower context.
- Context recovery now detects missing, stale, or invalid packets and can route to `sync-context`.
- `sync-context` is a real deck/runtime action that regenerates `.threadsmith/context/current-packet.json` from committed truth and available context artifacts.
- README and usage docs explain when to rely on `$threadsmith`, when to keep normal conductor chat, and why Threadsmith only tracks durable truth.

## Why It Matters

Long AI coding sessions often fail because the working context turns into a messy memory soup. Threadsmith v0.2.0 moves the important state into explicit project truth and context packets:

- current goal and phase
- scope and non-goals
- acceptance state
- verification evidence
- recent repo signals
- next best step
- role-specific context

The goal is not to make a bigger prompt. The goal is to make the next agent read the right small packet.

## How To Start

Install dependencies:

```bash
npm ci
```

Start on any platform:

```bash
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

Threadsmith `v0.2.0` remains intentionally web-first and Codex-only.

It does not replace Codex Desktop or Codex CLI as the main chat surface. It is the control deck for project truth, workflow state, context health, evidence, acceptance, and next steps.

Fully automated multi-provider execution, native desktop packaging, hosted sync, embeddings, and RAG remain later work.

## Verification Baseline

Release readiness is based on:

- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run verify:launchers`
- `npm run smoke:self-host`
- `git diff --check`
- `jq empty .threadsmith/*.json .threadsmith/context/*.json`
- GitHub Actions CI on the release PR

## Links

- Usage guide: [Usage and LLM Configuration Guide](../guides/usage-and-llm-configuration.md)
- Truth boundary: [Threadsmith Truth Boundary](../architecture/threadsmith-truth-boundary.md)
- Context OS plan: [v0.2.0 Context Operating System Plan](../plans/v0.2.0-context-operating-system.md)
- Previous release: [Threadsmith v0.1.1](threadsmith-v0.1.1.md)
