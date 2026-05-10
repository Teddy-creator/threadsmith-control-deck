# Threadsmith v0.3.0

Threadsmith `v0.3.0` is the Harness Skill Orchestrator release.

It builds on `v0.2.0 Context OS`: instead of only preserving project truth and compact context, Threadsmith can now describe which workflow protocol should run next, what each role receives, when the system must stop, and how optional external skills should fall back to built-in mini protocols.

## What Changed

### Skill Orchestrator schema

Threadsmith now has typed schema support for:

- built-in mini protocol IDs
- external skill adapter declarations
- adapter availability and fallback behavior
- route decisions with source, selected protocol, selected adapter, and safety warnings
- self-hosting metadata that separates repository skill source from the installed global `$threadsmith` controller

### Built-in Mini Protocols

`v0.3.0` adds bounded built-in protocols for:

- `brief`
- `plan`
- `debug`
- `review`
- `verify`
- `closeout`
- `handoff`
- `recover`
- `research`

These protocols are intentionally small. They are the fallback kernel when a user has not installed optional external skills.

### Protocol-guided Autopilot Role Loop

Role packets and autopilot execution packets can now carry mini protocol instructions:

- required inputs
- required outputs
- guardrails
- stop condition
- continuation hint
- route metadata

This keeps the role loop explicit instead of turning it into another long prompt.

### Stop Rules and Recovery Hardening

Continuation decisions now protect against unsafe drift:

- accepted committed truth takes priority over stale running or paused phase-run state
- contradictory accepted/running state routes to reset/recover instead of unsafe continuation
- paused runs can still resume when committed truth has not already accepted the phase

### Context Routing and Budget Tests

Execution packets now point roles to compact context artifacts:

- `.threadsmith/context/current-packet.json`
- `.threadsmith/context/role-packets/<role>.json`

Budget tests also warn about heavy middle sections so long context does not quietly recreate the "lost in the middle" problem.

### Self-hosting Safety

Developing Threadsmith with Threadsmith is now safer:

- repo skill source and installed global skill paths must stay separate
- repo-source controller mode cannot point at global `.codex/skills` paths
- installed-skill controller mode must declare an installed path
- unsafe self-hosting boundaries block external adapters and fall back to built-in mini protocols

## What v0.3.0 Does Not Promise

This release remains intentionally scoped:

- no fully automated multi-provider execution
- no real external skill invocation
- no native desktop app packaging
- no hosted backend, embeddings, or RAG
- no replacement for the main Codex / CLI conductor conversation

Threadsmith remains the control deck and workflow kernel. Your conductor surface remains the place where primary AI coding conversation happens.

## Verification

Before publishing, run:

```bash
npm run test --workspaces --if-present
npm run build --workspaces --if-present
npm run verify:launchers
npm run smoke:self-host
npm run smoke:autopilot
npm run smoke:deck-route
jq empty .threadsmith/*.json .threadsmith/context/*.json .threadsmith/context/role-packets/*.json
git diff --check
```

`npm run smoke:deck-route` is intentionally deterministic: it creates an isolated temporary project and uses the bundled fake Codex fixture. To test a real local Codex CLI bridge manually, run `npm run smoke:deck-route -- --real <project-root>` against a project you are willing to mutate.

## Related Docs

- v0.3.0 checklist: [../checklists/release-v0.3.0.md](../checklists/release-v0.3.0.md)
- v0.3.0 research plan: [../research/v0.3.0-skill-orchestrator-and-mini-protocols.md](../research/v0.3.0-skill-orchestrator-and-mini-protocols.md)
- v0.3.0 release-candidate hardening plan: [../plans/v0.3.0-release-candidate-hardening.md](../plans/v0.3.0-release-candidate-hardening.md)
- Previous release: [Threadsmith v0.2.0](threadsmith-v0.2.0.md)
