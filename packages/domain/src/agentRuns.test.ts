import { describe, expect, it } from "vitest";
import {
  agentRunRecordSchema,
  executionPacketSchema,
  executionResultSchema
} from "./agentRuns.ts";

describe("executionPacketSchema", () => {
  it("accepts a narrow executor packet with referenced context", () => {
    const parsed = executionPacketSchema.parse({
      runId: "018f8b96-f802-73fd-a4aa-44d9eb1b6fa0",
      projectRoot: "/tmp/threadsmith-project",
      role: "executor",
      provider: "codex",
      workflowEffect: "artifact-only",
      objective: "实现真实 slap detection adapter",
      scope: ["接入硬件输入", "保持现有 UI contract 不变"],
      doneWhen: ["真实输入进入 reaction 链路", "相关测试通过"],
      verification: ["npm run test --workspace @threadsmith/control-deck"],
      contextRefs: [
        { kind: "state", path: ".threadsmith/current-phase.json" },
        { kind: "file", path: "packages/fs-bridge/src/workflow.ts" }
      ],
      output: {
        resultPath: ".threadsmith/runs/run-1/result.json",
        summaryPath: ".threadsmith/runs/run-1/result.md"
      }
    });

    expect(parsed.role).toBe("executor");
    expect(parsed.output.resultPath).toContain("result.json");
    expect(parsed.workflowEffect).toBe("artifact-only");
  });
});

describe("executionResultSchema", () => {
  it("accepts a structured result with evidence references", () => {
    const parsed = executionResultSchema.parse({
      runId: "018f8b96-f802-73fd-a4aa-44d9eb1b6fa0",
      role: "executor",
      provider: "codex",
      outcome: "succeeded",
      summary: "已完成当前 slice，实现结果可进入 review。",
      changedFiles: ["packages/fs-bridge/src/workflow.ts"],
      verification: [{ command: "npm test", status: "passed" }],
      evidenceRefs: [".threadsmith/runs/run-1/result.md"]
    });

    expect(parsed.outcome).toBe("succeeded");
    expect(parsed.verification[0]?.status).toBe("passed");
  });

  it("accepts role-aware result fields for pause and gating decisions", () => {
    const parsed = executionResultSchema.parse({
      runId: "018f8b96-f802-73fd-a4aa-44d9eb1b6fa1",
      role: "reviewer",
      provider: "codex",
      outcome: "failed",
      decision: "review-blocked",
      sliceRef: ".threadsmith/phase-runs/run-1/slices/repair-1.json",
      pauseRecommendation: {
        type: "missing-info",
        summary: "当前证据不足以继续推进。",
        detail: "缺少可复现输入与目标行为边界。",
        resumeRequirements: ["补齐输入样例", "明确目标行为"]
      },
      riskHits: ["app-wide boot surface"],
      summary: "当前实现还不能进入 verification，需要先回到 repair slice。",
      changedFiles: [],
      verification: [{ command: "npm test", status: "failed" }],
      evidenceRefs: [".threadsmith/runs/run-2/result.md"],
      blocker: "Reviewer 已确认存在阻塞性发现。"
    });

    expect(parsed.decision).toBe("review-blocked");
    expect(parsed.pauseRecommendation?.type).toBe("missing-info");
    expect(parsed.riskHits).toContain("app-wide boot surface");
  });
});

describe("agentRunRecordSchema", () => {
  it("accepts a persisted run record", () => {
    const parsed = agentRunRecordSchema.parse({
      runId: "018f8b96-f802-73fd-a4aa-44d9eb1b6fa0",
      projectRoot: "/tmp/threadsmith-project",
      role: "executor",
      provider: "codex",
      status: "queued",
      createdAt: "2026-04-08T10:00:00.000Z",
      startedAt: null,
      finishedAt: null,
      packetPath: ".threadsmith/runs/run-1/packet.json",
      promptPath: null,
      resultPath: null,
      summaryPath: null,
      stdoutPath: null,
      stderrPath: null,
      outcome: null,
      statusDetail: null
    });

    expect(parsed.status).toBe("queued");
    expect(parsed.packetPath).toContain("packet.json");
  });
});
