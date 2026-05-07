import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { currentPhaseSchema } from "@threadsmith/domain";
import {
  createPhaseRun,
  readLatestPhaseRun,
  readPhasePause,
  readPhaseRun,
  readPhaseSlice,
  writeLockedPhaseSnapshot,
  writePhasePause,
  writePhaseSlice
} from "./phaseRuns.ts";
import {
  PHASE_RUN_FILES,
  getPhaseRunDir,
  getPhaseRunFilePath
} from "./paths.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-phase-runs-"));
  createdRoots.push(projectRoot);
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("phaseRuns", () => {
  it("creates a phase run and writes the locked phase snapshot", async () => {
    const projectRoot = await createProjectRoot();
    const phase = currentPhaseSchema.parse({
      phaseName: "自动推进当前 phase",
      phaseGoal: "让自动链路可以起跑",
      deliverable: "第一条 planner 切片",
      inScope: ["建立自动链路底座"],
      outOfScope: ["跨 phase 推进"],
      stopCondition: "当前 phase 可以进入 executor",
      verificationForThisPhase: ["phase run truth 已建立"],
      activeOwners: ["planner"],
      blockedBy: []
    });

    const created = await createPhaseRun(
      projectRoot,
      {
        phaseRunId: "phase-run-1",
        projectRoot,
        status: "running",
        currentRole: "planner",
        currentSliceId: null,
        repairCount: 0,
        lockedPhaseSnapshotRef:
          ".threadsmith/phase-runs/phase-run-1/locked-phase.json",
        latestSuccessfulRole: null,
        pauseReason: null,
        resumeHint: null,
        workspacePath: "/tmp/worktree/phase-run-1",
        latestRunRef: null,
        eventRefs: [],
        startedAt: "2026-04-12T00:00:00.000Z",
        finishedAt: null
      },
      "2026-04-12T00:00:00.000Z"
    );
    await writeLockedPhaseSnapshot(projectRoot, "phase-run-1", {
      phaseRunId: "phase-run-1",
      phase,
      capturedAt: "2026-04-12T00:00:00.000Z"
    });
    const stored = await readPhaseRun(projectRoot, "phase-run-1");
    const lockedPhase = JSON.parse(
      await readFile(
        getPhaseRunFilePath(
          projectRoot,
          "phase-run-1",
          PHASE_RUN_FILES.lockedPhase
        ),
        "utf8"
      )
    );

    expect(created.status).toBe("running");
    expect(stored.currentRole).toBe("planner");
    expect(lockedPhase.phase.phaseName).toBe("自动推进当前 phase");
  });

  it("writes a slice artifact and pause record", async () => {
    const projectRoot = await createProjectRoot();
    await createPhaseRun(projectRoot, {
      phaseRunId: "phase-run-1",
      projectRoot,
      status: "paused",
      currentRole: "planner",
      currentSliceId: "repair-1",
      repairCount: 2,
      lockedPhaseSnapshotRef:
        ".threadsmith/phase-runs/phase-run-1/locked-phase.json",
      latestSuccessfulRole: "verifier",
      pauseReason: "repair 已达上限",
      resumeHint: "等待人工确认",
      workspacePath: "/tmp/worktree/phase-run-1",
      latestRunRef: ".threadsmith/runs/run-2/status.json",
      eventRefs: [".threadsmith/events.ndjson"],
      startedAt: "2026-04-12T00:00:00.000Z",
      finishedAt: null
    });

    await writePhaseSlice(projectRoot, "phase-run-1", {
      phaseRunId: "phase-run-1",
      sliceId: "repair-1",
      kind: "repair",
      goal: "收窄修复范围",
      scope: ["仅修 verifier 暴露的问题"],
      doneWhen: ["verification blocker 消失"],
      verification: ["npm run test"],
      whyNow: "上一轮 verifier 失败",
      createdByRunId: "run-3",
      createdAt: "2026-04-12T00:15:00.000Z"
    });
    await writePhasePause(projectRoot, "phase-run-1", {
      phaseRunId: "phase-run-1",
      type: "loop-limit",
      role: "planner",
      summary: "repair 已达到上限",
      detail: "需要人工决定是否继续当前方向。",
      resumeRequirements: ["人工确认下一步"],
      recommendedPrompt: "继续当前 phase run",
      createdAt: "2026-04-12T00:20:00.000Z"
    });

    const slice = await readPhaseSlice(projectRoot, "phase-run-1", "repair-1");
    const pause = await readPhasePause(projectRoot, "phase-run-1");

    expect(slice.kind).toBe("repair");
    expect(pause?.type).toBe("loop-limit");
    expect(pause?.recommendedPrompt).toContain("继续");
  });

  it("returns the newest phase run first", async () => {
    const projectRoot = await createProjectRoot();

    await createPhaseRun(
      projectRoot,
      {
        phaseRunId: "phase-run-1",
        projectRoot,
        status: "accepted",
        currentRole: null,
        currentSliceId: "primary-1",
        repairCount: 0,
        lockedPhaseSnapshotRef:
          ".threadsmith/phase-runs/phase-run-1/locked-phase.json",
        latestSuccessfulRole: "closeout",
        pauseReason: null,
        resumeHint: null,
        workspacePath: "/tmp/worktree/phase-run-1",
        latestRunRef: ".threadsmith/runs/run-1/status.json",
        eventRefs: [],
        startedAt: "2026-04-12T00:00:00.000Z",
        finishedAt: "2026-04-12T00:10:00.000Z"
      },
      "2026-04-12T00:00:00.000Z"
    );
    await createPhaseRun(
      projectRoot,
      {
        phaseRunId: "phase-run-2",
        projectRoot,
        status: "running",
        currentRole: "reviewer",
        currentSliceId: "primary-2",
        repairCount: 0,
        lockedPhaseSnapshotRef:
          ".threadsmith/phase-runs/phase-run-2/locked-phase.json",
        latestSuccessfulRole: "executor",
        pauseReason: null,
        resumeHint: null,
        workspacePath: "/tmp/worktree/phase-run-2",
        latestRunRef: ".threadsmith/runs/run-2/status.json",
        eventRefs: [],
        startedAt: "2026-04-12T01:00:00.000Z",
        finishedAt: null
      },
      "2026-04-12T01:00:00.000Z"
    );

    const latest = await readLatestPhaseRun(projectRoot);

    expect(getPhaseRunDir(projectRoot, "phase-run-2")).toContain("phase-run-2");
    expect(latest?.phaseRunId).toBe("phase-run-2");
  });
});
