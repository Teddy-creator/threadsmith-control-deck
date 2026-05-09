# Runtime Contract

Threadsmith uses the active project's `.threadsmith/` directory as the source of truth.

## Required Committed Truth

Read these before deciding the next move:

- `.threadsmith/project-brief.json`
- `.threadsmith/current-phase.json`
- `.threadsmith/acceptance-state.json`
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- `.threadsmith/project-supervision.json`
- `.threadsmith/preferences.json`

`action-queue.ndjson` is append-only action history. Do not treat it as the main state object.

## Context Artifacts

Use these when present:

- `.threadsmith/context/current-packet.json`
- `.threadsmith/context/role-packets/planner.json`
- `.threadsmith/context/role-packets/executor.json`
- `.threadsmith/context/role-packets/reviewer.json`
- `.threadsmith/context/role-packets/verifier.json`
- `.threadsmith/context/role-packets/closeout.json`
- `.threadsmith/context/role-packets/hygiene.json`
- `.threadsmith/context/repo-map.json`
- `.threadsmith/context/evidence-summary.json`

Context artifacts are derived from committed truth and repo signals. They are useful working context, but committed truth remains the authority if there is a conflict.

## Freshness Rules

A context artifact is fresh enough when:

- its parent phase matches `.threadsmith/current-phase.json`
- its acceptance claim matches `.threadsmith/acceptance-state.json`
- its role matches the selected role
- its evidence is not older than the latest implementation change when verification is being claimed

If freshness cannot be proven, say so and fall back to committed truth.

## Read Priority

1. Committed truth
2. Matching role packet
3. Main Context Packet
4. Repo map and evidence summary
5. Chat memory

Chat memory may explain intent, but must not override committed truth.

## Writeback Rules

Write `.threadsmith/` only for durable boundary changes:

- phase drafted, narrowed, blocked, reset, or accepted
- acceptance status changes
- active role or blocker changes
- verification evidence changes the claim
- closeout records residual risks or next step
- recovery identifies stale or contradictory truth

Do not write casual discussion, tentative options, or private reasoning.

## Writeback Failure Handling

If a required write fails:

- stop before claiming success
- report which file should have changed
- report the intended durable update
- report whether code changes landed without truth changes
- recommend retry, manual repair, or handoff

Do not silently continue with stale truth after a failed write.

## Deck Relationship

The control deck is a view over this state.

Deck actions should map back to explicit Threadsmith actions, not free-form magic.
