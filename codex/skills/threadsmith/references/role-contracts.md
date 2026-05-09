# Role Contracts

Threadsmith uses role-first orchestration. Each role should prefer its matching role packet when present:

```text
.threadsmith/context/role-packets/<role>.json
```

If the packet is missing or stale, use committed truth and the main Context Packet.

## Planner

Role packet: `.threadsmith/context/role-packets/planner.json`

Required inputs:

- Project Brief
- Current Phase
- project status
- scope
- risks
- next step

Allowed writes:

- `.threadsmith/current-phase.json`
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- `.threadsmith/project-supervision.json`

Forbidden writes:

- source code implementation
- marking verification passed
- marking final acceptance

Completion artifact:

- narrowed phase contract or explicit stop reason

## Executor

Role packet: `.threadsmith/context/role-packets/executor.json`

Required inputs:

- Current Phase
- in-scope and out-of-scope lists
- relevant files
- recent diff
- implementation constraints

Allowed writes:

- source code and tests in the current slice
- `.threadsmith/active-work.json`
- `.threadsmith/acceptance-state.json` only to move implementation toward `ready-for-review`

Forbidden writes:

- marking review passed
- marking verification passed
- marking final acceptance
- broad unrelated refactors

Completion artifact:

- implementation summary, changed files, and verification commands that should be run next

## Reviewer

Role packet: `.threadsmith/context/role-packets/reviewer.json`

Required inputs:

- acceptance claim
- Current Phase
- scope
- recent diff
- risks
- relevant files

Allowed writes:

- `.threadsmith/acceptance-state.json` to `ready-for-verification` or `review-blocked`
- `.threadsmith/active-work.json`
- review notes or issue artifacts when needed

Forbidden writes:

- running the final verification claim as if independent
- marking final acceptance
- rewriting implementation except for explicitly approved tiny fixes

Completion artifact:

- review finding list or explicit no-findings note with residual risks

## Verifier

Role packet: `.threadsmith/context/role-packets/verifier.json`

Required inputs:

- acceptance checklist
- verification commands
- evidence summary
- artifact refs
- current claim

Allowed writes:

- `.threadsmith/acceptance-state.json` to `verification-failed` or `accepted-with-closeout-pending`
- `.threadsmith/context/evidence-summary.json`
- evidence artifacts under runtime/artifact paths

Forbidden writes:

- converting missing evidence into a pass
- changing implementation to make tests pass unless routed to repair
- marking final acceptance before closeout

Completion artifact:

- verification result with exact commands and evidence refs

## Closeout

Role packet: `.threadsmith/context/role-packets/closeout.json`

Required inputs:

- accepted-with-closeout-pending claim
- known gaps
- residual risks
- evidence refs
- source refs

Allowed writes:

- `.threadsmith/acceptance-state.json` to `accepted`
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- `.threadsmith/project-supervision.json`
- docs or changelog updates if required by the slice

Forbidden writes:

- new implementation scope
- hiding residual risk
- accepting without verification evidence

Completion artifact:

- closeout summary, cleanup result, residual risks, and next planned slice

## Hygiene

Role packet: `.threadsmith/context/role-packets/hygiene.json`

Required inputs:

- committed truth
- recent diff
- evidence summary
- budget warnings
- blockers
- source refs

Allowed writes:

- `.threadsmith/current-phase.json` only when re-anchoring is required
- `.threadsmith/acceptance-state.json` only to correct stale status
- `.threadsmith/project-status.json`
- `.threadsmith/active-work.json`
- handoff or recovery artifacts

Forbidden writes:

- normal feature implementation
- claiming verification
- silently discarding contradictory evidence

Completion artifact:

- hygiene summary with verified facts, stale assumptions, contradictions, and next safe action
