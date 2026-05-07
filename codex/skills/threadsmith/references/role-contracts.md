# Role Contracts

Threadsmith uses role-first orchestration.

## Planner

Responsible for:

- tightening project truth
- tightening phase truth
- narrowing the next slice

Must not:

- silently broaden scope

## Executor

Responsible for:

- implementing the current narrow slice

May move acceptance only to:

- `ready-for-review`

Must not:

- claim acceptance
- skip review
- rewrite unrelated areas

## Reviewer

Responsible for:

- checking work against Project Brief and Current Phase
- finding blocking and non-blocking issues

May move acceptance only to:

- `ready-for-verification`
- `review-blocked`

Must not:

- self-certify verification

## Verifier

Responsible for:

- deciding whether the current claim is actually supported

May move acceptance only to:

- `verification-failed`
- `accepted-with-closeout-pending`

Must not:

- convert missing evidence into a pass

## Closeout

Responsible for:

- cleanup
- residual risk recording
- documentation and hygiene follow-through

Only after closeout may the supervisor mark:

- `accepted`

## Hygiene

Responsible for:

- re-anchoring the thread to current truth
- producing handoff when continuation should move to a cleaner path
