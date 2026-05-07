import { describe, expect, it } from "vitest";
import type { AgentRunRecord, CommandBridgeState, ProjectState } from "@threadsmith/domain";
import { deriveCommandBridgeSummary } from "./commandBridge.ts";

const state: ProjectState = {
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
    currentMilestoneId: "workflow-loop",
    nextMilestoneId: null,
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
    doneWhenChecklist: [{ id: "a", label: "Do the thing", status: "unknown" }],
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

const latestRun: AgentRunRecord = {
  runId: "run-live",
  projectRoot: "/tmp/threadsmith-project",
  role: "executor",
  provider: "codex",
  status: "succeeded",
  createdAt: "2026-04-13T03:59:00.000Z",
  startedAt: "2026-04-13T03:59:05.000Z",
  finishedAt: "2026-04-13T04:00:23.000Z",
  packetPath: ".threadsmith/runs/run-live/packet.json",
  promptPath: ".threadsmith/runs/run-live/prompt.md",
  resultPath: ".threadsmith/runs/run-live/result.json",
  summaryPath: ".threadsmith/runs/run-live/result.md",
  stdoutPath: ".threadsmith/runs/run-live/stdout.log",
  stderrPath: ".threadsmith/runs/run-live/stderr.log",
  outcome: "succeeded",
  statusDetail: "self-host smoke 已完成。"
};

const staleRouteBridgeState: CommandBridgeState = {
  latestRoute: {
    routeId: "route-older",
    sourceActionId: "advance-phase",
    surface: "deck-action-bridge",
    provider: "codex",
    targetRole: "executor",
    projectLabel: "Threadsmith",
    projectRoot: "/tmp/threadsmith-project",
    status: "succeeded",
    statusDetail: "这是一条更早的 deck bridge route。",
    createdAt: "2026-04-12T16:11:56.000Z",
    updatedAt: "2026-04-12T16:13:51.000Z",
    artifactPath: ".threadsmith/bridges/older-route.md",
    runId: "run-older"
  },
  latestRun: {
    runId: "run-live",
    routeId: null,
    provider: "codex",
    role: "executor",
    status: "succeeded",
    summary: "self-host smoke 已完成。",
    recordedAt: "2026-04-13T04:00:23.000Z",
    artifactPath: ".threadsmith/runs/run-live/result.md",
    truthWritebackStatus: "written"
  },
  updatedAt: "2026-04-13T04:00:23.000Z"
};

describe("deriveCommandBridgeSummary", () => {
  it("calls out when the latest run is newer than the latest route", () => {
    const summary = deriveCommandBridgeSummary(
      state,
      {
        actionId: "advance-phase",
        label: "推进当前 slice",
        reason: "继续当前实现",
        expectedRoles: ["executor"],
        stopCondition: "进入 review"
      },
      latestRun,
      staleRouteBridgeState
    );

    expect(summary.latestRoute.detail).toContain("不是最新运行对应的桥接记录");
    expect(summary.latestResult.detail).toContain("这次最新运行没有刷新 latestRoute");
  });
});
