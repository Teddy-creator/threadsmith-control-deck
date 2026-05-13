import { describe, expect, it } from "vitest";
import type { SkillOrchestratorConfig } from "@threadsmith/domain";
import {
  buildMiniProtocolInstruction,
  getBuiltInMiniProtocol,
  listBuiltInMiniProtocols
} from "./miniProtocols.ts";
import { resolveSkillRoute } from "./skillOrchestrator.ts";

const baseConfig: SkillOrchestratorConfig = {
  version: 1,
  builtInProtocols: [
    "brief",
    "plan",
    "debug",
    "review",
    "verify",
    "closeout",
    "handoff",
    "recover",
    "research"
  ],
  adapters: [],
  routePreferences: [],
  defaultFallback: "plan",
  selfHosting: {
    activeController: "installed-skill",
    repositorySkillPath: "codex/skills/threadsmith/SKILL.md",
    installedSkillPath: "/home/user/.codex/skills/threadsmith/SKILL.md",
    allowGlobalSkillMutation: false
  }
};

function debugAdapterConfig(
  availability: SkillOrchestratorConfig["adapters"][number]["availability"]
): SkillOrchestratorConfig {
  return {
    ...baseConfig,
    adapters: [
      {
        id: "systematic-debugging",
        label: "Systematic Debugging",
        capabilities: ["debug"],
        entry: {
          kind: "codex-skill",
          ref: "$systematic-debugging"
        },
        fallbackProtocol: "debug",
        availability,
        safety: {
          canMutateCommittedTruth: false,
          canMutateGlobalSkill: false,
          forbiddenPaths: []
        }
      }
    ]
  };
}

describe("built-in mini protocol registry", () => {
  it("contains the complete v1 protocol inventory", () => {
    expect(listBuiltInMiniProtocols().map((protocol) => protocol.id)).toEqual([
      "brief",
      "plan",
      "debug",
      "review",
      "verify",
      "closeout",
      "handoff",
      "recover",
      "research"
    ]);
  });

  it("marks evidence-heavy protocols as requiring evidence", () => {
    expect(getBuiltInMiniProtocol("verify").evidenceRequired).toBe(true);
    expect(getBuiltInMiniProtocol("recover").evidenceRequired).toBe(true);
    expect(getBuiltInMiniProtocol("plan").evidenceRequired).toBe(false);
  });
});

describe("buildMiniProtocolInstruction", () => {
  it("builds a bounded instruction from a built-in-only route", () => {
    const route = resolveSkillRoute({
      role: "planner",
      requestedCapability: "plan",
      config: baseConfig
    });

    const instruction = buildMiniProtocolInstruction({ route });

    expect(instruction.protocol.id).toBe("plan");
    expect(instruction.role).toBe("planner");
    expect(instruction.route.source).toBe("built-in");
    expect(instruction.inputChecklist).toContain("currentPhase");
    expect(instruction.outputChecklist).toContain("implementationPlan");
    expect(instruction.stopCondition).toContain("ready-for-executor");
    expect(instruction.guardrails.join(" ")).toContain("phase-bound");
  });

  it("keeps fallback route metadata when an adapter is unavailable", () => {
    const route = resolveSkillRoute({
      role: "executor",
      requestedCapability: "debug",
      config: debugAdapterConfig("stale")
    });

    const instruction = buildMiniProtocolInstruction({ route });

    expect(instruction.protocol.id).toBe("debug");
    expect(instruction.route.source).toBe("fallback");
    expect(instruction.route.selectedAdapterId).toBe("systematic-debugging");
    expect(instruction.route.availability).toBe("stale");
    expect(instruction.stopCondition).toContain("recover-before-continue");
  });

  it("preserves safety warnings for unsafe adapters", () => {
    const route = resolveSkillRoute({
      role: "executor",
      requestedCapability: "debug",
      config: {
        ...debugAdapterConfig("available"),
        adapters: [
          {
            ...debugAdapterConfig("available").adapters[0]!,
            safety: {
              canMutateCommittedTruth: false,
              canMutateGlobalSkill: true,
              forbiddenPaths: ["/home/user/.codex/skills/threadsmith"]
            }
          }
        ]
      }
    });

    const instruction = buildMiniProtocolInstruction({ route });

    expect(instruction.route.source).toBe("fallback");
    expect(instruction.route.availability).toBe("unsafe");
    expect(instruction.route.safetyWarnings.join(" ")).toContain(
      "global skill mutation"
    );
    expect(instruction.protocol.guardrails.join(" ")).toContain(
      "reproducing or localizing"
    );
  });

  it("keeps bounded protocol IO when an external adapter route is available", () => {
    const route = resolveSkillRoute({
      role: "executor",
      requestedCapability: "debug",
      config: debugAdapterConfig("available")
    });

    const instruction = buildMiniProtocolInstruction({ route });

    expect(instruction.route.source).toBe("external-adapter");
    expect(instruction.route.selectedAdapterId).toBe("systematic-debugging");
    expect(instruction.protocol.id).toBe("debug");
    expect(instruction.inputChecklist).toEqual([
      "failureSymptom",
      "recentDiff",
      "evidenceSummary",
      "repoMap"
    ]);
    expect(instruction.outputChecklist).toEqual([
      "rootCauseHypothesis",
      "truthWritebackProposal",
      "nextRoleHint"
    ]);
    expect(instruction.guardrails).toContain(
      "Preserve contradictory evidence instead of smoothing it over."
    );
  });
});
