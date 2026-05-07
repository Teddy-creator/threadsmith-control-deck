import { describe, expect, it } from "vitest";
import { projectStateSchema } from "./projectState";

describe("projectStateSchema", () => {
  it("parses a complete Threadsmith project state", () => {
    const parsed = projectStateSchema.parse({
      projectBrief: {
        projectGoal: "Ship Threadsmith v1",
        currentVersionScope: "Workflow-first control deck for one active project",
        nonGoals: ["Multi-project orchestration"],
        keyConstraints: ["Stay Codex-first", "Keep v1 single-project"],
        successFrame: "User can advance, review, verify, and close out work",
        priorityOrder: ["Workflow loop", "Deck visibility", "Preferences"],
        openStrategicQuestions: ["Exact native shell packaging"]
      },
      projectStatus: {
        projectLabel: "Threadsmith",
        currentTrack: "Workflow-first control deck for one active project",
        overallState: "in-progress",
        currentFocus: "Stand up the first real control deck workflow",
        projectStatusSummary: "The current project is moving through its first workflow-backed implementation line.",
        latestAcceptedSlice: null,
        nextPlannedSlice: {
          title: "Build workflow loop",
          recordedAt: null
        },
        topRisks: ["Deck bridge not wired yet"],
        updatedAt: null
      },
      projectRoadmap: {
        versionLabel: "Threadsmith v1",
        finalGoal: "User can advance, review, verify, and close out work",
        milestones: [
          {
            id: "baseline",
            label: "项目基线",
            title: "建立项目基线",
            summary: "项目已经具备最小工作流真相。",
            state: "done"
          },
          {
            id: "workflow-loop",
            label: "工作流闭环",
            title: "Build workflow loop",
            summary: "让首页与工作流闭环稳定运行。",
            state: "current"
          },
          {
            id: "verification",
            label: "验证收口",
            title: "补齐验证与 closeout",
            summary: "让每一刀都具备证据与收尾。",
            state: "next"
          }
        ],
        updatedAt: null
      },
      currentPhase: {
        phaseName: "Build workflow loop",
        phaseGoal: "Establish the first deck-backed workflow loop",
        deliverable: "Working current-project control deck shell",
        inScope: ["Workspace scaffold", "Core state contracts"],
        outOfScope: ["Multi-project view"],
        stopCondition: "Deck shell renders and schemas parse correctly",
        verificationForThisPhase: ["Run domain tests", "Boot control deck"],
        activeOwners: ["planner", "executor"],
        blockedBy: []
      },
      acceptanceState: {
        currentClaim: "Threadsmith v1 workspace is scaffolded",
        doneWhenChecklist: [
          { id: "workspace", label: "Workspace exists", status: "pass" },
          { id: "deck", label: "Deck boots", status: "unknown" }
        ],
        implementationStatus: "implementing",
        reviewStatus: "not-started",
        verificationStatus: "not-started",
        closeoutStatus: "not-started",
        knownGaps: ["Deck bridge not wired yet"],
        finalState: "not-ready"
      },
      activeWork: {
        items: [
          {
            role: "executor",
            status: "running",
            taskSummary: "Scaffold the control deck workspace",
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
    });

    expect(parsed.projectBrief.projectGoal).toBe("Ship Threadsmith v1");
    expect(parsed.projectStatus.projectLabel).toBe("Threadsmith");
    expect(parsed.projectRoadmap.milestones[1]?.label).toBe("工作流闭环");
    expect(parsed.currentPhase.phaseName).toBe("Build workflow loop");
    expect(parsed.acceptanceState.doneWhenChecklist).toHaveLength(2);
    expect(parsed.activeWork.items[0]?.role).toBe("executor");
    expect(parsed.preferences.resolved.continuationBehavior).toBe(
      "smart-continuation"
    );
  });
});
