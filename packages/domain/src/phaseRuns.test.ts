import { describe, expect, it } from "vitest";
import { currentPhaseSchema } from "./currentPhase.ts";
import {
  lockedPhaseSnapshotSchema,
  phaseRunPauseSchema,
  phaseRunRecordSchema,
  phaseSliceArtifactSchema
} from "./phaseRuns.ts";

describe("phaseRuns schemas", () => {
  it("parses a running phase-run record", () => {
    const parsed = phaseRunRecordSchema.parse({
      phaseRunId: "run-1",
      projectRoot: "/tmp/threadsmith-project",
      status: "running",
      currentRole: "planner",
      currentSliceId: null,
      repairCount: 0,
      lockedPhaseSnapshotRef: ".threadsmith/phase-runs/run-1/locked-phase.json",
      latestSuccessfulRole: null,
      pauseReason: null,
      resumeHint: null,
      workspacePath: "/tmp/threadsmith-project/.threadsmith-runtime/run-1",
      latestRunRef: null,
      eventRefs: [],
      startedAt: "2026-04-12T00:00:00.000Z",
      finishedAt: null
    });

    expect(parsed.status).toBe("running");
    expect(parsed.currentRole).toBe("planner");
    expect(parsed.repairCount).toBe(0);
  });

  it("parses a locked phase snapshot", () => {
    const phase = currentPhaseSchema.parse({
      phaseName: "收紧当前切片",
      phaseGoal: "定义当前 phase 的第一刀",
      deliverable: "第一条可执行切片",
      inScope: ["定义切片目标"],
      outOfScope: ["跨 phase 改 scope"],
      stopCondition: "切片已经足够清晰可以进入执行",
      verificationForThisPhase: ["切片合同已生成"],
      activeOwners: ["planner"],
      blockedBy: []
    });
    const parsed = lockedPhaseSnapshotSchema.parse({
      phaseRunId: "run-1",
      phase,
      capturedAt: "2026-04-12T00:00:00.000Z"
    });

    expect(parsed.phase.phaseName).toBe("收紧当前切片");
    expect(parsed.phase.activeOwners).toEqual(["planner"]);
  });

  it("parses a repair slice artifact and pause record", () => {
    const slice = phaseSliceArtifactSchema.parse({
      phaseRunId: "run-1",
      sliceId: "repair-1",
      kind: "repair",
      goal: "修复 verifier 暴露的问题",
      scope: ["修 verifier blocker"],
      doneWhen: ["verifier blocker 消失"],
      verification: ["npm run test"],
      whyNow: "上一轮 verification 失败",
      createdByRunId: "agent-run-2",
      createdAt: "2026-04-12T00:10:00.000Z"
    });
    const pause = phaseRunPauseSchema.parse({
      phaseRunId: "run-1",
      type: "loop-limit",
      role: "planner",
      summary: "repair 已达到上限",
      detail: "需要人工确认下一步处理方向。",
      resumeRequirements: ["用户确认继续路径"],
      recommendedPrompt: "继续当前 phase run",
      createdAt: "2026-04-12T00:20:00.000Z"
    });

    expect(slice.kind).toBe("repair");
    expect(pause.type).toBe("loop-limit");
    expect(pause.resumeRequirements).toContain("用户确认继续路径");
  });
});
