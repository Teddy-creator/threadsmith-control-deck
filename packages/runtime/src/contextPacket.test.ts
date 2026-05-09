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
    expect(packet.budget.method).toBe("heuristic-json-char-estimate-v1");
    expect(packet.budget.budgetLevel).toBe("compact");
    expect(packet.budget.heaviestSections.map((section) => section.section))
      .toContain("scope");
    expect(packet.sourceRefs.map((ref) => ref.path)).toContain(
      ".threadsmith/current-phase.json"
    );
  });

  it("surfaces budget warnings when packet sections grow too large", () => {
    const packet = buildContextPacket({
      ...baseState,
      acceptanceState: {
        ...baseState.acceptanceState,
        knownGaps: Array.from({ length: 20 }, (_, index) =>
          `Known gap ${index}: this needs to be compressed before handoff.`
        )
      }
    }, {
      generatedAt: "2026-05-09T13:15:30.000Z",
      relevantFiles: Array.from({ length: 18 }, (_, index) => ({
        path: `packages/example-${index}.ts`,
        reason: "Changed file from current git status.",
        source: "repo-map" as const
      })),
      budget: {
        watchChars: 1_000,
        heavyChars: 2_000,
        overBudgetChars: 3_000,
        sectionItemWatch: 4,
        sectionItemHeavy: 10
      }
    });

    expect(packet.budget.budgetLevel).toBe("over-budget");
    expect(packet.budget.heaviestSections.map((section) => section.section))
      .toEqual(expect.arrayContaining(["acceptance", "relevantFiles"]));
    expect(packet.budget.compressionAdvice).toEqual(
      expect.arrayContaining([
        expect.stringContaining("acceptance:"),
        expect.stringContaining("relevantFiles:")
      ])
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

  it("points accepted slices at the next planned slice instead of repeating verification", () => {
    const packet = buildContextPacket({
      ...baseState,
      projectStatus: {
        ...baseState.projectStatus,
        overallState: "stable",
        nextPlannedSlice: {
          title: "Release hardening",
          recordedAt: null
        }
      },
      acceptanceState: {
        ...baseState.acceptanceState,
        implementationStatus: "ready-for-review",
        reviewStatus: "ready-for-verification",
        verificationStatus: "passed",
        closeoutStatus: "done",
        finalState: "accepted"
      }
    }, {
      generatedAt: "2026-05-09T13:16:10.000Z"
    });

    expect(packet.nextStep.label).toBe("进入 Release hardening");
    expect(packet.nextStep.recommendedRole).toBe("planner");
    expect(packet.nextStep.actionId).toBe("open-current-phase");
  });

  it("can enrich relevant files from a repo map without replacing explicit files", () => {
    const packet = buildContextPacket(baseState, {
      generatedAt: "2026-05-09T13:16:30.000Z",
      relevantFiles: [
        {
          path: "docs/plans/v0.2.0-context-operating-system.md",
          reason: "Defines the release plan.",
          source: "manual"
        }
      ],
      repoMap: {
        mapId: "repo-threadsmith-20260509T131630000Z",
        generatedAt: "2026-05-09T13:16:30.000Z",
        projectRootLabel: "Threadsmith",
        packageManager: "npm@11.11.0",
        rootPackage: {
          name: "threadsmith",
          path: "package.json",
          private: true,
          scripts: ["build", "test"],
          workspaces: ["packages/*"]
        },
        workspacePackages: [
          {
            name: "@threadsmith/runtime",
            path: "packages/runtime/package.json",
            private: true,
            scripts: ["test"],
            workspaces: []
          }
        ],
        topLevelDirectories: [
          { path: "packages", role: "package" }
        ],
        sourceDirectories: [
          { path: "packages/runtime/src", kind: "source" }
        ],
        entryPoints: [
          {
            path: "packages/runtime/package.json",
            kind: "workspace-manifest",
            reason: "Workspace manifest for @threadsmith/runtime."
          }
        ],
        git: {
          status: "dirty",
          changedFiles: ["packages/runtime/src/repoMap.ts"],
          command: "git status --short"
        },
        warnings: []
      }
    });

    expect(packet.relevantFiles.map((file) => file.path)).toEqual([
      "docs/plans/v0.2.0-context-operating-system.md",
      "packages/runtime/src/repoMap.ts",
      "packages/runtime/package.json",
      "package.json"
    ]);
    expect(packet.relevantFiles[1]?.source).toBe("repo-map");
  });

  it("can use an evidence summary instead of raw verification logs", () => {
    const packet = buildContextPacket(baseState, {
      generatedAt: "2026-05-09T13:16:45.000Z",
      evidenceSummary: {
        summaryId: "ev-verification-20260509T131645000Z",
        generatedAt: "2026-05-09T13:16:45.000Z",
        status: "failed",
        headline: "Verification evidence failed",
        detail: "0 passed, 1 failed, 0 pending, 0 skipped. 1 artifact reference(s) available.",
        commands: [
          {
            command: "npm run test:e2e",
            status: "failed",
            summary: "homepage.spec.ts failed.",
            exitCode: 1,
            durationMs: null,
            failureFocus: "Expected project summary text was not visible.",
            artifactRefs: ["test-results/homepage/error-context.md"]
          }
        ],
        artifactRefs: [
          {
            path: "playwright-report/index.html",
            kind: "report",
            description: "Playwright report."
          }
        ],
        failureFocus: "Expected project summary text was not visible.",
        source: "verification",
        warnings: []
      }
    });

    expect(packet.evidence.status).toBe("blocked");
    expect(packet.evidence.summary).toContain(
      "Expected project summary text was not visible."
    );
    expect(packet.evidence.commands[0]).toEqual({
      command: "npm run test:e2e",
      status: "failed",
      summary: "homepage.spec.ts failed."
    });
    expect(packet.evidence.artifactRefs).toEqual([
      "playwright-report/index.html",
      "test-results/homepage/error-context.md"
    ]);
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
