# Runtime Contract

Threadsmith uses the active project's `.threadsmith/` directory as the source of truth.

## Required files

- `project-brief.json`
- `current-phase.json`
- `acceptance-state.json`
- `active-work.json`
- `preferences.json`
- `action-queue.ndjson`  (file name kept for compatibility, but contents are append-only action history)

## Operating rule

Read these files before deciding the next Threadsmith move.

Do not treat stale chat memory as primary truth when `.threadsmith/` state exists.

## Primary objects

### Project Brief

Use to answer:

- what the project is trying to do
- what the current version includes
- what is explicitly out of scope

### Current Phase

Use to answer:

- what this current slice is supposed to deliver
- what is in scope
- what is out of scope
- what stop condition ends the phase

### Acceptance State

Use to answer:

- what claim is currently being tested
- whether work is only implemented vs reviewed vs verified vs accepted
- what gaps remain

## Deck relationship

The control deck is a view over this state.

Deck actions should map back to explicit Threadsmith actions, not free-form magic.
