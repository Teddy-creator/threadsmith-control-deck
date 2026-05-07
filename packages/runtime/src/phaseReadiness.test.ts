import { describe, expect, it } from "vitest";
import type { ProjectState, WorkflowEvent } from "@threadsmith/domain";
import { derivePhaseReadiness } from "./phaseReadiness.ts";

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
      { id: "a", label: "Do the thing", status: "pass" }
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

describe("derivePhaseReadiness", () => {
  it("returns ready when accepted closeout is complete and no debt remains", () => {
    const events: WorkflowEvent[] = [
      {
        id: "closeout",
        createdAt: "2026-04-04T00:00:00.000Z",
        kind: "workflow-transition",
        title: "Closeout 已完成",
        detail: "Acceptance 已进入 accepted。",
        role: "closeout",
        transitionId: "closeout-complete"
      }
    ];

    const summary = derivePhaseReadiness(
      {
        ...baseState,
        acceptanceState: {
          ...baseState.acceptanceState,
          verificationStatus: "passed",
          closeoutStatus: "done",
          finalState: "accepted"
        }
      },
      events
    );

    expect(summary.overall).toBe("ready");
    expect(summary.latestCloseoutMoment).toBe("2026-04-04T00:00:00.000Z");
    expect(summary.checks.every((item) => item.status === "ready")).toBe(true);
  });

  it("returns not-ready when blockers or supervisor decisions remain", () => {
    const summary = derivePhaseReadiness(
      {
        ...baseState,
        acceptanceState: {
          ...baseState.acceptanceState,
          reviewStatus: "review-blocked",
          finalState: "review-blocked"
        },
        activeWork: {
          items: [
            {
              role: "reviewer",
              status: "blocked",
              taskSummary: "Blocking findings need resolution",
              requiresUserDecision: true
            }
          ],
          blockerSummary: "Blocking review findings need resolution"
        }
      },
      []
    );

    expect(summary.overall).toBe("not-ready");
    expect(summary.checks.some((item) => item.status === "pending")).toBe(true);
  });
});
