---
name: threadsmith
description: Use when the current project should be driven through the Threadsmith workflow using committed .threadsmith truth, Context Packet, and Role-specific Packets. Explicit entry only.
---

# Threadsmith

Use this skill as the explicit supervisor entry for a Threadsmith-managed project.

Threadsmith is not a generic coding prompt and it should not be invoked for every casual chat message. It is a phase-bound workflow driver that reads committed project truth, chooses the next narrow move, and writes durable state only at real task boundaries.

## Operating Modes

Infer the mode from the user's request. If unclear, prefer `sync`.

### `sync`

Use when the user asks to update status, inspect current truth, refresh the deck, or "not start implementation".

Behavior:

- read truth and context artifacts
- report project / phase / acceptance / next best step
- identify stale or missing truth
- write back only if truth is clearly stale and the correct update is durable
- do not implement code

### `drive`

Use when the user asks to advance, continue, implement, verify, close out, or run the next Threadsmith step.

Behavior:

- read truth and context artifacts
- choose the next role from the phase and acceptance state
- prefer the matching role packet when present
- perform only the next narrow move
- update `.threadsmith/` at material boundaries
- do not skip review, verification, or closeout gates

### `recover`

Use when the user reports interruption, stale state, failed verification, stuck run, bad handoff, unexpected drift, or a dead/dirty thread.

Behavior:

- stop normal execution
- compare committed truth, role packet freshness, evidence, and git state
- route to hygiene, repair, resume, or handoff
- do not continue from stale chat memory

## Required Read Order

1. `.threadsmith/project-brief.json`
2. `.threadsmith/current-phase.json`
3. `.threadsmith/acceptance-state.json`
4. `.threadsmith/project-status.json`
5. `.threadsmith/active-work.json`
6. `.threadsmith/project-supervision.json`
7. `.threadsmith/context/current-packet.json` if present
8. `.threadsmith/context/role-packets/<role>.json` for the selected role if present
9. `.threadsmith/context/evidence-summary.json` and `.threadsmith/context/repo-map.json` if needed

If a role packet exists and is consistent with the current phase, use it as the role's working context. If it is missing or stale, fall back to the main Context Packet and committed truth, then recommend regenerating role packets later.

## Core Rules

1. Treat `.threadsmith/` committed truth as primary over chat memory.
2. Keep work narrow and phase-bound.
3. Use planner, executor, reviewer, verifier, closeout, and hygiene as distinct roles.
4. Do not allow executor to claim acceptance.
5. Do not allow reviewer to self-certify verification.
6. Do not allow verifier to turn missing evidence into a pass.
7. Do not write ordinary discussion into `.threadsmith/`.
8. If writeback fails, report the intended write, affected files, and residual risk before continuing.
9. If truth and repo state disagree, route to hygiene before new execution.
10. If the user asks for the automatic single-phase chain, prefer:
    - `npm run threadsmith:autopilot -- start <project-root>`
    - `npm run threadsmith:autopilot -- resume <project-root>`

## Contracts

Read these before acting:

- `references/runtime-contract.md`
- `references/role-contracts.md`
- `references/action-contracts.md`

## Output Contract

When active, start with:

### Threadsmith Decision
- mode: `sync`, `drive`, or `recover`
- project state
- current phase state
- acceptance state
- selected role and role packet status
- next best step
- active gate or stop condition

Then perform the next narrow move unless the correct result is to stop and ask.

## Bootstrap

If `.threadsmith/` is missing or broken:

- run the explicit autopilot entry only if the user wants Threadsmith to bootstrap
- let bootstrap inspect the repository first
- continue only when bootstrap produced usable truth
- if bootstrap pauses, report missing information clearly and stop

## Notes

- Threadsmith is personal-first but role-based.
- Prefer role ownership over person ownership.
- Keep user prompts short; make the protocol do the orchestration work.
