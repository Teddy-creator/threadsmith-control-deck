import { describe, expect, it } from "vitest";
import type {
  AgentRunRecord,
  CommandBridgeState,
  PhaseRunPause,
  PhaseRunRecord,
  ProviderRouting,
  ProjectState,
  ProjectSupervisionState
} from "@threadsmith/domain";
import { deriveSupervisorState } from "./supervisorState.ts";

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

const failedRun: AgentRunRecord = {
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
};

const reportingFailureRun: AgentRunRecord = {
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
};

const persistedCommandBridgeState: CommandBridgeState = {
  latestRoute: {
    routeId: "route-1",
    sourceActionId: "advance-phase",
    surface: "deck-action-bridge",
    provider: "codex",
    targetRole: "executor",
    projectLabel: "Threadsmith",
    projectRoot: "/tmp/threadsmith-project",
    status: "failed",
    statusDetail: "最新 route 已写入 committed truth，等待修复后重试。",
    createdAt: "2026-04-08T11:00:00.000Z",
    updatedAt: "2026-04-08T11:05:00.000Z",
    artifactPath: ".threadsmith/bridges/2026-04-08T11-00-00-000Z-deck-action-bridge.md",
    runId: "run-1"
  },
  latestRun: {
    runId: "run-1",
    routeId: "route-1",
    provider: "codex",
    role: "executor",
    status: "failed",
    summary: "失败结果已经写回 committed truth。",
    recordedAt: "2026-04-08T11:05:00.000Z",
    artifactPath: ".threadsmith/runs/run-1/result.md",
    truthWritebackStatus: "failed-written"
  },
  updatedAt: "2026-04-08T11:05:00.000Z"
};

const persistedReportingFailureBridgeState: CommandBridgeState = {
  latestRoute: {
    routeId: "route-reporting-failure",
    sourceActionId: "advance-phase",
    surface: "deck-action-bridge",
    provider: "codex",
    targetRole: "executor",
    projectLabel: "Threadsmith",
    projectRoot: "/tmp/threadsmith-project",
    status: "failed",
    statusDetail: "任务主体已完成，但结果上报阶段触发 rate limit。",
    createdAt: "2026-04-09T11:00:00.000Z",
    updatedAt: "2026-04-09T11:05:00.000Z",
    artifactPath: ".threadsmith/bridges/2026-04-09T11-00-00-000Z-deck-action-bridge.md",
    runId: "run-reporting-failure"
  },
  latestRun: {
    runId: "run-reporting-failure",
    routeId: "route-reporting-failure",
    provider: "codex",
    role: "executor",
    status: "failed",
    taskOutcome: "succeeded",
    failureStage: "result-reporting",
    failureKind: "rate-limit",
    summary: "任务主体已完成，但 Codex CLI 在结果上报阶段触发 rate limit。",
    recordedAt: "2026-04-09T11:05:00.000Z",
    artifactPath: ".threadsmith/runs/run-reporting-failure/result.md",
    truthWritebackStatus: "failed-written"
  },
  updatedAt: "2026-04-09T11:05:00.000Z"
};

const projectSupervisionState: ProjectSupervisionState = {
  mode: "multi-thread",
  modeLabel: "多角色协作",
  summary: "当前由 committed supervision truth 跟踪项目协作现场。",
  lines: [
    {
      id: "conductor-main",
      role: "planner",
      threadLabel: "Conductor",
      provider: null,
      presence: "logical",
      status: "done",
      taskSummary: "Conductor 已收束当前总命令并等待 Builder 结果。",
      requiresUserDecision: false,
      blockerSummary: null,
      latestEvidenceLabel: "phase contract 已刷新",
      updatedAt: "2026-04-08T11:01:00.000Z"
    },
    {
      id: "builder-main",
      role: "executor",
      threadLabel: "Builder",
      provider: "codex",
      presence: "live",
      status: "running",
      taskSummary: "Build workflow loop",
      requiresUserDecision: false,
      blockerSummary: null,
      latestEvidenceLabel: "最新 packet 已刷新",
      updatedAt: "2026-04-08T11:04:00.000Z"
    }
  ],
  updatedAt: "2026-04-08T11:04:00.000Z"
};

const mixedProviderRouting: ProviderRouting = {
  planner: "claude",
  executor: "codex",
  reviewer: "codex",
  verifier: "codex",
  closeout: "codex",
  conductorSurface: "claude-cli"
};

const claudeExecutorRouting: ProviderRouting = {
  planner: "claude",
  executor: "claude",
  reviewer: "codex",
  verifier: "codex",
  closeout: "codex",
  conductorSurface: "claude-cli"
};

const pausedPhaseRun: PhaseRunRecord = {
  phaseRunId: "phase-run-1",
  projectRoot: "/tmp/threadsmith-project",
  status: "paused",
  currentRole: "verifier",
  currentSliceId: "repair-2",
  repairCount: 2,
  lockedPhaseSnapshotRef: ".threadsmith/phase-runs/phase-run-1/locked-phase.json",
  latestSuccessfulRole: "reviewer",
  pauseReason: "验证失败，需要先修一轮。",
  resumeHint: "npm run threadsmith:autopilot -- continue /tmp/threadsmith-project",
  workspacePath: "/tmp/threadsmith-project/.threadsmith-runtime/phase-run-1",
  latestRunRef: ".threadsmith/runs/run-3/result.json",
  eventRefs: [],
  startedAt: "2026-04-12T09:00:00.000Z",
  finishedAt: null
};

