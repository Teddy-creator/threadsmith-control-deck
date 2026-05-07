import { describe, expect, it } from "vitest";
import type { PhaseRunPause, PhaseRunRecord } from "@threadsmith/domain";
import {
  deriveLatestPhasePauseSummary,
  deriveLatestPhaseRunSummary
} from "./phaseRun.ts";

const runningRepairPhaseRun: PhaseRunRecord = {
  phaseRunId: "phase-run-1",
  projectRoot: "/tmp/threadsmith-project",
  status: "running",
  currentRole: "reviewer",
  currentSliceId: "repair-2",
  repairCount: 2,
  lockedPhaseSnapshotRef: ".threadsmith/phase-runs/phase-run-1/locked-phase.json",
  latestSuccessfulRole: "executor",
  pauseReason: null,
  resumeHint: null,
  workspacePath: "/tmp/threadsmith-project/.threadsmith-runtime/phase-run-1",
  latestRunRef: ".threadsmith/runs/run-3/result.json",
  eventRefs: [],
  startedAt: "2026-04-12T09:00:00.000Z",
  finishedAt: null
};

const pausedPhaseRun: PhaseRunRecord = {
  ...runningRepairPhaseRun,
  status: "paused",
  currentRole: "verifier",
  pauseReason: "验证失败，需要先补一轮修复。",
  resumeHint: "npm run threadsmith:autopilot -- continue /tmp/threadsmith-project"
};

const pauseRecord: PhaseRunPause = {
  phaseRunId: "phase-run-1",
  type: "risk",
  role: "verifier",
  summary: "验证失败，需要先补一轮修复。",
  detail: "自动链路在 verifier 阶段命中风险规则，先修复失败项再恢复。",
  resumeRequirements: ["修复失败测试", "重新运行 verification"],
  recommendedPrompt:
    "npm run threadsmith:autopilot -- continue /tmp/threadsmith-project",
  createdAt: "2026-04-12T09:30:00.000Z"
};

describe("phase run runtime summaries", () => {
  it("derives a compact running repair summary", () => {
    const summary = deriveLatestPhaseRunSummary(runningRepairPhaseRun);

    expect(summary.status).toBe("running");
    expect(summary.statusLabel).toBe("自动推进中");
    expect(summary.headline).toBe("自动链路正在评审");
    expect(summary.currentSliceLabel).toBe("修复 slice 2");
    expect(summary.repairCount).toBe(2);
    expect(summary.repairLabel).toBe("repair 第 2 轮");
    expect(summary.latestSuccessfulRoleLabel).toBe("执行");
    expect(summary.operatorState).toBe("waiting");
    expect(summary.operatorStateLabel).toBe("等待结果回流");
    expect(summary.operatorHeadline).toBe("当前无需操作");
    expect(summary.operatorDetail).toContain("不需要重新签发动作");
    expect(summary.operatorDetail).toContain("等待结果写回 committed truth");
  });

  it("derives a pause summary and threads it into the phase run summary", () => {
    const pauseSummary = deriveLatestPhasePauseSummary(pauseRecord);
    const runSummary = deriveLatestPhaseRunSummary(pausedPhaseRun, pauseSummary);

    expect(pauseSummary.status).toBe("recorded");
    expect(pauseSummary.typeLabel).toBe("风险命中");
    expect(pauseSummary.roleLabel).toBe("验证");
    expect(pauseSummary.summary).toBe("验证失败，需要先补一轮修复。");
    expect(runSummary.status).toBe("paused");
    expect(runSummary.statusLabel).toBe("已暂停");
    expect(runSummary.headline).toBe("自动链路暂停在验证");
    expect(runSummary.detail).toContain("verifier 阶段命中风险规则");
    expect(runSummary.resumeHint).toContain("threadsmith:autopilot -- continue");
    expect(runSummary.operatorState).toBe("needs-intervention");
    expect(runSummary.operatorStateLabel).toBe("需要介入");
    expect(runSummary.operatorHeadline).toBe("先补齐恢复条件，再去指挥入口 continue");
    expect(runSummary.operatorDetail).toContain("回到指挥入口");
  });

  it("returns missing defaults when there is no phase-run truth yet", () => {
    const pauseSummary = deriveLatestPhasePauseSummary(null);
    const runSummary = deriveLatestPhaseRunSummary(null, pauseSummary);

    expect(pauseSummary.status).toBe("missing");
    expect(runSummary.status).toBe("missing");
    expect(runSummary.headline).toBe("当前还没有 phase run");
    expect(runSummary.currentSliceLabel).toBeNull();
    expect(runSummary.operatorStateLabel).toBe("当前无需介入");
  });
});
