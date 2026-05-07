import { describe, expect, it } from "vitest";
import type { ProjectState, WorkflowEvent } from "@threadsmith/domain";
import { deriveLatestCloseoutRecord } from "./closeout.ts";

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
    closeoutStatus: "pending",
    knownGaps: [],
    finalState: "accepted-with-closeout-pending"
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

describe("deriveLatestCloseoutRecord", () => {
  it("prefers the latest closeout event when present", () => {
    const events: WorkflowEvent[] = [
      {
        id: "closeout",
        createdAt: "2026-04-04T00:00:00.000Z",
        kind: "workflow-transition",
        title: "Closeout 已完成",
        detail: "Acceptance 已进入 accepted。 Closeout：.threadsmith/closeouts/closeout.md",
        role: "closeout",
        transitionId: "closeout-complete",
        artifactPath: ".threadsmith/closeouts/closeout.md"
      }
    ];

    const closeout = deriveLatestCloseoutRecord(baseState, events);

    expect(closeout.status).toBe("done");
    expect(closeout.source).toBe("event");
    expect(closeout.artifactPath).toContain(".threadsmith/closeouts/");
  });

  it("falls back to state when no closeout event exists", () => {
    const closeout = deriveLatestCloseoutRecord(baseState, []);

    expect(closeout.status).toBe("pending");
    expect(closeout.headline).toBe("Closeout 待完成");
    expect(closeout.source).toBe("state");
    expect(closeout.artifactPath).toBeNull();
  });
});
