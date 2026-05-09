# Threadsmith v0.1.0

Threadsmith `v0.1.0` is the first public-facing release of the project.

It packages Threadsmith as a workflow-first web control deck that sits beside your main AI coding conversation and gives you a clearer view of project truth, workflow state, evidence, acceptance, and next steps.

## Highlights

- Threadsmith front door for choosing today’s project entry
- custom project connection and `.threadsmith` initialization flow
- single-screen homepage with project map, progress judgement, collaboration scene, and acceptance radar
- project / phase / evidence / acceptance workbenches
- install surface and first-run onboarding
- open-source repo surface with screenshot, README, license, and contribution guide
- `Codex-only` release lane with an honest mission-control boundary

For copy that can be pasted into a GitHub Release, see [Threadsmith v0.1.0 Release Copy](../marketing/github-release-v0.1.0.md).

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

On macOS, you can also use the launcher shortcuts.

Open the normal launcher:

```bash
./Launch-Threadsmith.command
```

Open the front door explicitly:

```bash
./Open-Threadsmith-App.command
```

Open a specific project directly:

```bash
./Launch-Threadsmith.command "/path/to/your-project"
```

Windows / Linux users should use the `npm run start` path and connect projects from the front door.

## Recommended Usage

1. Open the Threadsmith front door.
2. Choose or connect the real project you want to continue.
3. Use the deck to inspect truth, evidence, acceptance, and next steps.
4. Return to your conductor surface to keep the main coding conversation moving.

For the full operator guide, including launch modes, `.threadsmith` truth writeback, Codex CLI setup, and current provider-routing limits, see:

- [Usage and LLM Configuration Guide](../guides/usage-and-llm-configuration.md)

## Current Default Routing

- `planner / executor / reviewer / verifier / closeout` currently default to `Codex`
- the default conductor surface is `Codex Desktop`
- the automation bridge that is release-hardened today is the `Codex` path, especially the executor run path
- provider routing is visible in the product surface, but `v0.1.0` does not claim fully automated multi-provider execution

## Known Limits

- This is still a web-first release.
- Threadsmith is not the main chat surface.
- Native desktop shell work is explicitly deferred.
- Fully automated multi-provider execution is not the target of `v0.1.0`.
- The provider-routing surface should be read as current project truth plus future-ready scaffolding, not as a promise that non-Codex automation is already release-ready.

## Verification Baseline

Release readiness is currently based on:

- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run verify:launchers`
- `npm run verify:release`

`npm run verify:release` already bundles the CI-safe release path. Manual gates such as `npm run smoke:self-host` remain outside the default CI-safe release path and are still recommended before a public publish.
