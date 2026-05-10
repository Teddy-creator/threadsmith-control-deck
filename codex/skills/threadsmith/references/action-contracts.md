# Action Contracts

Threadsmith v2 supports four supervisor modes plus deck-facing actions.

## `sync`

Meaning:

- read current truth and context artifacts
- refresh the operator's understanding
- do not start implementation

Use when:

- the user asks to update current project status
- the user asks "what is next?"
- the user says not to implement
- the control deck looks stale

Stop condition:

- project / phase / acceptance / next best step are reported

## `drive`

Meaning:

- move the current project through the next narrow Threadsmith step

Use when:

- the user asks to continue, advance, implement, verify, or close out
- current truth is fresh enough
- the selected role has a clear next action

Typical routes:

- planner -> executor
- executor -> reviewer
- reviewer -> verifier
- verifier -> closeout
- hygiene -> planner

Stop condition:

- the selected role completes its narrow artifact
- a gate blocks progress
- verification fails
- writeback fails

## `continuous`

Meaning:

- run the current phase through the existing autopilot chain instead of asking the user to approve every role transition
- preserve all committed role gates: planner, executor, reviewer, verifier, repair, closeout, and hygiene
- route through `npm run threadsmith:autopilot -- continue <project-root>` so the continuation decision can safely choose start, resume, wait, or reset-needed

Use when:

- the user says to keep going until the current phase is done
- the user explicitly complains that manual gate-by-gate prompting is too slow
- current truth is fresh enough and the project has a clear current phase
- the next step can be represented as one locked phase run

Stop condition:

- the phase run reaches accepted
- the phase run pauses on risk, missing information, unavailable credentials, infrastructure failure, or repair-loop limit
- committed truth says the current phase is already accepted and needs a new phase reset
- writeback fails
- destructive git or publishing action would be required

## `recover`

Meaning:

- stop normal execution and restore safe truth before continuing

Use when:

- thread was interrupted
- git diff exists but acceptance is stale
- run is stuck in `running`
- evidence is older than implementation changes
- truth contradicts repo state
- user reports bad or confusing state

Stop condition:

- safe next action is identified
- stale truth is repaired
- a handoff is produced
- user input is required

## Deck-facing Actions

### `advance-phase`

Route through planner/executor/reviewer depending on acceptance state.

### `continue-autopilot`

Route through the autopilot continuation decision. It may start a new phase run, resume a paused one, wait for an already-running one, or request phase reset when committed truth is already accepted.

### `open-current-phase`

Inspect the Current Phase contract. Do not mutate truth.

### `run-verification`

Route to verifier. Requires implementation and review to be ready.

### `run-hygiene`

Route to hygiene. Prefer this when truth freshness is questionable.

### `create-handoff`

Route to hygiene and produce a continuation artifact.

## Stop-and-Ask Rules

Stop and ask instead of continuing when:

- phase goal is ambiguous
- selected role packet contradicts committed truth
- writeback failed
- destructive git action would be required
- verification requires unavailable external credentials or services
- user decision changes scope or non-goals

## Preview Rule

Before any execution-like action, provide a short preview:

- action label
- selected mode
- selected role
- role packet status
- why now
- expected stop condition

For `continuous`, the selected role may be `phase-runner`; include whether the runner will use `continue`, `start`, `resume`, `wait`, or `reset-needed`.

## Preference Rule

When action behavior depends on saved preference, use:

- project default
- then global default
- then ask
