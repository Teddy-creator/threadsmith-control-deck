import type {
  AgentRunRecord,
  CommandBridgeState,
  PhaseRunPause,
  PhaseRunRecord,
  ProviderRouting,
  ProjectState,
  ProjectSupervisionState,
  WorkflowEvent
} from "@threadsmith/domain";

export const state: ProjectState = {
  projectBrief: {
    projectGoal: "Ship Threadsmith v1",
    currentVersionScope: "Workflow-first control deck",
    nonGoals: ["暂不做原生 App 封装", "暂不接真实命令桥接"],
    keyConstraints: ["先保持首页视觉骨架稳定", "先把 web control deck 跑通"],
    successFrame: "It works",
    priorityOrder: ["完成项目级工作台", "让 roadmap 映射真实 truth", "再接命令桥"],
    openStrategicQuestions: ["project roadmap 由谁负责维护"]
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
    finalGoal: "Ship Threadsmith v1",
    milestones: [
      {
        id: "product-definition",
        label: "产品定义",
        title: "定义 Threadsmith 的产品方向与 v1 边界",
        summary: "先明确它的产品方向与边界。",
        state: "done"
      },
      {
        id: "information-architecture",
        label: "信息架构",
        title: "厘清首页、阶段、验收与项目视角的信息架构",
        summary: "让页面分工围绕项目真相。",
        state: "done"
      },
      {
        id: "single-screen-shell",
        label: "单屏骨架",
        title: "建立单屏 control deck 的基础骨架",
        summary: "先让 control deck 有稳定骨架。",
        state: "done"
      },
      {
        id: "project-connection",
        label: "项目接入",
        title: "把真实仓库与 `.threadsmith` 真相接入 deck",
        summary: "让 deck 能读取真实项目。",
        state: "done"
      },
      {
        id: "state-visibility",
        label: "状态可视化",
        title: "把 gate、health、evidence 与 events 接到界面上",
        summary: "把运行时状态接到界面。",
        state: "done"
      },
      {
        id: "homepage-refresh",
        label: "首页重构",
        title: "把首页的视觉骨架和信息层级重构到当前版本",
        summary: "让首页回到产品首页。",
        state: "done"
      },
      {
        id: "project-map",
        label: "项目地图",
        title: "让首页第二块回到真正的项目级地图视角",
        summary: "让它回答整个项目走到哪。",
        state: "current"
      },
      {
        id: "workflow-driven-development",
        label: "实战工作流",
        title: "用 Threadsmith 真正驱动 Threadsmith 自身开发",
        summary: "验证它能继续推动下一条开发切片。",
        state: "next"
      },
      {
        id: "real-roadmap-truth",
        label: "真实 roadmap",
        title: "把 project-roadmap 真相接入首页与状态体系",
        summary: "让项目地图从静态展示变成真实 truth。",
        state: "later"
      },
      {
        id: "command-bridge",
        label: "指令桥接",
        title: "建立 deck 与 Codex 执行指令之间的桥接能力",
        summary: "让 deck 推荐动作变成可执行入口。",
        state: "later"
      },
      {
        id: "multi-thread-supervision",
        label: "多线程监督",
        title: "把多线程协作的监督视图做扎实",
        summary: "更清楚描述 conductor、builder、critic。",
        state: "later"
      },
      {
        id: "shipping-surface",
        label: "发布封装",
        title: "把 Threadsmith 收口到更接近可交付产品的启动与使用形态",
        summary: "进一步靠近可长期使用的产品形态。",
        state: "later"
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
    doneWhenChecklist: [{ id: "a", label: "Do the thing", status: "unknown" }],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: [],
    finalState: "not-ready"
  },
  activeWork: {
    items: [
      {
        role: "executor",
        status: "running",
        taskSummary: "Build runtime selectors",
        requiresUserDecision: false
      }
    ],
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

export const events: WorkflowEvent[] = [
  {
    id: "verifier-accepted",
    createdAt: "2026-04-04T00:00:00.000Z",
    kind: "workflow-transition",
    title: "Verifier 已接受当前 claim",
    detail: "最终接受前还需要完成 closeout。",
    role: "verifier",
    transitionId: "verifier-accepted"
  },
  {
    id: "review-ready",
    createdAt: "2026-04-03T23:58:00.000Z",
    kind: "workflow-transition",
    title: "Reviewer 已放行这个 slice",
    detail: "Acceptance 已进入 ready-for-verification。",
    role: "reviewer",
    transitionId: "reviewer-ready-for-verification"
  }
];

export const runningLatestRun: AgentRunRecord = {
  runId: "run-live",
  projectRoot: "/tmp/project",
  role: "executor",
  provider: "codex",
  status: "running",
  createdAt: "2026-04-04T00:05:00.000Z",
  startedAt: "2026-04-04T00:05:00.000Z",
  finishedAt: null,
  packetPath: ".threadsmith/runs/run-live/packet.json",
  promptPath: ".threadsmith/runs/run-live/prompt.md",
  resultPath: null,
  summaryPath: null,
  stdoutPath: ".threadsmith/runs/run-live/stdout.log",
  stderrPath: ".threadsmith/runs/run-live/stderr.log",
  outcome: null,
  statusDetail: "正在实现 runtime selectors，并准备把结果写回当前 truth。"
};

export const failedLatestRun: AgentRunRecord = {
  runId: "run-fail",
  projectRoot: "/tmp/project",
  role: "executor",
  provider: "codex",
  status: "failed",
  createdAt: "2026-04-04T00:05:00.000Z",
  startedAt: "2026-04-04T00:05:00.000Z",
  finishedAt: "2026-04-04T00:08:00.000Z",
  packetPath: ".threadsmith/runs/run-fail/packet.json",
  promptPath: ".threadsmith/runs/run-fail/prompt.md",
  resultPath: ".threadsmith/runs/run-fail/result.json",
  summaryPath: ".threadsmith/runs/run-fail/result.md",
  stdoutPath: ".threadsmith/runs/run-fail/stdout.log",
  stderrPath: ".threadsmith/runs/run-fail/stderr.log",
  outcome: "failed",
  statusDetail: "测试失败，当前 slice 还不能交给 review。"
};

export const reportingFailureLatestRun: AgentRunRecord = {
  runId: "run-reporting-failure",
  projectRoot: "/tmp/project",
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

export const runningPhaseRun: PhaseRunRecord = {
  phaseRunId: "phase-run-live",
  projectRoot: "/tmp/project",
  status: "running",
  currentRole: "reviewer",
  currentSliceId: "repair-1",
  repairCount: 1,
  lockedPhaseSnapshotRef: ".threadsmith/phase-runs/phase-run-live/locked-phase.json",
  latestSuccessfulRole: "executor",
  pauseReason: null,
  resumeHint: null,
  workspacePath: "/tmp/project/.threadsmith-runtime/phase-run-live",
  latestRunRef: ".threadsmith/runs/run-live/result.json",
  eventRefs: [],
  startedAt: "2026-04-04T00:04:00.000Z",
  finishedAt: null
};

export const pausedPhaseRun: PhaseRunRecord = {
  ...runningPhaseRun,
  phaseRunId: "phase-run-paused",
  status: "paused",
  currentRole: "verifier",
  currentSliceId: "repair-2",
  repairCount: 2,
  lockedPhaseSnapshotRef: ".threadsmith/phase-runs/phase-run-paused/locked-phase.json",
  latestSuccessfulRole: "reviewer",
  pauseReason: "验证失败，需要先修一轮。",
  resumeHint: "npm run threadsmith:autopilot -- continue /tmp/project",
  workspacePath: "/tmp/project/.threadsmith-runtime/phase-run-paused"
};

export const pausedPhaseRunPause: PhaseRunPause = {
  phaseRunId: "phase-run-paused",
  type: "risk",
  role: "verifier",
  summary: "验证失败，需要先修一轮。",
  detail: "自动链路在 verifier 阶段命中风险规则，先修复失败项再 continue。",
  resumeRequirements: ["修复失败测试", "重新运行 verification"],
  recommendedPrompt: "npm run threadsmith:autopilot -- continue /tmp/project",
  createdAt: "2026-04-04T00:09:00.000Z"
};

export const persistedCommandBridgeState: CommandBridgeState = {
  latestRoute: {
    routeId: "route-1",
    sourceActionId: "advance-phase",
    surface: "deck-action-bridge",
    provider: "codex",
    targetRole: "executor",
    projectLabel: "Threadsmith",
    projectRoot: "/tmp/project",
    status: "failed",
    statusDetail: "最近一条 deck 推荐路由已经落盘，可据此决定是否重试。",
    createdAt: "2026-04-04T00:05:00.000Z",
    updatedAt: "2026-04-04T00:08:00.000Z",
    artifactPath: ".threadsmith/bridges/2026-04-04T00-05-00-000Z-deck-action-bridge.md",
    runId: "run-fail"
  },
  latestRun: {
    runId: "run-fail",
    routeId: "route-1",
    provider: "codex",
    role: "executor",
    status: "failed",
    summary: "失败结果已经写回 committed truth。",
    recordedAt: "2026-04-04T00:08:00.000Z",
    artifactPath: ".threadsmith/runs/run-fail/result.md",
    truthWritebackStatus: "failed-written"
  },
  updatedAt: "2026-04-04T00:08:00.000Z"
};

export const persistedReportingFailureBridgeState: CommandBridgeState = {
  latestRoute: {
    routeId: "route-reporting-failure",
    sourceActionId: "advance-phase",
    surface: "deck-action-bridge",
    provider: "codex",
    targetRole: "executor",
    projectLabel: "Threadsmith",
    projectRoot: "/tmp/project",
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

export const projectSupervision: ProjectSupervisionState = {
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
      taskSummary: "Conductor 已收束当前总命令并等待 Builder 回流结果。",
      requiresUserDecision: false,
      blockerSummary: null,
      latestEvidenceLabel: "phase contract 已刷新",
      updatedAt: "2026-04-04T00:04:00.000Z"
    },
    {
      id: "builder-main",
      role: "executor",
      threadLabel: "Builder",
      provider: "codex",
      presence: "live",
      status: "running",
      taskSummary: "Build runtime selectors",
      requiresUserDecision: false,
      blockerSummary: null,
      latestEvidenceLabel: "最新 packet 已刷新",
      updatedAt: "2026-04-04T00:05:00.000Z"
    }
  ],
  updatedAt: "2026-04-04T00:05:00.000Z"
};

export const claudeExecutorRouting: ProviderRouting = {
  planner: "claude",
  executor: "claude",
  reviewer: "codex",
  verifier: "codex",
  closeout: "codex",
  conductorSurface: "claude-cli"
};

export const claudeVerifierRouting: ProviderRouting = {
  planner: "codex",
  executor: "codex",
  reviewer: "codex",
  verifier: "claude",
  closeout: "codex",
  conductorSurface: "claude-cli"
};
