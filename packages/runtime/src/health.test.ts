import { describe, expect, it } from "vitest";
import type { ProjectState } from "@threadsmith/domain";
import { deriveHealth } from "./health.ts";

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
    overallState: "stable",
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
      { id: "a", label: "Do the thing", status: "pass" }
    ],
    implementationStatus: "ready-for-review",
    reviewStatus: "ready-for-verification",
    verificationStatus: "passed",
    closeoutStatus: "done",
    knownGaps: [],
    finalState: "accepted"
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

describe("deriveHealth", () => {
  it("stays healthy when an accepted slice already has a fresh handoff", () => {
    const health = deriveHealth(baseState, {
      status: "available",
      kind: "handoff",
      freshness: "fresh",
      headline: "已创建 handoff packet",
      detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
      freshnessDetail: "这个 packet 与最新记录的 workflow truth 一致。",
      recordedAt: "2026-04-04T00:00:00.000Z"
    });

    expect(health.level).toBe("healthy");
    expect(health.threadHealth).toBe("healthy");
    expect(health.topRisks).toHaveLength(0);
  });

  it("flags stale continuation packets as a watch-level handoff risk", () => {
    const health = deriveHealth(baseState, {
      status: "available",
      kind: "handoff",
      freshness: "stale",
      headline: "已创建 handoff packet",
      detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
      freshnessDetail:
        "这个 packet 之后又出现了更新的 workflow 事件“Reviewer 已放行这个 slice”。",
      recordedAt: "2026-04-04T00:00:00.000Z"
    });

    expect(health.level).toBe("watch");
    expect(health.threadHealth).toBe("handoff-recommended");
    expect(health.topRisks[0]).toContain("workflow 事件");
  });
});
