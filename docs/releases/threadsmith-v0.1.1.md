# Threadsmith v0.1.1

Threadsmith `v0.1.1` is a public onboarding polish release.

It keeps the same web-first, Codex-only product boundary as `v0.1.0`, but makes the first-run path, demo mode, refresh semantics, and GitHub CI health clearer.

## Highlights

- GitHub Actions CI now installs `zsh` before validating macOS launcher scripts.
- First-run guidance more clearly explains real project connection, `.threadsmith`, and the conductor boundary.
- Demo mode labels now explain the difference between an accepted project and a stale handoff packet.
- The project/source workbench shows clearer truth source hints and last-sync language.
- README and usage guide now explain when to use `$threadsmith`, when to simply keep chatting in Codex/CLI, and when to refresh truth.

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

If you do not have a real project ready, open `项目与来源` and try one of the demo modes first.

## Recommended Usage

1. Open Threadsmith.
2. Use demo mode if you want to learn the interface first.
3. Connect a real project when you are ready to use it for actual work.
4. Let your conductor surface handle the main conversation.
5. Refresh Threadsmith to verify what has actually been written back to `.threadsmith`.

## Current Scope

Threadsmith `v0.1.1` remains intentionally web-first and Codex-only.

It does not replace Codex Desktop or Codex CLI as the main chat surface. It is the control deck for project truth, workflow state, evidence, acceptance, and next steps.

Fully automated multi-provider execution and native desktop packaging remain later work.

## Verification Baseline

Release readiness is based on:

- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run verify:launchers`
- GitHub Actions CI on the release PR

## Links

- Usage guide: [Usage and LLM Configuration Guide](../guides/usage-and-llm-configuration.md)
- Truth boundary: [Threadsmith Truth Boundary](../architecture/threadsmith-truth-boundary.md)
- Previous release: [Threadsmith v0.1.0](threadsmith-v0.1.0.md)
