---
name: threadsmith
description: Use when the current project should be driven through the Threadsmith workflow: maintain Project Brief, Current Phase, and Acceptance State, coordinate executor/reviewer/verifier, and use the control deck plus .threadsmith state as the source of truth. This is the default explicit entry for Threadsmith-guided project work.
---

# Threadsmith

Use this skill as the default explicit entry for Threadsmith-guided work inside a project that already has `.threadsmith/` state or needs Threadsmith to bootstrap that state first.

Threadsmith is not a generic coding prompt.

It is a supervisor entry that:

- reads the current project's Threadsmith state
- treats `Project Brief`, `Current Phase`, and `Acceptance State` as first-class
- chooses the next narrow move
- coordinates executor, reviewer, and verifier roles
- keeps work aligned with the control deck and key gates

## When To Use

Use this skill when:

- the user says `$threadsmith`
- the user wants to continue a Threadsmith-managed project
- the user wants the current project to advance through the Threadsmith workflow
- the control deck and `.threadsmith/` state should be treated as the current truth

Do not use this implicitly as a replacement for every coding task.

This skill is intended to be an explicit entry.

## Core Operating Rules

1. Read the current project's `.threadsmith/` state before deciding the next move. If it is missing or broken, bootstrap minimum truth first.
2. Treat these three objects as the primary truth anchors:
   - `Project Brief`
   - `Current Phase`
   - `Acceptance State`
3. Keep actions narrow and phase-bound.
4. Use executor, reviewer, and verifier as distinct roles.
5. Do not let implementation claims skip review or verification.
6. Prefer deck-backed truth over stale chat memory.
7. When the user wants the automatic single-phase chain, prefer the explicit conductor command:
   - `npm run threadsmith:autopilot -- start <project-root>`
   - `npm run threadsmith:autopilot -- resume <project-root>`
8. If bootstrap cannot infer enough repository truth, stop honestly and surface the missing information instead of inventing a phase.

## Runtime Contract

Read: `references/runtime-contract.md`

## Role Contract

Read: `references/role-contracts.md`

## Action Contract

Read: `references/action-contracts.md`

## Driver Behavior

When active, start by stating:

### Threadsmith Decision
- current project state
- current phase state
- acceptance state
- next best step
- whether a key gate is active

Then perform the next narrow move.

If the project is already in an Autopilot pause state, recommend `resume` instead of starting a fresh phase run.

If `.threadsmith/` is missing or broken:

- run the explicit autopilot entry anyway
- let bootstrap inspect the repository first
- continue only when bootstrap produced a usable phase
- if bootstrap pauses, report the missing information clearly and stop there

## Escalation Rules

- If project truth is stale or contradictory, prefer hygiene before broader execution.
- If the current thread is unhealthy, produce a clean handoff rather than pushing bad context.
- If the current phase is too wide, narrow it before dispatching execution.
- If verification has failed, route to a repair slice instead of pretending progress.

## Notes

- Threadsmith is personal-first but role-based.
- Prefer role ownership over person ownership.
- Keep user prompts short; make the system do the orchestration work.
