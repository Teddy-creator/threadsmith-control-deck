import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyAgentRunResult,
  createAgentRun,
  initializeProjectState,
  loadProjectState,
  readAgentRunRecord,
  readLatestPhaseRun,
  readPhasePause,
  readPhaseSlice,
  readRecentEvents,
  updateAgentRunStatus,
  writeAgentRunResult,
  writeStateFragment,
  STATE_FILES
} from "@threadsmith/fs-bridge";
import type { ExecutionResult, PhaseOwner } from "@threadsmith/domain";
import { PhaseRunner, type PhaseRoleLauncher } from "./phaseRunner.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-phase-runner-"));
  createdRoots.push(projectRoot);
  await initializeProjectState(projectRoot);
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Autopilot v1",
    phaseGoal: "Ship the serial phase runner",
    deliverable: "A running single-phase autopilot loop",
    inScope: ["role packets", "phase-run truth", "pause and resume"],
    outOfScope: ["multi-provider routing"],
    stopCondition: "Autopilot can complete or pause safely inside one locked phase.",
    verificationForThisPhase: ["npm run test --workspace @threadsmith/orchestrator"],
    activeOwners: ["planner", "executor", "reviewer", "verifier", "closeout"],
    blockedBy: []
  });
  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim: "The current phase is ready for autopilot.",
    doneWhenChecklist: [
      {
        id: "serial-runner",
        label: "Planner through closeout can run serially",
        status: "unknown"
      },
      {
        id: "pause-resume",
        label: "Pause and resume are committed to truth",
        status: "unknown"
      }
    ],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: [],
    finalState: "not-ready"
  });
  await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
    items: [
      {
        role: "planner",
        status: "running",
        taskSummary: "Define the first primary slice",
        requiresUserDecision: false
      }
    ],
    blockerSummary: null
  });
  return projectRoot;
}

function makeResult(
  role: PhaseOwner,
  override: Partial<ExecutionResult> = {}
): ExecutionResult {
  return {
    runId: `run-${role}`,
    role,
    provider: "codex",
    outcome: "succeeded",
    summary: `${role} completed`,
    changedFiles: role === "executor" ? ["packages/orchestrator/src/phaseRunner.ts"] : [],
    verification: role === "executor"
      ? [{ command: "npm run test --workspace @threadsmith/orchestrator", status: "passed" }]
      : [],
    evidenceRefs: [`.threadsmith/runs/run-${role}/result.md`],
    ...override
  };
}

function createQueuedRoleLauncher(
  queue: Array<{ role: PhaseOwner; result: Partial<ExecutionResult> }>
): PhaseRoleLauncher {
  return async (packet) => {
    const next = queue.shift();

    if (!next) {
      throw new Error(`No queued result left for ${packet.role}`);
    }

    expect(packet.role).toBe(next.role);

    const startedAt = new Date().toISOString();
    await updateAgentRunStatus(packet.projectRoot, packet.runId, {
      status: "running",
      startedAt
    });

    const runningRecord = await readAgentRunRecord(packet.projectRoot, packet.runId);
    const completion = (async () => {
      await writeAgentRunResult(
        packet.projectRoot,
        packet.runId,
        {
          ...makeResult(packet.role, next.result),
          runId: packet.runId,
          role: packet.role,
          provider: packet.provider,
          evidenceRefs: [packet.output.summaryPath]
        },
        new Date().toISOString()
      );

      return readAgentRunRecord(packet.projectRoot, packet.runId);
    })();

    return {
      run: runningRecord,
      completion
    };
  };
}

