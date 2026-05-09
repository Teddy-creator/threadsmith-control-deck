# Context Packet Regeneration Engine v1

## Goal

Make `sync-context` a real Threadsmith action that regenerates `.threadsmith/context/current-packet.json` from committed `.threadsmith` truth and local context artifacts.

This closes the current v0.2.0 gap where the Control Deck can detect stale or missing context packets, but can only route the operator to `run-hygiene` as a recovery step.

## Scope

- Add a first-class `sync-context` deck action.
- Reuse the existing runtime `buildContextPacket()` implementation.
- Read existing context inputs when available:
  - `.threadsmith/context/repo-map.json`
  - `.threadsmith/context/evidence-summary.json`
- Write the regenerated packet to `.threadsmith/context/current-packet.json`.
- Append a workflow event that records the sync action and packet path.
- Update next-best-step logic so `contextRecovery.action === "sync-context"` recommends `sync-context`, not `run-hygiene`.
- Update the phase workbench Context 状态 handling copy and button to reflect true regeneration.
- Add tests for fs-bridge action behavior, runtime recommendation, UI preview, and e2e recovery from missing/stale packet where practical.

## Non-goals

- Regenerating all role packets.
- Adding multi-provider execution.
- Adding a native desktop shell.
- Introducing embeddings, RAG, model API calls, or hosted sync.
- Replacing `run-hygiene`; hygiene remains the recovery action for dirty/stale operating context or long-thread re-anchoring.

## Design

### Action Semantics

`sync-context` means:

> Regenerate the current context packet from committed Threadsmith truth and available repo/evidence context artifacts.

It does not mean:

- clean up a long thread
- create a handoff
- resolve an implementation blocker
- verify the task

Those remain separate actions.

### Data Flow

1. Control Deck derives `contextRecovery.action === "sync-context"` when `current-packet.json` is missing, stale, or invalid.
2. `nextBestStep` returns a primary `sync-context` action.
3. The phase workbench Context 状态 handling panel shows a real sync button.
4. `applyDeckActionState(projectRoot, "sync-context")` loads current `ProjectState`.
5. fs-bridge reads optional repo map and evidence summary.
6. runtime builds a fresh `ContextPacket`.
7. fs-bridge writes `.threadsmith/context/current-packet.json`.
8. fs-bridge appends a deck-action event with `actionId: "sync-context"` and the packet path.
9. Reloading the deck should move context status toward `fresh`, unless another artifact remains stale or invalid.

### Error Handling

- If optional repo map or evidence summary is missing, packet generation still succeeds with honest fallback sections.
- If core project truth is invalid, action fails instead of writing a misleading packet.
- UI should not promise role packet regeneration.

## Done When

- `sync-context` is part of the runtime/deck action type surface.
- Missing or stale `current-packet.json` produces a `sync-context` recommendation.
- Executing `sync-context` writes a valid `current-packet.json`.
- Context 状态 handling copy no longer says regeneration is unavailable.
- `run-hygiene` keeps its separate meaning.
- Tests prove the action and UI path.

## Verification

```bash
npm run test --workspace @threadsmith/runtime -- src/nextBestStep.test.ts
npm run test --workspace @threadsmith/fs-bridge -- src/workflow.test.ts
npm run test --workspace @threadsmith/control-deck -- src/test/renderDeck.shell.test.tsx
npm run test --workspace @threadsmith/control-deck
npm run build
npm run test:e2e
git diff --check
for f in .threadsmith/*.json .threadsmith/context/*.json; do jq empty "$f" || exit 1; done
```

## Release Impact

After this slice, v0.2.0 has a real Context OS loop:

- committed truth
- generated context packet
- freshness detection
- visible recovery state
- actionable regeneration

The remaining v0.2.0 work can shift to release hardening, docs, and GitHub release prep.
