import { describe, expect, it } from "vitest";
import type { ProjectState } from "@threadsmith/domain";
import { deriveGateSignal } from "./gates.ts";

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

describe("deriveGateSignal", () => {
  it("does not surface a gate when an accepted slice already has a fresh handoff", () => {
    const gateSignal = deriveGateSignal(
      {
        ...baseState,
        acceptanceState: {
          ...baseState.acceptanceState,
          verificationStatus: "passed",
          closeoutStatus: "done",
          finalState: "accepted"
        }
      },
      {
        status: "available",
        kind: "handoff",
        freshness: "fresh",
        headline: "已创建 handoff packet",
        detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
        freshnessDetail: "这个 packet 与最新记录的 workflow truth 一致。",
        recordedAt: "2026-04-04T00:00:00.000Z"
      }
    );

    expect(gateSignal.shouldSurfaceDeck).toBe(false);
    expect(gateSignal.reasons).toHaveLength(0);
  });

  it("surfaces verification failure as a key gate", () => {
    const gateSignal = deriveGateSignal({
      ...baseState,
      acceptanceState: {
        ...baseState.acceptanceState,
        verificationStatus: "failed"
      }
    });

    expect(gateSignal.shouldSurfaceDeck).toBe(true);
    expect(gateSignal.reasons).toContain("verification-failed");
  });

  it("surfaces a stale continuation packet as a key gate", () => {
    const gateSignal = deriveGateSignal(
      {
        ...baseState,
        acceptanceState: {
          ...baseState.acceptanceState,
          verificationStatus: "passed",
          closeoutStatus: "done",
          finalState: "accepted"
        }
      },
      {
        status: "available",
        kind: "handoff",
        freshness: "stale",
        headline: "已创建 handoff packet",
        detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
        freshnessDetail:
          "这个 packet 之后又出现了更新的 workflow 事件“Reviewer 已放行这个 slice”。",
        recordedAt: "2026-04-04T00:00:00.000Z"
      }
    );

    expect(gateSignal.shouldSurfaceDeck).toBe(true);
    expect(gateSignal.reasons).toContain("stale-continuation-packet");
  });

  it("surfaces a failed latest run as a key gate", () => {
    const gateSignal = deriveGateSignal(baseState, undefined, {
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
    });

    expect(gateSignal.shouldSurfaceDeck).toBe(true);
    expect(gateSignal.reasons).toContain("latest-run-failed");
  });
});