function createPreAppliedRoleLauncher(
  queue: Array<{ role: PhaseOwner; result: Partial<ExecutionResult> }>
): PhaseRoleLauncher {
  return async (packet) => {
    const next = queue.shift();

    if (!next) {
      throw new Error(`No queued result left for ${packet.role}`);
    }

    expect(packet.role).toBe(next.role);

    const startedAt = new Date().toISOString();
    await updateAgentRunStatus(packet.projectRoot, packet.runId, {
      status: "running",
      startedAt
    });

    const runningRecord = await readAgentRunRecord(packet.projectRoot, packet.runId);
    const completion = (async () => {
      await writeAgentRunResult(
        packet.projectRoot,
        packet.runId,
        {
          ...makeResult(packet.role, next.result),
          runId: packet.runId,
          role: packet.role,
          provider: packet.provider,
          evidenceRefs: [packet.output.summaryPath]
        },
        new Date().toISOString()
      );
      await applyAgentRunResult(packet.projectRoot, packet.runId);

      return readAgentRunRecord(packet.projectRoot, packet.runId);
    })();

    return {
      run: runningRecord,
      completion,
      resultAppliedByLauncher: true
    };
  };
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("PhaseRunner", () => {
  it("runs planner through closeout on the success path", async () => {
    const projectRoot = await createProjectRoot();
    const runner = new PhaseRunner({
      roleLauncher: createQueuedRoleLauncher([
        { role: "planner", result: { decision: "slice-ready", summary: "Primary slice selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Execution completed." } },
        { role: "reviewer", result: { decision: "ready-for-verification", summary: "Review passed." } },
        { role: "verifier", result: { decision: "accepted-with-closeout-pending", summary: "Verification passed." } },
        { role: "closeout", result: { decision: "accepted", summary: "Closeout completed." } }
      ])
    });

    const phaseRun = await runner.start({ projectRoot });
    const latest = await readLatestPhaseRun(projectRoot);
    const state = await loadProjectState(projectRoot);
    const events = await readRecentEvents(projectRoot, 20);

    expect(phaseRun.status).toBe("accepted");
    expect(latest?.phaseRunId).toBe(phaseRun.phaseRunId);
    expect(latest?.latestSuccessfulRole).toBe("closeout");
    expect(latest?.currentSliceId).toBe("primary-1");
    expect(state.acceptanceState.finalState).toBe("accepted");
    expect(
      events.some(
        (event) => event.kind === "phase-run" && event.title.includes("accepted")
      )
    ).toBe(true);

    const primarySlice = await readPhaseSlice(projectRoot, phaseRun.phaseRunId, "primary-1");
    expect(primarySlice.kind).toBe("primary");
  });

  it("routes review failure into a repair slice before continuing", async () => {
    const projectRoot = await createProjectRoot();
    const runner = new PhaseRunner({
      roleLauncher: createQueuedRoleLauncher([
        { role: "planner", result: { decision: "slice-ready", summary: "Primary slice selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Execution completed." } },
        { role: "reviewer", result: { decision: "review-blocked", summary: "Review found a blocking issue.", blocker: "Blocking review finding." } },
        { role: "planner", result: { decision: "slice-ready", summary: "Repair slice selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Repair implemented." } },
        { role: "reviewer", result: { decision: "ready-for-verification", summary: "Review passed after repair." } },
        { role: "verifier", result: { decision: "accepted-with-closeout-pending", summary: "Verification passed." } },
        { role: "closeout", result: { decision: "accepted", summary: "Closeout completed." } }
      ])
    });

    const phaseRun = await runner.start({ projectRoot });
    const repairSlice = await readPhaseSlice(projectRoot, phaseRun.phaseRunId, "repair-1");

    expect(phaseRun.status).toBe("accepted");
    expect(phaseRun.repairCount).toBe(1);
    expect(phaseRun.currentSliceId).toBe("repair-1");
    expect(repairSlice.kind).toBe("repair");
  });

  it("routes verifier failure into a repair slice before acceptance", async () => {
    const projectRoot = await createProjectRoot();
    const runner = new PhaseRunner({
      roleLauncher: createQueuedRoleLauncher([
        { role: "planner", result: { decision: "slice-ready", summary: "Primary slice selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Execution completed." } },
        { role: "reviewer", result: { decision: "ready-for-verification", summary: "Review passed." } },
        { role: "verifier", result: { decision: "verification-failed", summary: "Verification failed.", blocker: "Missing evidence." } },
        { role: "planner", result: { decision: "slice-ready", summary: "Repair slice selected after verification failure." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Repair implemented." } },
        { role: "reviewer", result: { decision: "ready-for-verification", summary: "Review passed after repair." } },
        { role: "verifier", result: { decision: "accepted-with-closeout-pending", summary: "Verification passed after repair." } },
        { role: "closeout", result: { decision: "accepted", summary: "Closeout completed." } }
      ])
    });

    const phaseRun = await runner.start({ projectRoot });

    expect(phaseRun.status).toBe("accepted");
    expect(phaseRun.repairCount).toBe(1);
    expect(phaseRun.currentSliceId).toBe("repair-1");
  });

  it("pauses when the repair loop cap is exceeded", async () => {
    const projectRoot = await createProjectRoot();
    const runner = new PhaseRunner({
      roleLauncher: createQueuedRoleLauncher([
        { role: "planner", result: { decision: "slice-ready", summary: "Primary slice selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Execution completed." } },
        { role: "reviewer", result: { decision: "review-blocked", summary: "Blocking review finding #1.", blocker: "Review failed #1." } },
        { role: "planner", result: { decision: "slice-ready", summary: "Repair slice 1 selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Repair 1 completed." } },
        { role: "reviewer", result: { decision: "review-blocked", summary: "Blocking review finding #2.", blocker: "Review failed #2." } },
        { role: "planner", result: { decision: "slice-ready", summary: "Repair slice 2 selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Repair 2 completed." } },
        { role: "reviewer", result: { decision: "review-blocked", summary: "Blocking review finding #3.", blocker: "Review failed #3." } }
      ])
    });

    const phaseRun = await runner.start({ projectRoot });
    const pause = await readPhasePause(projectRoot, phaseRun.phaseRunId);

    expect(phaseRun.status).toBe("paused");
    expect(phaseRun.repairCount).toBe(2);
    expect(phaseRun.currentRole).toBe("planner");
    expect(pause?.type).toBe("loop-limit");
  });

  it("resumes a paused phase run from committed truth", async () => {
    const projectRoot = await createProjectRoot();
    const initialRunner = new PhaseRunner({
      roleLauncher: createQueuedRoleLauncher([
        { role: "planner", result: { decision: "slice-ready", summary: "Primary slice selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Execution completed." } },
        { role: "reviewer", result: { decision: "review-blocked", summary: "Blocking review finding #1.", blocker: "Review failed #1." } },
        { role: "planner", result: { decision: "slice-ready", summary: "Repair slice 1 selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Repair 1 completed." } },
        { role: "reviewer", result: { decision: "review-blocked", summary: "Blocking review finding #2.", blocker: "Review failed #2." } },
        { role: "planner", result: { decision: "slice-ready", summary: "Repair slice 2 selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Repair 2 completed." } },
        { role: "reviewer", result: { decision: "review-blocked", summary: "Blocking review finding #3.", blocker: "Review failed #3." } }
      ])
    });

    const pausedRun = await initialRunner.start({ projectRoot });
    expect(pausedRun.status).toBe("paused");

    const resumedRunner = new PhaseRunner({
      roleLauncher: createQueuedRoleLauncher([
        { role: "planner", result: { decision: "slice-ready", summary: "Repair slice 3 selected after manual guidance." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Repair 3 completed." } },
        { role: "reviewer", result: { decision: "ready-for-verification", summary: "Review passed after resume." } },
        { role: "verifier", result: { decision: "accepted-with-closeout-pending", summary: "Verification passed after resume." } },
        { role: "closeout", result: { decision: "accepted", summary: "Closeout completed after resume." } }
      ])
    });

    const resumed = await resumedRunner.resume({ projectRoot, phaseRunId: pausedRun.phaseRunId });
    const latest = await readLatestPhaseRun(projectRoot);

    expect(resumed.phaseRunId).toBe(pausedRun.phaseRunId);
    expect(resumed.status).toBe("accepted");
    expect(latest?.status).toBe("accepted");
    expect(latest?.repairCount).toBe(2);
    expect(latest?.latestSuccessfulRole).toBe("closeout");
  });

  it("re-anchors active work before resuming a verifier-paused phase run", async () => {
    const projectRoot = await createProjectRoot();
    const initialRunner = new PhaseRunner({
      roleLauncher: createPreAppliedRoleLauncher([
        { role: "planner", result: { decision: "slice-ready", summary: "Primary slice selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Execution completed." } },
        { role: "reviewer", result: { decision: "ready-for-verification", summary: "Review passed." } },
        { role: "verifier", result: { outcome: "failed", summary: "Verification hit a blocking risk.", riskHits: ["release-risk"] } }
      ])
    });

    const pausedRun = await initialRunner.start({ projectRoot });
    expect(pausedRun.status).toBe("paused");
    expect(pausedRun.currentRole).toBe("verifier");

    const resumedRunner = new PhaseRunner({
      roleLauncher: createPreAppliedRoleLauncher([
        { role: "verifier", result: { decision: "accepted-with-closeout-pending", summary: "Verification passed after resume." } },
        { role: "closeout", result: { decision: "accepted", summary: "Closeout completed after resume." } }
      ])
    });

    const resumed = await resumedRunner.resume({ projectRoot, phaseRunId: pausedRun.phaseRunId });
    const latest = await readLatestPhaseRun(projectRoot);

    expect(resumed.phaseRunId).toBe(pausedRun.phaseRunId);
    expect(resumed.status).toBe("accepted");
    expect(latest?.status).toBe("accepted");
    expect(latest?.latestSuccessfulRole).toBe("closeout");
  });

  it("does not re-apply workflow truth when the launcher already ingested the run result", async () => {
    const projectRoot = await createProjectRoot();
    const runner = new PhaseRunner({
      roleLauncher: createPreAppliedRoleLauncher([
        { role: "planner", result: { decision: "slice-ready", summary: "Primary slice selected." } },
        { role: "executor", result: { decision: "ready-for-review", summary: "Execution completed." } },
        { role: "reviewer", result: { decision: "ready-for-verification", summary: "Review passed." } },
        { role: "verifier", result: { decision: "accepted-with-closeout-pending", summary: "Verification passed." } },
        { role: "closeout", result: { decision: "accepted", summary: "Closeout completed." } }
      ])
    });

    const phaseRun = await runner.start({ projectRoot });
    const latest = await readLatestPhaseRun(projectRoot);

    expect(phaseRun.status).toBe("accepted");
    expect(latest?.status).toBe("accepted");
    expect(latest?.latestSuccessfulRole).toBe("closeout");
  });
});
