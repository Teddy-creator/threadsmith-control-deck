import { describe, expect, it } from "vitest";
import type { AgentRunRecord, ProjectState } from "@threadsmith/domain";
import { buildContextPacket } from "./contextPacket.ts";
import { deriveContextRecovery } from "./contextRecovery.ts";
import { deriveRoleContextPacket } from "./roleContextPacket.ts";
import {
  createMissingPhasePauseSummary,
  createMissingPhaseRunSummary
} from "./phaseRun.ts";
import { deriveTruthConfidence } from "./truthConfidence.ts";

const state: ProjectState = {
  projectBrief: {
    projectGoal: "Turn Threadsmith into a context operating layer",
    currentVersionScope: "v0.3.0 usability hardening",
    nonGoals: ["multi-provider automatic execution"],
    keyConstraints: ["Committed truth wins over chat memory"],
    successFrame: "Agents continue from compact context packets.",
    priorityOrder: ["Context packets", "Recovery hygiene"],
    openStrategicQuestions: []
  },
  projectStatus: {
    projectLabel: "Threadsmith",
    currentTrack: "v0.3.0 usability hardening",
    overallState: "in-progress",
    currentFocus: "Build confidence signal",
    projectStatusSummary: "Threadsmith is making stale context recoverable.",
    latestAcceptedSlice: null,
    nextPlannedSlice: {
      title: "Truth confidence",
      recordedAt: null
    },
    topRisks: ["Packets can go stale after truth changes"],
    updatedAt: "2026-05-10T00:00:00Z"
  },
  projectRoadmap: {
    versionLabel: "Threadsmith v0.3.0",
    finalGoal: "Context OS for AI coding",
    milestones: [
      {
        id: "truth-confidence",
        label: "Truth confidence",
        title: "Truth confidence",
        summary: "Make stale context visible and recoverable.",
        state: "current"
      }
    ],
    updatedAt: "2026-05-10T00:00:00Z"
  },
  currentPhase: {
    phaseName: "Truth confidence",
    phaseGoal: "Summarize truth confidence.",
    deliverable: "Runtime confidence signal",
    inScope: ["runtime signal", "tests"],
    outOfScope: ["UI redesign", "multi-provider"],
    stopCondition: "Runtime can recommend the safest recovery action.",
    verificationForThisPhase: ["npm run test"],
    activeOwners: ["executor"],
    blockedBy: []
  },
  acceptanceState: {
    currentClaim: "Truth confidence is being implemented.",
    doneWhenChecklist: [
      { id: "signal", label: "Confidence signal exists", status: "unknown" }
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

const failedRun: AgentRunRecord = {
  runId: "run-failed",
  projectRoot: "/tmp/threadsmith",
  role: "executor",
  provider: "codex",
  status: "failed",
  createdAt: "2026-05-10T01:00:00.000Z",
  startedAt: "2026-05-10T01:00:00.000Z",
  finishedAt: "2026-05-10T01:02:00.000Z",
  packetPath: ".threadsmith/runs/run-failed/packet.json",
  promptPath: ".threadsmith/runs/run-failed/prompt.md",
  resultPath: ".threadsmith/runs/run-failed/result.json",
  summaryPath: ".threadsmith/runs/run-failed/result.md",
  stdoutPath: ".threadsmith/runs/run-failed/stdout.log",
  stderrPath: ".threadsmith/runs/run-failed/stderr.log",
  outcome: "failed",
  statusDetail: "测试失败，当前 slice 还不能交给 review。"
};

function packetFor(input: ProjectState = state) {
  return buildContextPacket(input, {
    generatedAt: "2026-05-10T00:00:00.000Z"
  });
}

function confidenceFor(
  input: ProjectState,
  options: Parameters<typeof deriveContextRecovery>[1] = {}
) {
  const recovery = deriveContextRecovery(input, options);
  return deriveTruthConfidence(recovery, {
    currentPacket: options.currentPacket,
    latestRun: options.latestRun,
    latestPhaseRun: options.latestPhaseRun
  });
}

describe("deriveTruthConfidence", () => {
  it("marks aligned truth and packets as trusted", () => {
    const packet = packetFor();
    const confidence = confidenceFor(state, {
      currentPacket: packet,
      rolePackets: [deriveRoleContextPacket(packet, "executor")],
      selectedRole: "executor",
      contextArtifactsLoaded: true
    });

    expect(confidence.level).toBe("trusted");
    expect(confidence.safeAction).toBe("continue");
    expect(confidence.primaryReason.id).toBe("truth-aligned");
    expect(confidence.canContinue).toBe(true);
  });

  it("marks stale current packets as recover with sync-context", () => {
    const stalePacket = packetFor({
      ...state,
      currentPhase: {
        ...state.currentPhase,
        phaseName: "Previous phase"
      }
    });
    const confidence = confidenceFor(state, {
      currentPacket: stalePacket,
      rolePackets: [deriveRoleContextPacket(stalePacket, "executor")],
      selectedRole: "executor",
      contextArtifactsLoaded: true
    });

    expect(confidence.level).toBe("recover");
    expect(confidence.safeAction).toBe("sync-context");
    expect(confidence.primaryReason.id).toBe("context-packet-stale");
    expect(confidence.primaryReason.surface).toBe("current-packet");
  });

  it("marks missing role packets as watch with sync-context", () => {
    const packet = packetFor();
    const confidence = confidenceFor(state, {
      currentPacket: packet,
      selectedRole: "executor",
      contextArtifactsLoaded: true
    });

    expect(confidence.level).toBe("watch");
    expect(confidence.safeAction).toBe("sync-context");
    expect(confidence.primaryReason.id).toBe("role-packet-missing");
    expect(confidence.primaryReason.surface).toBe("role-packet");
  });

  it("marks failed latest runs as recover and keeps the failure detail", () => {
    const packet = packetFor();
    const confidence = confidenceFor(state, {
      currentPacket: packet,
      rolePackets: [deriveRoleContextPacket(packet, "executor")],
      selectedRole: "executor",
      contextArtifactsLoaded: true,
      latestRun: failedRun
    });

    expect(confidence.level).toBe("recover");
    expect(confidence.safeAction).toBe("repair-run");
    expect(confidence.primaryReason.id).toBe("latest-run-failed");
    expect(confidence.primaryReason.detail).toContain("测试失败");
  });

  it("marks running phase-runs as watch and recommends waiting", () => {
    const packet = packetFor();
    const runningPhaseRun = {
      ...createMissingPhaseRunSummary(),
      status: "running" as const,
      operatorDetail: "当前 phase run 正在执行 executor。"
    };
    const confidence = confidenceFor(state, {
      currentPacket: packet,
      rolePackets: [deriveRoleContextPacket(packet, "executor")],
      selectedRole: "executor",
      contextArtifactsLoaded: true,
      latestPhaseRun: runningPhaseRun
    });

    expect(confidence.level).toBe("watch");
    expect(confidence.safeAction).toBe("wait-for-run");
    expect(confidence.primaryReason.id).toBe("run-in-progress");
    expect(confidence.primaryReason.surface).toBe("phase-run");
  });

  it("marks paused phase-runs as recover and recommends resume", () => {
    const packet = packetFor();
    const confidence = confidenceFor(state, {
      currentPacket: packet,
      rolePackets: [deriveRoleContextPacket(packet, "executor")],
      selectedRole: "executor",
      contextArtifactsLoaded: true,
      latestPhaseRun: {
        ...createMissingPhaseRunSummary(),
        status: "paused",
        pauseReason: "验证失败，需要先修一轮。"
      },
      latestPhasePause: {
        ...createMissingPhasePauseSummary(),
        type: "risk",
        summary: "验证失败，需要先修一轮。"
      }
    });

    expect(confidence.level).toBe("recover");
    expect(confidence.safeAction).toBe("resume-phase-run");
    expect(confidence.primaryReason.id).toBe("phase-run-paused");
    expect(confidence.primaryReason.surface).toBe("phase-run");
  });

  it("marks accepted truth as watch and recommends handoff", () => {
    const acceptedState: ProjectState = {
      ...state,
      acceptanceState: {
        ...state.acceptanceState,
        doneWhenChecklist: [
          { id: "signal", label: "Confidence signal exists", status: "pass" }
        ],
        implementationStatus: "ready-for-review",
        reviewStatus: "ready-for-verification",
        verificationStatus: "passed",
        closeoutStatus: "done",
        finalState: "accepted"
      }
    };
    const packet = packetFor(acceptedState);
    const confidence = confidenceFor(acceptedState, {
      currentPacket: packet,
      rolePackets: [deriveRoleContextPacket(packet, "hygiene")],
      contextArtifactsLoaded: true
    });

    expect(confidence.level).toBe("watch");
    expect(confidence.safeAction).toBe("create-handoff");
    expect(confidence.primaryReason.id).toBe("accepted-needs-continuation");
    expect(confidence.primaryReason.surface).toBe("accepted-continuation");
  });
});
