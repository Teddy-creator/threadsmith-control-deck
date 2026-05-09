import { describe, expect, it } from "vitest";
import type { ProjectState } from "@threadsmith/domain";
import { buildContextPacket } from "./contextPacket.ts";
import {
  deriveRoleContextPacket,
  deriveRoleContextPackets
} from "./roleContextPacket.ts";

const state: ProjectState = {
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
    currentFocus: "Build role-specific packets",
    projectStatusSummary: "Threadsmith is deriving focused role packets.",
    latestAcceptedSlice: {
      title: "Context Budget Ledger v1",
      recordedAt: "2026-05-09T14:56:44Z"
    },
    nextPlannedSlice: {
      title: "Threadsmith.skill v2",
      recordedAt: null
    },
    currentMilestoneId: "role-specific-packets-v1",
    nextMilestoneId: "threadsmith-skill-v2",
    topRisks: ["Role packets could leak unrelated context"],
    updatedAt: "2026-05-09T15:14:07Z"
  },
  projectRoadmap: {
    versionLabel: "Threadsmith v0.2.0",
    finalGoal: "Context packets for AI coding",
    milestones: [
      {
        id: "role-specific-packets-v1",
        label: "Role Packets",
        title: "Role-specific Packets v1",
        summary: "Derive focused packets from the main packet.",
        state: "current"
      }
    ],
    updatedAt: "2026-05-09T15:14:07Z"
  },
  currentPhase: {
    phaseName: "Role-specific Packets v1",
    phaseGoal: "Derive smaller packets for planner, executor, reviewer, verifier, closeout, and hygiene.",
    deliverable: "Role packet schema and runtime derivation",
    inScope: ["schema", "runtime derivation", "fs persistence"],
    outOfScope: ["UI", "Threadsmith.skill v2", "multi-provider"],
    stopCondition: "All role packets are focused and persisted.",
    verificationForThisPhase: [
      "npm run test --workspace @threadsmith/runtime -- src/roleContextPacket.test.ts"
    ],
    activeOwners: ["planner", "executor", "reviewer", "verifier", "closeout", "hygiene"],
    blockedBy: []
  },
  acceptanceState: {
    currentClaim: "Role-specific Packets v1 is being implemented.",
    doneWhenChecklist: [
      { id: "schema", label: "Schema is defined", status: "unknown" },
      { id: "builder", label: "Role packets derive from main packet", status: "unknown" }
    ],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: ["Threadsmith.skill v2 is not updated yet"],
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

const mainPacket = buildContextPacket(state, {
  generatedAt: "2026-05-09T15:15:00.000Z",
  recentDiff: {
    status: "dirty",
    summary: "Role packet files are being added.",
    changedFiles: ["packages/runtime/src/roleContextPacket.ts"],
    command: "git status --short"
  },
  relevantFiles: [
    {
      path: "packages/runtime/src/roleContextPacket.ts",
      reason: "Derives role packets.",
      source: "phase"
    }
  ],
  evidence: {
    status: "missing",
    summary: "Verification has not run yet.",
    commands: [
      {
        command: "npm run test --workspace @threadsmith/runtime -- src/roleContextPacket.test.ts",
        status: "pending",
        summary: "Not run yet."
      }
    ],
    artifactRefs: []
  }
});

describe("deriveRoleContextPackets", () => {
  it("derives all six role packets from the main packet", () => {
    const packets = deriveRoleContextPackets(mainPacket);

    expect(packets.map((packet) => packet.role)).toEqual([
      "planner",
      "executor",
      "reviewer",
      "verifier",
      "closeout",
      "hygiene"
    ]);
    expect(packets.every((packet) => packet.parentPacketId === mainPacket.packetId))
      .toBe(true);
    expect(new Set(packets.map((packet) => packet.packetId)).size).toBe(6);
  });

  it("keeps executor packet focused on implementation context", () => {
    const packet = deriveRoleContextPacket(mainPacket, "executor");

    expect(packet.payload.scope?.inScope).toContain("runtime derivation");
    expect(packet.payload.relevantFiles?.[0]?.path).toBe(
      "packages/runtime/src/roleContextPacket.ts"
    );
    expect(packet.payload.acceptance).toBeUndefined();
    expect(packet.includedSections).toContain("recentDiff");
    expect(packet.omittedSections).toContain("acceptance");
  });

  it("keeps verifier packet focused on acceptance and evidence", () => {
    const packet = deriveRoleContextPacket(mainPacket, "verifier");

    expect(packet.payload.acceptance?.claim).toBe(
      "Role-specific Packets v1 is being implemented."
    );
    expect(packet.payload.evidence?.commands[0]?.status).toBe("pending");
    expect(packet.payload.relevantFiles).toBeUndefined();
    expect(packet.includedSections).toContain("evidence");
    expect(packet.omittedSections).toContain("recentDiff");
  });

  it("keeps hygiene packet focused on freshness and context risks", () => {
    const packet = deriveRoleContextPacket(mainPacket, "hygiene");

    expect(packet.payload.recentDiff?.status).toBe("dirty");
    expect(packet.payload.budget?.method).toBe("heuristic-json-char-estimate-v1");
    expect(packet.payload.sourceRefs?.map((ref) => ref.path)).toContain(
      ".threadsmith/current-phase.json"
    );
    expect(packet.payload.relevantFiles).toBeUndefined();
  });

  it("is smaller than the parent packet for each role", () => {
    const mainSize = JSON.stringify(mainPacket).length;

    for (const packet of deriveRoleContextPackets(mainPacket)) {
      expect(JSON.stringify(packet).length).toBeLessThan(mainSize);
    }
  });
});
