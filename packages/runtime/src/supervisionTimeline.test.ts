import { describe, expect, it } from "vitest";
import type { ProjectState, WorkflowEvent } from "@threadsmith/domain";
import { deriveGateSignal } from "./gates.ts";
import { deriveSupervisionTimeline } from "./supervisionTimeline.ts";

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

describe("deriveSupervisionTimeline", () => {
  it("puts active gates ahead of recent decisions", () => {
    const state: ProjectState = {
      ...baseState,
      acceptanceState: {
        ...baseState.acceptanceState,
        reviewStatus: "review-blocked",
        finalState: "review-blocked"
      },
      activeWork: {
        items: [],
        blockerSummary: "Blocking review findings need resolution"
      }
    };
    const events: WorkflowEvent[] = [
      {
        id: "1",
        createdAt: "2026-04-04T00:00:00.000Z",
        kind: "workflow-transition",
        title: "Reviewer 阻塞了这个 slice",
        detail: "Acceptance 已进入 review-blocked。",
        role: "reviewer",
        transitionId: "reviewer-blocked"
      }
    ];

    const timeline = deriveSupervisionTimeline(
      state,
      deriveGateSignal(state),
      events
    );

    expect(timeline[0]?.source).toBe("active-gate");
    expect(timeline[0]?.title).toBe("存在阻塞性评审发现");
    expect(timeline[1]?.source).toBe("decision");
    expect(timeline[1]?.title).toBe("Reviewer 阻塞了这个 slice");
  });

  it("adds a stale packet gate ahead of later decisions", () => {
    const events: WorkflowEvent[] = [
      {
        id: "1",
        createdAt: "2026-04-04T00:00:00.000Z",
        kind: "deck-action",
        title: "已创建 handoff packet",
        detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
        role: "hygiene",
        actionId: "create-handoff"
      },
      {
        id: "2",
        createdAt: "2026-04-04T00:05:00.000Z",
        kind: "workflow-transition",
        title: "Reviewer 已放行这个 slice",
        detail: "Acceptance 已进入 ready-for-verification。",
        role: "reviewer",
        transitionId: "reviewer-ready-for-verification"
      }
    ];

    const timeline = deriveSupervisionTimeline(
      {
        ...baseState,
        acceptanceState: {
          ...baseState.acceptanceState,
          verificationStatus: "passed",
          closeoutStatus: "done",
          finalState: "accepted"
        }
      },
      deriveGateSignal(
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
      ),
      events
    );

    expect(timeline[0]?.source).toBe("active-gate");
    expect(timeline[0]?.title).toBe("建议刷新 packet");
  });
});