const pausedPhaseRunPause: PhaseRunPause = {
  phaseRunId: "phase-run-1",
  type: "risk",
  role: "verifier",
  summary: "验证失败，需要先修一轮。",
  detail: "自动链路在 verifier 阶段命中风险规则，先修复再 continue。",
  resumeRequirements: ["修复失败测试", "重新跑验证"],
  recommendedPrompt:
    "npm run threadsmith:autopilot -- continue /tmp/threadsmith-project",
  createdAt: "2026-04-12T09:30:00.000Z"
};

describe("deriveSupervisorState", () => {
  it("preserves latest run metadata for the deck", () => {
    const supervisorState = deriveSupervisorState(baseState, [], failedRun);

    expect(supervisorState.latestRun?.runId).toBe("run-1");
    expect(supervisorState.latestRun?.status).toBe("failed");
  });

  it("derives failed-run gate and recommendation from latest run", () => {
    const supervisorState = deriveSupervisorState(baseState, [], failedRun);

    expect(supervisorState.gateSignal.reasons).toContain("latest-run-failed");
    expect(supervisorState.nextBestStep.primary.label).toBe("修复自动执行失败");
  });

  it("derives command bridge summary for automation-backed recommendations", () => {
    const supervisorState = deriveSupervisorState(baseState, [], failedRun);

    expect(supervisorState.commandBridge.action.bridgeEnabled).toBe(true);
    expect(supervisorState.commandBridge.recommendedRoute?.provider).toBe("codex");
    expect(supervisorState.commandBridge.recommendedRoute?.targetRole).toBe(
      "executor"
    );
    expect(
      supervisorState.commandBridge.recommendedRoute?.bridgeSurfaceLabel
    ).toBe("Deck 推荐动作 -> Codex CLI");
    expect(supervisorState.commandBridge.latestResult.status).toBe("failed");
    expect(supervisorState.commandBridge.latestResult.detail).toContain(
      "测试失败"
    );
    expect(supervisorState.commandBridge.latestResult.truthWritebackLabel).toBe(
      "失败结果已写回"
    );
    expect(supervisorState.commandBridge.recommendedRoute?.suggestedPrompt).toBe(
      null
    );
  });

  it("prefers committed route truth when bridge state is available", () => {
    const supervisorState = deriveSupervisorState(
      baseState,
      [],
      failedRun,
      persistedCommandBridgeState
    );

    expect(supervisorState.commandBridge.latestRoute.status).toBe("failed");
    expect(supervisorState.commandBridge.latestRoute.provider).toBe("codex");
    expect(supervisorState.commandBridge.latestRoute.targetRole).toBe("executor");
    expect(supervisorState.commandBridge.latestRoute.bridgeSurfaceLabel).toBe(
      "Deck 推荐动作 -> Codex CLI"
    );
    expect(supervisorState.commandBridge.latestRoute.artifactPath).toBe(
      ".threadsmith/bridges/2026-04-08T11-00-00-000Z-deck-action-bridge.md"
    );
    expect(supervisorState.commandBridge.latestResult.detail).toBe(
      "失败结果已经写回 committed truth。"
    );
    expect(supervisorState.commandBridge.recommendedRoute?.artifactPath).toBe(
      ".threadsmith/bridges/2026-04-08T11-00-00-000Z-deck-action-bridge.md"
    );
  });

  it("surfaces reporting-stage failures as classified latest results", () => {
    const supervisorState = deriveSupervisorState(
      baseState,
      [],
      reportingFailureRun,
      persistedReportingFailureBridgeState
    );

    expect(supervisorState.commandBridge.latestResult.status).toBe("failed");
    expect(supervisorState.commandBridge.latestResult.headline).toBe(
      "最近一次桥接卡在结果上报"
    );
    expect(supervisorState.commandBridge.latestResult.taskOutcomeLabel).toBe(
      "任务体已完成"
    );
    expect(supervisorState.commandBridge.latestResult.failureStageLabel).toBe(
      "失败于结果上报"
    );
    expect(supervisorState.commandBridge.latestResult.failureKindLabel).toBe(
      "rate limit"
    );
    expect(supervisorState.nextBestStep.primary.label).toBe("处理结果上报失败");
  });

  it("derives project supervision and phase participants from committed supervision truth", () => {
    const supervisorState = deriveSupervisorState(
      baseState,
      [],
      failedRun,
      null,
      projectSupervisionState
    );

    expect(supervisorState.projectSupervision.modeLabel).toBe("多角色协作");
    expect(supervisorState.projectSupervision.runningCount).toBe(1);
    expect(supervisorState.projectSupervision.lines[0]?.assignmentLabel).toBe(
      "逻辑角色"
    );
    expect(supervisorState.projectSupervision.lines[1]?.providerLabel).toBe(
      "Codex"
    );
    expect(supervisorState.phaseParticipants[0]?.providerLabel).toBe("Codex");
    expect(supervisorState.phaseParticipants[1]?.providerLabel).toBe("Codex");
  });

  it("uses routed providers for logical roles while preserving live provider truth", () => {
    const supervisorState = deriveSupervisorState(
      baseState,
      [],
      failedRun,
      null,
      projectSupervisionState,
      mixedProviderRouting
    );

    expect(supervisorState.projectSupervision.lines[0]?.providerLabel).toBe(
      "Claude"
    );
    expect(supervisorState.projectSupervision.lines[0]?.assignmentLabel).toBe(
      "逻辑角色"
    );
    expect(supervisorState.projectSupervision.lines[1]?.providerLabel).toBe(
      "Codex"
    );
    expect(supervisorState.phaseParticipants[0]?.providerLabel).toBe("Claude");
    expect(supervisorState.phaseParticipants[1]?.providerLabel).toBe("Codex");
  });

  it("marks claude-routed executor actions as unavailable for auto execution", () => {
    const supervisorState = deriveSupervisorState(
      baseState,
      [],
      null,
      null,
      projectSupervisionState,
      claudeExecutorRouting
    );

    expect(supervisorState.commandBridge.action.bridgeEnabled).toBe(false);
    expect(supervisorState.commandBridge.recommendedRoute?.provider).toBe(
      "claude"
    );
    expect(supervisorState.commandBridge.recommendedRoute?.availability).toBe(
      "unavailable"
    );
    expect(
      supervisorState.commandBridge.recommendedRoute?.availabilityLabel
    ).toBe("已配置，暂不支持自动执行");
    expect(supervisorState.commandBridge.recommendedRoute?.detail).toContain(
      "auto-execution v1 仅支持 Codex"
    );
    expect(supervisorState.commandBridge.recommendedRoute?.suggestedPrompt).toContain(
      "项目：Threadsmith"
    );
    expect(supervisorState.commandBridge.recommendedRoute?.suggestedPrompt).toContain(
      "当前 phase：Build workflow loop"
    );
    expect(supervisorState.commandBridge.recommendedRoute?.suggestedPrompt).toContain(
      "当前建议动作：推进当前 phase"
    );
    expect(supervisorState.commandBridge.recommendedRoute?.suggestedPrompt).toContain(
      "当前指挥入口：Claude CLI"
    );
    expect(supervisorState.commandBridge.recommendedRoute?.suggestedPrompt).toContain(
      "本轮停止条件：当前 slice 到达待评审或待验证状态。"
    );
  });

  it("surfaces latest phase-run and pause summaries from committed truth", () => {
    const supervisorState = deriveSupervisorState(
      baseState,
      [],
      null,
      null,
      null,
      null,
      pausedPhaseRun,
      pausedPhaseRunPause
    );

    expect(supervisorState.latestPhaseRun?.phaseRunId).toBe("phase-run-1");
    expect(supervisorState.latestPhaseRunSummary.status).toBe("paused");
    expect(supervisorState.latestPhaseRunSummary.currentSliceLabel).toBe(
      "修复 slice 2"
    );
    expect(supervisorState.latestPhaseRunSummary.repairCount).toBe(2);
    expect(supervisorState.latestPhaseRunSummary.latestSuccessfulRoleLabel).toBe(
      "评审"
    );
    expect(supervisorState.latestPhasePauseSummary.summary).toBe(
      "验证失败，需要先修一轮。"
    );
    expect(supervisorState.latestPhaseRunSummary.operatorStateLabel).toBe(
      "需要介入"
    );
    expect(supervisorState.latestPhaseRunSummary.operatorHeadline).toBe(
      "先补齐恢复条件，再去指挥入口 continue"
    );
  });

  it("derives pause-aware gate and next-step signals from phase-run truth", () => {
    const supervisorState = deriveSupervisorState(
      baseState,
      [],
      null,
      null,
      null,
      null,
      pausedPhaseRun,
      pausedPhaseRunPause
    );

    expect(supervisorState.gateSignal.reasons).toContain("phase-run-paused");
    expect(supervisorState.health.level).toBe("risky");
    expect(supervisorState.nextBestStep.primary.label).toBe("先处理恢复条件");
    expect(supervisorState.nextBestStep.primary.reason).toContain("回到指挥入口");
  });

  it("routes invalid context artifacts to context sync recovery", () => {
    const supervisorState = deriveSupervisorState(
      baseState,
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [],
      true,
      "无法读取 .threadsmith/context/current-packet.json：missing budget"
    );

    expect(supervisorState.contextRecovery.action).toBe("sync-context");
    expect(supervisorState.contextRecovery.reasons).toContain(
      "context-artifact-invalid"
    );
    expect(supervisorState.nextBestStep.primary.label).toBe("刷新 Context Packet");
    expect(supervisorState.gateSignal.reasons).toContain(
      "context-artifact-invalid"
    );
  });
});
