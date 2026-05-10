import { afterEach, vi } from "vitest";

export function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export function buildBridgeResponseBody(actionHistoryLength = 0) {
  return {
    projectRoot: "/tmp/live-project",
    state: {
      projectBrief: {
        projectGoal: "Ship live-project v1",
        currentVersionScope: "Workflow-first control deck",
        nonGoals: [],
        keyConstraints: [],
        successFrame: "Move the current phase to a real implementation loop",
        priorityOrder: ["Project-first truth"],
        openStrategicQuestions: []
      },
      currentPhase: {
        phaseName: "Build workflow loop",
        phaseGoal: "Stand up the first real workflow slice",
        deliverable: "A usable deck loop",
        inScope: ["Project truth"],
        outOfScope: ["Native shell"],
        stopCondition: "The workflow loop is visible in the deck",
        verificationForThisPhase: ["Run tests"],
        activeOwners: ["planner"],
        blockedBy: []
      },
      acceptanceState: {
        currentClaim: "The current slice is still being planned.",
        doneWhenChecklist: [
          {
            id: "project-status",
            label: "Project truth is visible",
            status: "unknown"
          }
        ],
        implementationStatus: "not-started",
        reviewStatus: "not-started",
        verificationStatus: "not-started",
        closeoutStatus: "not-started",
        knownGaps: ["Missing project-level truth"],
        finalState: "not-ready"
      },
      activeWork: {
        items: [
          {
            role: "planner",
            status: "running",
            taskSummary: "Write the first workflow slice",
            requiresUserDecision: false
          }
        ],
        blockerSummary: null
      },
      preferences: {
        projectDefault: null,
        globalDefault: null,
        resolved: {
          continuationBehavior: "ask-every-time",
          continuationBehaviorSource: "fallback"
        }
      }
    },
    skillRouting: {
      version: 1,
      updatedAt: "2026-05-10T12:10:15.000Z",
      generatedFrom: {
        discoveryGeneratedAt: "2026-05-10T11:25:00.000Z",
        discoverySkillCount: 25
      },
      routePreferences: [
        {
          role: null,
          capability: "plan",
          adapterId: "writing-plans",
          reason: "Use the planning skill before implementation."
        }
      ],
      disabledAdapters: [],
      fallbackAvailability: "missing",
      notes: [
        "External skills are discovered and routed by Threadsmith v1, but not executed automatically."
      ]
    },
    recentEvents: [],
    latestPhaseRun: null,
    latestPhasePause: null,
    contextArtifactsLoaded: false,
    contextArtifactProblem: null,
    currentPacket: null,
    rolePackets: [],
    actionHistoryLength
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
