import { describe, expect, it } from "vitest";
import type { ProjectState } from "@threadsmith/domain";
import { selectNextBestStep } from "./nextBestStep.ts";

const baseState: ProjectState = {
  projectBrief: {
    projectGoal: "Ship Threadsmith v1",
    currentVersionScope: "Workflow-first control deck",
    nonGoals: [],
    keyConstraints: [],
    successFrame: "It works",
    priorityOrder: ["Workflow loop"],
    openStrategicQuestions: []
  },
  projectStatus: {
    projectLabel: "Threadsmith",
    currentTrack: "Workflow-first control deck",
    overallState: "in-progress",
    currentFocus: "Stand up the loop",
    projectStatusSummary: "The project is moving through the workflow loop.",
    latestAcceptedSlice: null,
    nextPlannedSlice: {
      title: "Build workflow loop",
      recordedAt: null
    },
    topRisks: [],
    updatedAt: null
  },
  projectRoadmap: {
    versionLabel: "Threadsmith v1",
    finalGoal: "It works",
    milestones: [
      {
        id: "baseline",
        label: "项目基线",
        title: "建立项目基线",
        summary: "项目已经具备最小状态。",
        state: "done"
      },
      {
        id: "workflow-loop",
        label: "工作流闭环",
        title: "Build workflow loop",
        summary: "让 workflow loop 可以真实推进。",
        state: "current"
      },
      {
        id: "verify",
        label: "验证收口",
        title: "补齐验证与收尾",
        summary: "让每次推进都留下证据。",
        state: "next"
      }
    ],
    updatedAt: null
  },
  currentPhase: {
    phaseName: "Build workflow loop",
    phaseGoal: "Stand up the loop",
    deliverable: "Runnable control deck",
    inScope: ["Runtime selectors"],
    outOfScope: ["Native packaging"],
    stopCondition: "The deck can derive a recommendation",
    verificationForThisPhase: ["Run tests"],
    activeOwners: ["planner", "executor"],
    blockedBy: []
  },
  acceptanceState: {
    currentClaim: "The deck can coordinate the workflow",
    doneWhenChecklist: [
      { id: "a", label: "Do the thing", status: "unknown" }
    ],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: [],
    finalState: "not-ready"
  },
  activeWork: {
    items: [],
    blockerSummary: null
  },
  preferences: {
    projectDefault: "smart-continuation",
    globalDefault: null,
    resolved: {
      continuationBehavior: "smart-continuation",
      continuationBehaviorSource: "project-default"
    }
  }
};

