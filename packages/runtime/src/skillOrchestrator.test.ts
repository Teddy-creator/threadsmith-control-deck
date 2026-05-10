import { describe, expect, it } from "vitest";
import type { SkillOrchestratorConfig } from "@threadsmith/domain";
import {
  inspectSelfHostingSafety,
  resolveSkillRoute
} from "./skillOrchestrator.ts";

const baseConfig: SkillOrchestratorConfig = {
  version: 1,
  builtInProtocols: ["brief", "plan", "debug", "verify", "closeout"],
  adapters: [],
  routePreferences: [],
  defaultFallback: "plan",
  selfHosting: {
    activeController: "installed-skill",
    repositorySkillPath: "codex/skills/threadsmith/SKILL.md",
    installedSkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md",
    allowGlobalSkillMutation: false
  }
};

function adapterConfig(
  overrides: Partial<SkillOrchestratorConfig["adapters"][number]> = {}
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
        availability: "available",
        safety: {
          canMutateCommittedTruth: false,
          canMutateGlobalSkill: false,
          forbiddenPaths: []
        },
        ...overrides
      }
    ]
  };
}

describe("resolveSkillRoute", () => {
  it("selects a built-in mini protocol when no external adapter exists", () => {
    const decision = resolveSkillRoute({
      role: "planner",
      requestedCapability: "plan",
      config: baseConfig
    });

    expect(decision.source).toBe("built-in");
    expect(decision.selectedProtocol).toBe("plan");
    expect(decision.selectedAdapterId).toBeNull();
    expect(decision.availability).toBe("missing");
  });

  it("selects an available external adapter when it satisfies the capability", () => {
    const decision = resolveSkillRoute({
      role: "hygiene",
      requestedCapability: "debug",
      config: adapterConfig()
    });

    expect(decision.source).toBe("external-adapter");
    expect(decision.selectedProtocol).toBe("debug");
    expect(decision.selectedAdapterId).toBe("systematic-debugging");
    expect(decision.availability).toBe("available");
  });

  it("falls back when a preferred adapter is missing", () => {
    const decision = resolveSkillRoute({
      role: "hygiene",
      requestedCapability: "debug",
      preferredAdapterId: "missing-debug-skill",
      config: adapterConfig()
    });

    expect(decision.source).toBe("built-in");
    expect(decision.selectedProtocol).toBe("debug");
    expect(decision.selectedAdapterId).toBeNull();
    expect(decision.availability).toBe("missing");
    expect(decision.reason).toContain("missing-debug-skill");
  });

  it("uses project-level route preferences when no explicit preferred adapter is passed", () => {
    const decision = resolveSkillRoute({
      role: "hygiene",
      requestedCapability: "debug",
      config: {
        ...baseConfig,
        adapters: [
          adapterConfig().adapters[0],
          {
            id: "bug-driver",
            label: "Bug Driver",
            capabilities: ["debug"],
            entry: {
              kind: "codex-skill",
              ref: "$bug-driver"
            },
            fallbackProtocol: "debug",
            availability: "available",
            safety: {
              canMutateCommittedTruth: false,
              canMutateGlobalSkill: false,
              forbiddenPaths: []
            }
          }
        ],
        routePreferences: [
          {
            role: null,
            capability: "debug",
            adapterId: "bug-driver",
            reason: "Project prefers bug-driver for broad bug work."
          }
        ]
      }
    });

    expect(decision.source).toBe("external-adapter");
    expect(decision.selectedAdapterId).toBe("bug-driver");
  });

  it("prefers role-specific route preferences over capability defaults", () => {
    const decision = resolveSkillRoute({
      role: "verifier",
      requestedCapability: "verify",
      config: {
        ...baseConfig,
        adapters: [
          {
            id: "verification-before-completion",
            label: "Verification Before Completion",
            capabilities: ["verify"],
            entry: {
              kind: "codex-skill",
              ref: "$verification-before-completion"
            },
            fallbackProtocol: "verify",
            availability: "available",
            safety: {
              canMutateCommittedTruth: false,
              canMutateGlobalSkill: false,
              forbiddenPaths: []
            }
          },
          {
            id: "independent-verification",
            label: "Independent Verification",
            capabilities: ["verify"],
            entry: {
              kind: "codex-skill",
              ref: "$independent-verification"
            },
            fallbackProtocol: "verify",
            availability: "available",
            safety: {
              canMutateCommittedTruth: false,
              canMutateGlobalSkill: false,
              forbiddenPaths: []
            }
          }
        ],
        routePreferences: [
          {
            role: null,
            capability: "verify",
            adapterId: "verification-before-completion"
          },
          {
            role: "verifier",
            capability: "verify",
            adapterId: "independent-verification"
          }
        ]
      }
    });

    expect(decision.selectedAdapterId).toBe("independent-verification");
  });

  it.each(["stale", "disabled"] as const)(
    "falls back when an adapter is %s",
    (availability) => {
      const decision = resolveSkillRoute({
        role: "hygiene",
        requestedCapability: "debug",
        config: adapterConfig({ availability })
      });

      expect(decision.source).toBe("fallback");
      expect(decision.selectedProtocol).toBe("debug");
      expect(decision.selectedAdapterId).toBe("systematic-debugging");
      expect(decision.availability).toBe(availability);
    }
  );

  it("falls back and reports a safety warning when an adapter can mutate global skills", () => {
    const decision = resolveSkillRoute({
      role: "hygiene",
      requestedCapability: "debug",
      config: adapterConfig({
        safety: {
          canMutateCommittedTruth: false,
          canMutateGlobalSkill: true,
          forbiddenPaths: ["/Users/cloud/.codex/skills/threadsmith"]
        }
      })
    });

    expect(decision.source).toBe("fallback");
    expect(decision.availability).toBe("unsafe");
    expect(decision.selectedProtocol).toBe("debug");
    expect(decision.safetyWarnings[0]).toContain("global skill mutation");
    expect(decision.safetyWarnings[1]).toContain("/Users/cloud/.codex/skills/threadsmith");
  });

  it("falls back when self-hosting config points repo source at the installed global skill", () => {
    const decision = resolveSkillRoute({
      role: "executor",
      requestedCapability: "debug",
      config: adapterConfig({
        safety: {
          canMutateCommittedTruth: false,
          canMutateGlobalSkill: false,
          forbiddenPaths: []
        }
      }),
      preferredAdapterId: "systematic-debugging"
    });

    expect(decision.source).toBe("external-adapter");

    const unsafeDecision = resolveSkillRoute({
      role: "executor",
      requestedCapability: "debug",
      config: {
        ...adapterConfig(),
        selfHosting: {
          activeController: "repo-source",
          repositorySkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md",
          installedSkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md",
          allowGlobalSkillMutation: false
        }
      }
    });

    expect(unsafeDecision.source).toBe("fallback");
    expect(unsafeDecision.availability).toBe("unsafe");
    expect(unsafeDecision.safetyWarnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("repositorySkillPath"),
        expect.stringContaining("Repo-source controller")
      ])
    );
  });

  it("uses the default fallback when the requested capability is not a built-in protocol", () => {
    const decision = resolveSkillRoute({
      role: "executor",
      requestedCapability: "implement",
      config: baseConfig
    });

    expect(decision.source).toBe("fallback");
    expect(decision.selectedProtocol).toBe("plan");
    expect(decision.reason).toContain("implement");
  });
});

describe("inspectSelfHostingSafety", () => {
  it("marks external adapters usable when installed controller and repo source are separated", () => {
    const report = inspectSelfHostingSafety(baseConfig);

    expect(report.canUseExternalAdapters).toBe(true);
    expect(report.protectedPaths).toEqual([
      "/Users/cloud/.codex/skills/threadsmith/SKILL.md"
    ]);
    expect(report.warnings).toEqual([]);
  });

  it("blocks external adapters when self-hosting boundaries are unsafe", () => {
    const report = inspectSelfHostingSafety({
      ...baseConfig,
      selfHosting: {
        activeController: "installed-skill",
        repositorySkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md",
        installedSkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md",
        allowGlobalSkillMutation: true
      }
    });

    expect(report.canUseExternalAdapters).toBe(false);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("global skill mutation"),
        expect.stringContaining("repositorySkillPath")
      ])
    );
  });
});
