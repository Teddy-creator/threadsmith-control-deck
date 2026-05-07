import { describe, expect, it } from "vitest";
import type { ProjectState, WorkflowEvent } from "@threadsmith/domain";
import { deriveLatestVerificationEvidence } from "./evidence.ts";

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

describe("deriveLatestVerificationEvidence", () => {
  it("prefers the latest verifier event when present", () => {
    const events: WorkflowEvent[] = [
      {
        id: "1",
        createdAt: "2026-04-04T00:00:00.000Z",
        kind: "workflow-transition",
        title: "Verifier 已接受当前 claim",
        detail: "最终接受前还需要完成 closeout。",
        role: "verifier",
        transitionId: "verifier-accepted",
        artifactPath: ".threadsmith/evidence/2026-04-04T00-00-00-000Z-verification-passed.md"
      }
    ];

    const evidence = deriveLatestVerificationEvidence(baseState, events);

    expect(evidence.status).toBe("passed");
    expect(evidence.headline).toBe("Verifier 已接受当前 claim");
    expect(evidence.source).toBe("event");
    expect(evidence.artifactPath).toContain(".threadsmith/evidence/");
  });

  it("falls back to state when no verifier event exists", () => {
    const evidence = deriveLatestVerificationEvidence(
      {
        ...baseState,
        acceptanceState: {
          ...baseState.acceptanceState,
          verificationStatus: "ready"
        }
      },
      []
    );

    expect(evidence.status).toBe("ready");
    expect(evidence.headline).toBe("Verification 已就绪");
    expect(evidence.source).toBe("state");
    expect(evidence.artifactPath).toBeNull();
  });
});
