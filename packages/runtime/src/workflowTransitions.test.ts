import { describe, expect, it } from "vitest";
import type { ProjectState } from "@threadsmith/domain";
import { selectWorkflowTransitions } from "./workflowTransitions.ts";

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
    items: [
      {
        role: "reviewer",
        status: "running",
        taskSummary: "Review the slice",
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

describe("selectWorkflowTransitions", () => {
  it("offers reviewer outcomes when the reviewer is running", () => {
    const transitions = selectWorkflowTransitions(baseState);

    expect(transitions.map((item) => item.id)).toEqual([
      "reviewer-ready-for-verification",
      "reviewer-blocked"
    ]);
  });
});