describe("selectNextBestStep", () => {
  it("prefers verification-gap repair after verification failure", () => {
    const result = selectNextBestStep({
      ...baseState,
      acceptanceState: {
        ...baseState.acceptanceState,
        verificationStatus: "failed"
      }
    });

    expect(result.primary.label).toBe("修复 verification 缺口");
    expect(result.primary.actionId).toBe("advance-phase");
  });

  it("recommends packaging the accepted state after closeout", () => {
    const result = selectNextBestStep({
      ...baseState,
      acceptanceState: {
        ...baseState.acceptanceState,
        verificationStatus: "passed",
        closeoutStatus: "done",
        finalState: "accepted"
      }
    }, {
      status: "missing",
      kind: null,
      freshness: null,
      headline: "还没有 handoff 或 hygiene packet",
      detail: "运行 hygiene 或创建 handoff，把当前 Threadsmith truth 收进可复用的 packet。",
      freshnessDetail: null,
      recordedAt: null
    });

    expect(result.primary.label).toBe("打包已接受状态");
    expect(result.primary.actionId).toBe("create-handoff");
  });

  it("keeps recommending create-handoff when only a hygiene packet exists", () => {
    const result = selectNextBestStep({
      ...baseState,
      acceptanceState: {
        ...baseState.acceptanceState,
        verificationStatus: "passed",
        closeoutStatus: "done",
        finalState: "accepted"
      }
    }, {
      status: "available",
      kind: "hygiene",
      freshness: "fresh",
      headline: "已创建 hygiene packet",
      detail: "已重新锚定当前 truth。 Packet：.threadsmith/packets/example-hygiene.md",
      freshnessDetail: "这个 packet 与最新记录的 workflow truth 一致。",
      recordedAt: "2026-04-04T00:00:00.000Z"
    });

    expect(result.primary.label).toBe("打包已接受状态");
    expect(result.primary.actionId).toBe("create-handoff");
  });

  it("turns a fresh accepted handoff into next-slice drafting guidance", () => {
    const result = selectNextBestStep({
      ...baseState,
      acceptanceState: {
        ...baseState.acceptanceState,
        verificationStatus: "passed",
        closeoutStatus: "done",
        finalState: "accepted"
      }
    }, {
      status: "available",
      kind: "handoff",
      freshness: "fresh",
      headline: "已创建 handoff packet",
      detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
      freshnessDetail: "这个 packet 与最新记录的 workflow truth 一致。",
      recordedAt: "2026-04-04T00:00:00.000Z"
    });

    expect(result.primary.label).toBe("起草下一刀并准备 phase reset");
    expect(result.primary.actionId).toBe("open-current-phase");
    expect(result.primary.reason).toContain("基于这份边界收束下一条窄 slice");
    expect(result.primary.stopCondition).toBe(
      "新的 current phase draft 已准备好，并且可以正式 phase reset。"
    );
    expect(
      result.alternatives.some((item) => item.label === "查看 accepted handoff 边界")
    ).toBe(true);
  });

  it("recommends refreshing a stale handoff packet before review", () => {
    const result = selectNextBestStep({
      ...baseState,
      acceptanceState: {
        ...baseState.acceptanceState,
        verificationStatus: "passed",
        closeoutStatus: "done",
        finalState: "accepted"
      }
    }, {
      status: "available",
      kind: "handoff",
      freshness: "stale",
      headline: "已创建 handoff packet",
      detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
      freshnessDetail: "这个 packet 之后又出现了更新的 workflow 事件“Reviewer 已放行这个 slice”。",
      recordedAt: "2026-04-04T00:00:00.000Z"
    });

    expect(result.primary.label).toBe("刷新 continuation packet");
    expect(result.primary.actionId).toBe("create-handoff");
  });

  it("changes recommendation after advance-phase starts execution", () => {
    const before = selectNextBestStep(baseState);
    const after = selectNextBestStep({
      ...baseState,
      activeWork: {
        items: [
          {
            role: "executor",
            status: "running",
            taskSummary: "实现当前这刀 narrow slice",
            requiresUserDecision: false
          }
        ],
        blockerSummary: null
      }
    });

    expect(before.primary.actionId).toBe("advance-phase");
    expect(after.primary.actionId).not.toBe("advance-phase");
    expect(after.primary.actionId).toBe("open-current-phase");
  });

  it("tells the operator to wait while a latest run is still executing", () => {
    const result = selectNextBestStep(
      baseState,
      undefined,
      {
        runId: "run-live",
        projectRoot: "/tmp/threadsmith-project",
        role: "executor",
        provider: "codex",
        status: "running",
        createdAt: "2026-04-12T11:00:00.000Z",
        startedAt: "2026-04-12T11:00:00.000Z",
        finishedAt: null,
        packetPath: ".threadsmith/runs/run-live/packet.json",
        promptPath: ".threadsmith/runs/run-live/prompt.md",
        resultPath: null,
        summaryPath: null,
        stdoutPath: ".threadsmith/runs/run-live/stdout.log",
        stderrPath: ".threadsmith/runs/run-live/stderr.log",
        outcome: null,
        statusDetail: "Builder 正在实现当前 slice。"
      }
    );

    expect(result.primary.actionId).toBe("open-current-phase");
    expect(result.primary.label).toBe("等待执行结果回流");
    expect(result.primary.reason).toContain("当前无需重新签发动作");
    expect(result.primary.reason).toContain("等 committed truth 更新");
  });

  it("tells the operator to recover a paused autopilot run before resuming", () => {
    const result = selectNextBestStep(
      baseState,
      undefined,
      null,
      {
        exists: true,
        status: "paused",
        statusLabel: "已暂停",
        operatorState: "needs-intervention",
        operatorStateLabel: "需要介入",
        operatorHeadline: "先处理恢复条件，再显式 continue",
        operatorDetail: "自动链路在 verifier 阶段命中风险规则，先修复失败项再恢复。",
        phaseRunId: "phase-run-1",
        headline: "自动链路暂停在验证",
        detail: "自动链路在 verifier 阶段命中风险规则，先修复失败项再恢复。",
        currentRole: "verifier",
        currentRoleLabel: "验证",
        currentSliceId: "repair-2",
        currentSliceLabel: "修复 slice 2",
        repairCount: 2,
        repairLabel: "repair 第 2 轮",
        latestSuccessfulRole: "reviewer",
        latestSuccessfulRoleLabel: "评审",
        pauseReason: "验证失败，需要先修一轮。",
        resumeHint: "npm run threadsmith:autopilot -- continue /tmp/threadsmith-project",
        startedAt: "2026-04-12T09:00:00.000Z",
        finishedAt: null,
        latestRunRef: ".threadsmith/runs/run-3/result.json",
        workspacePath: "/tmp/threadsmith-project/.threadsmith-runtime/phase-run-1"
      },
      {
        exists: true,
        status: "recorded",
        type: "risk",
        typeLabel: "风险命中",
        role: "verifier",
        roleLabel: "验证",
        summary: "验证失败，需要先修一轮。",
        detail: "自动链路在 verifier 阶段命中风险规则，先修复失败项再恢复。",
        resumeRequirements: ["修复失败测试", "重新运行 verification"],
        recommendedPrompt:
          "npm run threadsmith:autopilot -- continue /tmp/threadsmith-project",
        createdAt: "2026-04-12T09:30:00.000Z"
      }
    );

    expect(result.primary.actionId).toBe("open-current-phase");
    expect(result.primary.label).toBe("先处理恢复条件");
    expect(result.primary.stopCondition).toContain("显式 continue");
    expect(result.primary.reason).toContain("回到指挥入口");
  });

  it("surfaces a startup-boundary recommendation for bootstrap-style planning states", () => {
    const result = selectNextBestStep({
      ...baseState,
      currentPhase: {
        ...baseState.currentPhase,
        activeOwners: ["planner"],
        stopCondition: "项目已经具备第一条可执行 slice 的边界。"
      },
      activeWork: {
        items: [
          {
            role: "planner",
            status: "running",
            taskSummary: "为 live-project 起草第一条 task brief 与 phase contract",
            requiresUserDecision: true
          }
        ],
        blockerSummary: null
      },
      acceptanceState: {
        ...baseState.acceptanceState,
        implementationStatus: "not-started",
        reviewStatus: "not-started",
        verificationStatus: "not-started"
      }
    });

    expect(result.primary.actionId).toBe("advance-phase");
    expect(result.primary.label).toBe("补齐启动边界");
    expect(result.primary.reason).toContain("起草第一条 task brief");
    expect(result.primary.reason).toContain("补完后再回到 autopilot");
  });

  it("surfaces a failed latest run as a repair recommendation", () => {
    const result = selectNextBestStep(
      {
        ...baseState,
        activeWork: {
          items: [
            {
              role: "executor",
              status: "blocked",
              taskSummary: "自动执行失败，等待修复后重试",
              requiresUserDecision: false
            }
          ],
          blockerSummary: "测试失败，当前 slice 还不能交给 review。"
        }
      },
      undefined,
      {
        runId: "run-1",
        projectRoot: "/tmp/threadsmith-project",
        role: "executor",
        provider: "codex",
        status: "failed",
        createdAt: "2026-04-08T11:00:00.000Z",
        startedAt: "2026-04-08T11:00:00.000Z",
        finishedAt: "2026-04-08T11:05:00.000Z",
        packetPath: ".threadsmith/runs/run-1/packet.json",
        promptPath: ".threadsmith/runs/run-1/prompt.md",
        resultPath: ".threadsmith/runs/run-1/result.json",
        summaryPath: ".threadsmith/runs/run-1/result.md",
        stdoutPath: ".threadsmith/runs/run-1/stdout.log",
        stderrPath: ".threadsmith/runs/run-1/stderr.log",
        outcome: "failed",
        statusDetail: "测试失败，当前 slice 还不能交给 review。"
      }
    );

    expect(result.primary.actionId).toBe("advance-phase");
    expect(result.primary.label).toBe("修复自动执行失败");
  });

  it("treats reporting-stage failures after task success as a bridge repair recommendation", () => {
    const result = selectNextBestStep(
      {
        ...baseState,
        activeWork: {
          items: [
            {
              role: "executor",
              status: "blocked",
              taskSummary: "任务主体已完成，但结果上报失败，等待修复 bridge / CLI 回流",
              requiresUserDecision: false
            }
          ],
          blockerSummary: "任务主体已完成，但结果上报阶段触发 rate limit；请先处理 CLI / bridge 上报问题。"
        }
      },
      undefined,
      {
        runId: "run-reporting-failure",
        projectRoot: "/tmp/threadsmith-project",
        role: "executor",
        provider: "codex",
        status: "failed",
        createdAt: "2026-04-09T11:00:00.000Z",
        startedAt: "2026-04-09T11:00:00.000Z",
        finishedAt: "2026-04-09T11:05:00.000Z",
        packetPath: ".threadsmith/runs/run-reporting-failure/packet.json",
        promptPath: ".threadsmith/runs/run-reporting-failure/prompt.md",
        resultPath: ".threadsmith/runs/run-reporting-failure/result.json",
        summaryPath: ".threadsmith/runs/run-reporting-failure/result.md",
        stdoutPath: ".threadsmith/runs/run-reporting-failure/stdout.log",
        stderrPath: ".threadsmith/runs/run-reporting-failure/stderr.log",
        outcome: "failed",
        taskOutcome: "succeeded",
        failureStage: "result-reporting",
        failureKind: "rate-limit",
        statusDetail: "任务主体已完成，但 Codex CLI 在结果上报阶段触发 rate limit。"
      }
    );

    expect(result.primary.actionId).toBe("advance-phase");
    expect(result.primary.label).toBe("处理结果上报失败");
    expect(result.primary.reason).toContain("任务体已完成");
  });

  it("recommends a real context sync action when the current packet is missing", () => {
    const result = selectNextBestStep(
      baseState,
      undefined,
      null,
      undefined,
      undefined,
      {
        status: "recover",
        action: "sync-context",
        headline: "缺少 current context packet",
        detail: "当前项目没有可用的 Context Packet，继续前应先从 committed truth 重新生成 packet。",
        reasons: ["context-packet-missing"],
        selectedRole: "executor",
        currentPacketStatus: "missing",
        rolePacketStatus: "not-required"
      }
    );

    expect(result.primary.actionId).toBe("sync-context");
    expect(result.primary.label).toBe("生成 Context Packet");
    expect(result.primary.stopCondition).toBe(
      "Context Packet 与当前 committed truth 重新一致。"
    );
  });
});
