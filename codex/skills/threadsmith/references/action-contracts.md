# Action Contracts

Threadsmith v1 supports these deck-facing actions.

## `advance-phase`

Meaning:

- move the current project through the next narrow execution slice

Typical route:

- planner -> executor -> reviewer

## `open-current-phase`

Meaning:

- inspect the full Current Phase contract

Typical route:

- reveal Current Phase in the control deck drawer

## `run-verification`

Meaning:

- convert current implementation and review state into explicit verification evidence

Typical route:

- verifier

## `run-hygiene`

Meaning:

- re-anchor the current project state and thread to verified truth

Typical route:

- hygiene

## `create-handoff`

Meaning:

- create a continuation packet from current Threadsmith truth

Typical route:

- hygiene -> handoff artifact

## Preview Rule

Deck actions should show a short preview before execution.

The preview should include:

- action label
- why now
- expected roles
- stop condition

## Preference Rule

When action behavior depends on saved preference, use:

- project default
- then global default
- then ask
