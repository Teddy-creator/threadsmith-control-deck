import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  STATE_FILES,
  applyPhaseReset,
  createPhaseRun,
  initializeProjectState,
  loadProjectState,
  readLatestPhaseRun,
  readPhasePause,
  writeStateFragment
} from "@threadsmith/fs-bridge";
import type { BootstrapProjectStateResult } from "./bootstrap.ts";
import {
  buildAutopilotCliCommand,
  decideAutopilotContinuation,
  describeAutopilotContinuationDecision
} from "./autopilotContinuation.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-autopilot-continuation-"));
  createdRoots.push(projectRoot);
  await initializeProjectState(projectRoot);
  return projectRoot;
}

async function makeBootstrapResult(
  projectRoot: string,
  kind: BootstrapProjectStateResult["kind"] = "existing"
): Promise<BootstrapProjectStateResult> {
  const state = await loadProjectState(projectRoot);

  return {
    kind,
    state,
    summary: kind === "paused" ? "当前还缺少 bootstrap 信号。" : "Bootstrap 已完成。",
    missingInfo:
      kind === "paused"
        ? ["仓库里还没有可识别的 test/build 命令。"]
        : []
  };
}

async function seedLatestPhaseRun(projectRoot: string, status: "running" | "paused" | "accepted") {
  await createPhaseRun(projectRoot, {
    phaseRunId: `phase-run-${status}`,
    projectRoot,
    status,
    currentRole: status === "accepted" ? null : "verifier",
    currentSliceId: "primary-1",
    repairCount: 0,
    lockedPhaseSnapshotRef: `.threadsmith/phase-runs/phase-run-${status}/locked-phase.json`,
    latestSuccessfulRole: status === "accepted" ? "closeout" : "reviewer",
    pauseReason: status === "paused" ? "需要先修复验证风险。" : null,
    resumeHint:
      status === "paused"
        ? buildAutopilotCliCommand(projectRoot, "continue")
        : null,
    workspacePath: `/tmp/${status}`,
    latestRunRef: `.threadsmith/runs/run-${status}/result.md`,
    eventRefs: [],
    startedAt: "2026-04-12T10:00:00.000Z",
    finishedAt: status === "accepted" ? "2026-04-12T10:05:00.000Z" : null
  });
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("decideAutopilotContinuation", () => {
  it("starts when bootstrap is ready and no phase run exists yet", async () => {
    const projectRoot = await createProjectRoot();
    const bootstrap = await makeBootstrapResult(projectRoot);

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: null,
      latestPhasePause: null
    });

    expect(decision.action).toBe("start");
    expect(decision.recommendedCommand).toContain("-- continue");
    expect(describeAutopilotContinuationDecision(decision)).toContain(
      "启动新的 locked phase run"
    );
  });

  it("resumes a paused phase run through the unified continue surface", async () => {
    const projectRoot = await createProjectRoot();
    const bootstrap = await makeBootstrapResult(projectRoot);
    await seedLatestPhaseRun(projectRoot, "paused");
    const phaseRun = await readLatestPhaseRun(projectRoot);
    const pause = phaseRun ? await readPhasePause(projectRoot, phaseRun.phaseRunId) : null;

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: phaseRun,
      latestPhasePause: pause
    });

    expect(decision.action).toBe("resume");
    expect(decision.recommendedCommand).toBe(
      buildAutopilotCliCommand(projectRoot, "continue")
    );
    expect(describeAutopilotContinuationDecision(decision)).toContain(
      "不会新开重复自动链"
    );
  });

  it("waits instead of launching a duplicate phase run", async () => {
    const projectRoot = await createProjectRoot();
    const bootstrap = await makeBootstrapResult(projectRoot);
    await seedLatestPhaseRun(projectRoot, "running");
    const phaseRun = await readLatestPhaseRun(projectRoot);

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: phaseRun,
      latestPhasePause: null
    });

    expect(decision.action).toBe("wait");
    expect(decision.detail).toContain("不要重复启动");
    expect(describeAutopilotContinuationDecision(decision)).toContain(
      "不会重复启动"
    );
  });

  it("refuses to wait on a running phase run when committed truth is already accepted", async () => {
    const projectRoot = await createProjectRoot();
    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "当前 phase 已经 accepted。",
      doneWhenChecklist: [],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [],
      finalState: "accepted"
    });
    const bootstrap = await makeBootstrapResult(projectRoot);
    await seedLatestPhaseRun(projectRoot, "running");
    const phaseRun = await readLatestPhaseRun(projectRoot);

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: phaseRun,
      latestPhasePause: null
    });

    expect(decision.action).toBe("reset-needed");
    expect(decision.detail).toContain("状态为 running");
    expect(decision.detail).toContain("避免从旧 truth 恢复");
  });

  it("refuses to resume a paused phase run when committed truth is already accepted", async () => {
    const projectRoot = await createProjectRoot();
    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "当前 phase 已经 accepted。",
      doneWhenChecklist: [],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [],
      finalState: "accepted"
    });
    const bootstrap = await makeBootstrapResult(projectRoot);
    await seedLatestPhaseRun(projectRoot, "paused");
    const phaseRun = await readLatestPhaseRun(projectRoot);
    const pause = phaseRun ? await readPhasePause(projectRoot, phaseRun.phaseRunId) : null;

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: phaseRun,
      latestPhasePause: pause
    });

    expect(decision.action).toBe("reset-needed");
    expect(decision.recommendedCommand).toBe(
      buildAutopilotCliCommand(projectRoot, "status")
    );
    expect(decision.detail).toContain("状态为 paused");
  });

  it("reports reset-needed when the current phase is already accepted and no reset has happened", async () => {
    const projectRoot = await createProjectRoot();
    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "当前 phase 已经 accepted。",
      doneWhenChecklist: [],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [],
      finalState: "accepted"
    });
    const bootstrap = await makeBootstrapResult(projectRoot);
    await seedLatestPhaseRun(projectRoot, "accepted");
    const phaseRun = await readLatestPhaseRun(projectRoot);

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: phaseRun,
      latestPhasePause: null
    });

    expect(decision.action).toBe("reset-needed");
    expect(decision.detail).toContain("先写回新的 current phase");
    expect(describeAutopilotContinuationDecision(decision)).toContain(
      "不会从旧 truth 硬跑"
    );
  });

  it("starts again when the previous phase run was accepted but current truth has been reset", async () => {
    const projectRoot = await createProjectRoot();
    const bootstrap = await makeBootstrapResult(projectRoot);
    await seedLatestPhaseRun(projectRoot, "accepted");
    const phaseRun = await readLatestPhaseRun(projectRoot);

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: phaseRun,
      latestPhasePause: null
    });

    expect(decision.action).toBe("start");
    expect(decision.detail).toContain("可以从新的 current phase 启动");
  });

  it("starts after an accepted project is reset through the formal phase reset helper", async () => {
    const projectRoot = await createProjectRoot();
    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
      currentClaim: "当前 phase 已经 accepted。",
      doneWhenChecklist: [],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [],
      finalState: "accepted"
    });
    await seedLatestPhaseRun(projectRoot, "accepted");

    await applyPhaseReset(projectRoot, {
      currentPhase: {
        phaseName: "Phase reset + next-slice drafting v1",
        phaseGoal: "Write the next current phase from the accepted packet.",
        deliverable: "Reset helper committed truth",
        inScope: ["Phase reset", "Next-slice draft"],
        outOfScope: ["Multi-provider"],
        stopCondition: "Current truth is no longer accepted.",
        verificationForThisPhase: ["npm run smoke:self-host"],
        activeOwners: ["planner", "executor", "reviewer", "verifier", "closeout", "hygiene"],
        blockedBy: []
      },
      currentClaim: "Current truth has been reset into a new in-progress slice.",
      doneWhen: [
        {
          id: "truth-reset",
          label: "Current truth is reset from accepted to in-progress"
        }
      ],
      startMode: "implementing",
      projectStatus: {
        currentTrack: "All-Codex autopilot truth reset",
        currentFocus: "正在推进新的 current phase。",
        projectStatusSummary: "accepted truth 已重置到新的 current phase。",
        topRisks: [],
        currentMilestoneId: "current-phase",
        nextMilestoneId: "next-milestone"
      },
      projectRoadmap: {
        versionLabel: "Threadsmith v1",
        finalGoal: "Advance, review, verify, close out",
        milestones: [
          {
            id: "project-connected",
            label: "项目接入",
            title: "项目已接入",
            summary: "基础状态可用。",
            state: "done"
          },
          {
            id: "current-phase",
            label: "当前阶段",
            title: "Phase reset + next-slice drafting v1",
            summary: "新的 current phase 已开始。",
            state: "current"
          },
          {
            id: "next-milestone",
            label: "下一计划",
            title: "Command bridge v1",
            summary: "继续推进 bridge truth。",
            state: "next"
          }
        ],
        updatedAt: null
      }
    });

    const bootstrap = await makeBootstrapResult(projectRoot);
    const phaseRun = await readLatestPhaseRun(projectRoot);

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: phaseRun,
      latestPhasePause: null
    });

    expect(decision.action).toBe("start");
    expect(decision.detail).toContain("新的 current phase");
  });

  it("reports reset-needed honestly when bootstrap is still paused", async () => {
    const projectRoot = await createProjectRoot();
    const bootstrap = await makeBootstrapResult(projectRoot, "paused");

    const decision = decideAutopilotContinuation({
      projectRoot,
      bootstrap,
      latestPhaseRun: null,
      latestPhasePause: null
    });

    expect(decision.action).toBe("reset-needed");
    expect(decision.detail).toContain("缺口");
    expect(decision.recommendedCommand).toBe(
      buildAutopilotCliCommand(projectRoot, "status")
    );
  });
});
