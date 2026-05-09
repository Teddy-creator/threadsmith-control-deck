import { describe, expect, it } from "vitest";
import type { ContextPacket, ProjectState, RoleContextPacket } from "@threadsmith/domain";
import { buildContextPacket } from "./contextPacket.ts";
import { deriveContextRecovery } from "./contextRecovery.ts";
import { deriveRoleContextPacket } from "./roleContextPacket.ts";
import { createMissingPhaseRunSummary } from "./phaseRun.ts";

const state: ProjectState = {
  projectBrief: {
    projectGoal: "Turn Threadsmith into a context operating layer",
    currentVersionScope: "v0.2.0 Context OS",
    nonGoals: ["multi-provider automatic execution"],
    keyConstraints: ["Committed truth wins over chat memory"],
    successFrame: "Agents continue from compact context packets.",
    priorityOrder: ["Context packets", "Recovery hygiene"],
    openStrategicQuestions: []
  },
  projectStatus: {
    projectLabel: "Threadsmith",
    currentTrack: "v0.2.0 Context OS",
    overallState: "in-progress",
    currentFocus: "Build recovery triggers",
    projectStatusSummary: "Threadsmith is making stale context recoverable.",
    latestAcceptedSlice: {
      title: "Threadsmith.skill v2",
      recordedAt: "2026-05-09T15:43:45Z"
    },
    nextPlannedSlice: {
      title: "Truth sync / recovery hygiene triggers",
      recordedAt: null
    },
    topRisks: ["Packets can go stale after truth changes"],
    updatedAt: "2026-05-10T00:00:00Z"
  },
  projectRoadmap: {
    versionLabel: "Threadsmith v0.2.0",
    finalGoal: "Context OS for AI coding",
    milestones: [
      {
        id: "recovery",
        label: "Recovery",
        title: "Truth sync / recovery hygiene triggers",
        summary: "Make stale context visible and recoverable.",
        state: "current"
      }
    ],
    updatedAt: "2026-05-10T00:00:00Z"
  },
  currentPhase: {
    phaseName: "Truth sync / recovery hygiene triggers",
    phaseGoal: "Detect stale or missing context artifacts before continuing.",
    deliverable: "Runtime recovery signal",
    inScope: ["runtime signal", "tests"],
    outOfScope: ["UI redesign", "multi-provider"],
    stopCondition: "Runtime can recommend sync, hygiene, repair, or continue.",
    verificationForThisPhase: [
      "npm run test --workspace @threadsmith/runtime -- src/contextRecovery.test.ts"
    ],
    activeOwners: ["planner", "hygiene"],
    blockedBy: []
  },
  acceptanceState: {
    currentClaim: "Recovery triggers are being implemented.",
    doneWhenChecklist: [
      { id: "signal", label: "Recovery signal exists", status: "unknown" }
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

function packetFor(input: ProjectState = state) {
  return buildContextPacket(input, {
    generatedAt: "2026-05-10T00:00:00.000Z"
  });
}

function rolePacketFor(
  packet: ContextPacket,
  role: RoleContextPacket["role"] = "hygiene"
) {
  return deriveRoleContextPacket(packet, role);
}

describe("deriveContextRecovery", () => {
  it("requires sync when the current context packet is missing", () => {
    const recovery = deriveContextRecovery(state, {
      contextArtifactsLoaded: true
    });

    expect(recovery.status).toBe("recover");
    expect(recovery.action).toBe("sync-context");
    expect(recovery.currentPacketStatus).toBe("missing");
    expect(recovery.reasons).toContain("context-packet-missing");
  });

  it("requires sync when the current context packet belongs to an older phase", () => {
    const stalePacket = packetFor({
      ...state,
      currentPhase: {
        ...state.currentPhase,
        phaseName: "Threadsmith.skill v2"
      }
    });

    const recovery = deriveContextRecovery(state, {
      currentPacket: stalePacket,
      rolePackets: [rolePacketFor(stalePacket)],
      contextArtifactsLoaded: true
    });

    expect(recovery.status).toBe("recover");
    expect(recovery.action).toBe("sync-context");
    expect(recovery.currentPacketStatus).toBe("stale");
    expect(recovery.reasons).toContain("context-packet-stale");
  });

  it("reports invalid context artifacts as stale sync work", () => {
    const recovery = deriveContextRecovery(state, {
      contextArtifactsLoaded: true,
      contextArtifactProblem: "current-packet.json is missing required budget field."
    });

    expect(recovery.status).toBe("recover");
    expect(recovery.action).toBe("sync-context");
    expect(recovery.currentPacketStatus).toBe("stale");
    expect(recovery.reasons).toContain("context-artifact-invalid");
  });

  it("warns when the selected role packet is missing but the main packet is fresh", () => {
    const recovery = deriveContextRecovery(state, {
      currentPacket: packetFor(),
      selectedRole: "hygiene",
      contextArtifactsLoaded: true
    });

    expect(recovery.status).toBe("watch");
    expect(recovery.action).toBe("sync-context");
    expect(recovery.currentPacketStatus).toBe("fresh");
    expect(recovery.rolePacketStatus).toBe("missing");
    expect(recovery.reasons).toContain("role-packet-missing");
  });

  it("requires hygiene when a role packet points to an older parent packet", () => {
    const freshPacket = packetFor();
    const oldPacket = packetFor({
      ...state,
      projectStatus: {
        ...state.projectStatus,
        currentFocus: "Old focus"
      }
    });
    const oldRolePacket = deriveRoleContextPacket({
      ...oldPacket,
      packetId: "ctx-old-recovery-20260509T000000000Z"
    }, "hygiene");

    const recovery = deriveContextRecovery(state, {
      currentPacket: freshPacket,
      rolePackets: [oldRolePacket],
      selectedRole: "hygiene",
      contextArtifactsLoaded: true
    });

    expect(recovery.status).toBe("recover");
    expect(recovery.action).toBe("run-hygiene");
    expect(recovery.rolePacketStatus).toBe("stale");
    expect(recovery.reasons).toContain("role-packet-stale");
  });

  it("allows continuing when current and role packets match committed truth", () => {
    const packet = packetFor();
    const recovery = deriveContextRecovery(state, {
      currentPacket: packet,
      rolePackets: [rolePacketFor(packet)],
      selectedRole: "hygiene",
      contextArtifactsLoaded: true
    });

    expect(recovery.status).toBe("fresh");
    expect(recovery.action).toBe("continue");
    expect(recovery.currentPacketStatus).toBe("fresh");
    expect(recovery.rolePacketStatus).toBe("fresh");
  });

  it("prioritizes paused phase recovery over packet freshness", () => {
    const packet = packetFor();
    const recovery = deriveContextRecovery(state, {
      currentPacket: packet,
      rolePackets: [rolePacketFor(packet)],
      contextArtifactsLoaded: true,
      latestPhaseRun: {
        ...createMissingPhaseRunSummary(),
        status: "paused",
        currentRole: "verifier",
        currentRoleLabel: "验证",
        pauseReason: "Verification command needs credentials.",
        operatorDetail: "需要补齐凭据后 resume。",
        resumeHint: "Set TEST_TOKEN and resume."
      },
      latestPhasePause: {
        type: "missing-info",
        summary: "缺少 TEST_TOKEN。",
        detail: "补齐 TEST_TOKEN 后继续。",
        resumeHint: "Set TEST_TOKEN and resume."
      }
    });

    expect(recovery.status).toBe("recover");
    expect(recovery.action).toBe("resume-phase-run");
    expect(recovery.reasons).toContain("phase-run-paused");
  });

  it("treats accepted truth as needing a continuation even when packets are fresh", () => {
    const acceptedState: ProjectState = {
      ...state,
      acceptanceState: {
        ...state.acceptanceState,
        doneWhenChecklist: [{ id: "signal", label: "Recovery signal exists", status: "pass" }],
        implementationStatus: "ready-for-review",
        reviewStatus: "ready-for-verification",
        verificationStatus: "passed",
        closeoutStatus: "done",
        finalState: "accepted"
      }
    };
    const packet = packetFor(acceptedState);
    const recovery = deriveContextRecovery(acceptedState, {
      currentPacket: packet,
      rolePackets: [rolePacketFor(packet)],
      contextArtifactsLoaded: true
    });

    expect(recovery.status).toBe("watch");
    expect(recovery.action).toBe("create-handoff");
    expect(recovery.reasons).toContain("accepted-needs-continuation");
  });
});
