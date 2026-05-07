# Threadsmith Operating Rules

## Truth Writeback

Threadsmith-managed work treats `.threadsmith/` as durable project truth, not as a chat log.

When a change materially affects project state, update `.threadsmith/` in the same work segment unless the user explicitly says not to. Material state changes include:

- project goal, scope, non-goals, constraints, or priority order changing
- current phase being drafted, reset, narrowed, blocked, or accepted
- implementation moving into review, verification, closeout, or handoff
- verification results, closeout results, blocker state, or next best step changing
- provider routing, conductor surface, or role ownership changing

Do not write every casual question, option exploration, or temporary thought into `.threadsmith/`. Only write durable truth that should survive a new session.

## Default Flow

- For normal development, keep talking naturally with the conductor surface.
- At phase boundaries, scope changes, verification, closeout, and handoff, refresh `.threadsmith/` automatically.
- Use `$threadsmith` when the user explicitly wants to inspect, force-sync, bootstrap, or drive from committed Threadsmith truth.
- If committed truth and the git workspace disagree, mark the state honestly and prefer hygiene or phase reset before new implementation claims.

## Product Boundary

Threadsmith is a control deck and truth surface. It does not replace the main coding conversation.

- The App Home / front door helps choose the project to enter.
- A real project page shows that project's live `.threadsmith` truth.
- Codex-only autopilot is the current supported automatic execution path.
- Multi-provider routing UI may describe intended ownership, but unsupported providers must not be presented as automatically executable.

## Verification

Before claiming a slice is done, run the narrow relevant checks. For release-facing or workflow-facing changes, prefer:

- `npm run test`
- `npm run build`
- `npm run verify:launchers`
- `npm run smoke:self-host`

Use broader `npm run verify:release` when preparing a release or changing launch, bridge, workflow, or public documentation behavior.
