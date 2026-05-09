import { describe, expect, it } from "vitest";
import type { ProjectState } from "@threadsmith/domain";
import { buildContextPacket } from "./contextPacket.ts";

const baseState: ProjectState = {
  projectBrief: {
    projectGoal: "Turn Threadsmith into a context operating layer",
    currentVersionScope: "v0.2.0 Context OS",
    nonGoals: ["multi-provider automatic execution", "native desktop app"],
    keyConstraints: [
      "Keep Codex-only as the stable release lane",
      "Do not replay long chat history into packets"
    ],
    successFrame: "Agents can continue from compact context packets.",
    priorityOrder: ["Context packet", "Repo map", "Role packets"],
    openStrategicQuestions: []
  },
  projectStatus: {
    projectLabel: "Threadsmith",
    currentTrack: "v0.2.0 Context OS",
    overallState: "in-progress",
    currentFocus: "Build Context Packet v1",
    projectStatusSummary: "Threadsmith is adding token-aware context packets.",
    latestAcceptedSlice: {
      title: "v0.1.1 onboarding polish",
      recordedAt: "2026-05-09T12:31:40Z"
    },
    nextPlannedSlice: {
      title: "Repo Map v1",
      recordedAt: null
    },
    currentMilestoneId: "context-packet-v1",
    nextMilestoneId: "repo-map-v1",
    topRisks: ["Packet could become too large"],
    updatedAt: "2026-05-09T13:11:40Z"
  },
  projectRoadmap: {
    versionLabel: "Threadsmith v0.2.0",
    finalGoal: "Context packets for AI coding",
    milestones: [
      {
        id: "context-packet-v1",
        label: "Context Packet",
        title: "Context Packet v1",
        summary: "Generate a compact context packet.",
        state: "current"
      }
    ],
    updatedAt: "2026-05-09T13:11:40Z"
  },
  currentPhase: {
    phaseName: "Context Packet v1",
    phaseGoal: "Generate a durable context packet from committed truth.",
    deliverable: "Context Packet schema and builder",
    inScope: ["schema", "builder", "persistence"],
    outOfScope: ["repo map", "UI surface"],
    stopCondition: "Packet generation is covered by tests.",
    verificationForThisPhase: [
      "npm run test --workspace @threadsmith/runtime -- src/contextPacket.test.ts"
    ],
    activeOwners: ["planner", "executor"],
    blockedBy: []
  },
  acceptanceState: {
    currentClaim: "Context Packet v1 is being implemented.",
    doneWhenChecklist: [
      { id: "schema", label: "Schema is defined", status: "unknown" },
      { id: "builder", label: "Builder derives packet", status: "unknown" }
    ],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: ["Evidence summary is not connected yet"],
    finalState: "not-ready"
  },
  activeWork: {
    items: [],
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
};

describe("buildContextPacket", () => {
  it("derives a compact packet from project truth", () => {
    const packet = buildContextPacket(baseState, {
      generatedAt: "2026-05-09T13:15:00.000Z",
      recentDiff: {
        status: "dirty",
        summary: "Context packet files are being added.",
        changedFiles: ["packages/domain/src/contextPacket.ts"],
        command: "git status --short"
      },
      relevantFiles: [
        {
          path: "packages/domain/src/contextPacket.ts",
          reason: "Defines the v1 packet schema.",
          source: "phase"
        }
      ]
    });

    expect(packet.packetId).toBe("ctx-context-packet-v1-20260509T131500000Z");
    expect(packet.project.label).toBe("Threadsmith");
    expect(packet.goal.priorityOrder).toContain("Context packet");
    expect(packet.currentPhase.name).toBe("Context Packet v1");
    expect(packet.scope.constraints).toContain(
      "Do not replay long chat history into packets"
    );
    expect(packet.nextStep.recommendedRole).toBe("planner");
    expect(packet.nextStep.actionId).toBe("advance-phase");
    expect(packet.relevantFiles[0]?.path).toBe(
      "packages/domain/src/contextPacket.ts"
    );
    expect(packet.recentDiff.status).toBe("dirty");
    expect(packet.sourceRefs.map((ref) => ref.path)).toContain(
      ".threadsmith/current-phase.json"
    );
  });

  it("degrades honestly when evidence has not been summarized yet", () => {
    const packet = buildContextPacket(baseState, {
      generatedAt: "2026-05-09T13:16:00.000Z"
    });

    expect(packet.evidence.status).toBe("missing");
    expect(packet.evidence.summary).toContain("尚未接入 evidence summary");
    expect(packet.evidence.commands[0]?.status).toBe("pending");
    expect(packet.recentDiff.status).toBe("unknown");
  });

  it("routes blocked phases to hygiene instead of pretending execution is safe", () => {
    const packet = buildContextPacket({
      ...baseState,
      currentPhase: {
        ...baseState.currentPhase,
        blockedBy: ["truth 与 git diff 不一致"]
      },
      projectStatus: {
        ...baseState.projectStatus,
        overallState: "blocked"
      }
    }, {
      generatedAt: "2026-05-09T13:17:00.000Z"
    });

    expect(packet.nextStep.label).toBe("先解除当前 blocker");
    expect(packet.nextStep.recommendedRole).toBe("hygiene");
    expect(packet.nextStep.actionId).toBe("run-hygiene");
    expect(packet.risks).toContainEqual({
      label: "truth 与 git diff 不一致",
      source: "phase"
    });
  });
});
