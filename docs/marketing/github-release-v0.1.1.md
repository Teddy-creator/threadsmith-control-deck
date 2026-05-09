# Threadsmith v0.1.1 Release Copy

Threadsmith `v0.1.1` is an onboarding polish release for the local-first web control deck for AI coding projects.

It keeps the `v0.1.0` product boundary: Threadsmith sits beside your main AI coding conversation and keeps project truth, workflow state, evidence, acceptance, and next steps visible in one place.

## What Changed

- GitHub Actions CI now validates launcher scripts with `zsh` installed on Ubuntu runners.
- First-run guidance explains what project to connect, what `.threadsmith` is, and why Threadsmith is not the main chat surface.
- Demo mode is clearer: one demo shows an accepted project, another shows a stale handoff packet.
- Refresh/status language now makes it clearer when the deck last read project truth and which files provide the displayed state.
- Usage docs now explain when to call `$threadsmith` and when to simply continue chatting in Codex Desktop / Codex CLI.

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

Threadsmith does not replace your main chat surface. It acts as a mission-control layer for truth, workflow, evidence, and acceptance.

Fully automated multi-provider execution and native desktop app packaging are planned as later work, not `v0.1.1` promises.

## Verification

The public release path should be verified with:

- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run verify:launchers`
- GitHub Actions CI

## Links

- Repository: https://github.com/Teddy-creator/Threadsmith-control-deck
- Usage guide: ../guides/usage-and-llm-configuration.md
- Truth boundary: ../architecture/threadsmith-truth-boundary.md
- Previous release: ../releases/threadsmith-v0.1.0.md
