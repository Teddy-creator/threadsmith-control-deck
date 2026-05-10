import { describe, expect, it } from "vitest";
import type {
  DiscoveredSkill,
  SkillDiscoverySummary,
  SkillOrchestratorConfig
} from "@threadsmith/domain";
import {
  buildSkillOrchestratorConfigFromDiscovery,
  inferSkillCapabilities,
  skillToAdapterDeclaration,
  summarizeSkillDiscovery
} from "./skillDiscovery.ts";
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
    installedSkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md",
    allowGlobalSkillMutation: false
  }
};

function discoveredSkill(overrides: Partial<DiscoveredSkill>): DiscoveredSkill {
  return {
    id: overrides.id ?? overrides.name ?? "systematic-debugging",
    name: overrides.name ?? "systematic-debugging",
    description:
      overrides.description ?? "Use when encountering bugs and unexpected behavior.",
    skillPath:
      overrides.skillPath ??
      "/Users/cloud/.codex/skills/systematic-debugging/SKILL.md",
    source: overrides.source ?? "global-codex",
    sourceRoot: overrides.sourceRoot ?? "/Users/cloud/.codex/skills",
    relativePath: overrides.relativePath ?? "systematic-debugging/SKILL.md",
    frontmatter: overrides.frontmatter ?? {
      name: overrides.name ?? "systematic-debugging",
      description:
        overrides.description ?? "Use when encountering bugs and unexpected behavior."
    },
    bodyPreview: overrides.bodyPreview ?? "# Systematic Debugging",
    capabilities: overrides.capabilities ?? [],
    health: overrides.health ?? "available",
    warnings: overrides.warnings ?? []
  };
}

function discovery(skills: DiscoveredSkill[]): SkillDiscoverySummary {
  return summarizeSkillDiscovery({
    generatedAt: "2026-05-10T11:00:00.000Z",
    roots: [
      {
        root: "/Users/cloud/.codex/skills",
        source: "global-codex"
      }
    ],
    skills,
    warnings: []
  });
}

describe("inferSkillCapabilities", () => {
  it("uses known aliases for local Threadsmith workflow skills", () => {
    expect(
      inferSkillCapabilities(discoveredSkill({ name: "task-brief-drafter" }))
    ).toEqual(["brief"]);
    expect(
      inferSkillCapabilities(discoveredSkill({ name: "writing-plans" }))
    ).toEqual(["plan"]);
    expect(
      inferSkillCapabilities(discoveredSkill({ name: "task-closeout" }))
    ).toEqual(["closeout"]);
  });

  it("falls back to keyword inference for unknown skills", () => {
    expect(
      inferSkillCapabilities(discoveredSkill({
        name: "custom-reviewer",
        description: "Review implementation changes and critique regressions.",
        bodyPreview: ""
      }))
    ).toContain("review");
  });
});

describe("skillToAdapterDeclaration", () => {
  it("converts discovered Codex skills into adapter declarations", () => {
    const adapter = skillToAdapterDeclaration(discoveredSkill({
      name: "verification-before-completion"
    }));

    expect(adapter).toMatchObject({
      id: "verification-before-completion",
      capabilities: ["verify"],
      entry: {
        kind: "codex-skill",
        ref: "$verification-before-completion"
      },
      fallbackProtocol: "verify",
      availability: "available"
    });
  });

  it("returns null when no capability can be inferred", () => {
    expect(skillToAdapterDeclaration(discoveredSkill({
      name: "mystery-tool",
      description: null,
      bodyPreview: ""
    }))).toBeNull();
  });
});

describe("buildSkillOrchestratorConfigFromDiscovery", () => {
  it("routes discovered skills through existing route decisions", () => {
    const config = buildSkillOrchestratorConfigFromDiscovery({
      baseConfig,
      discovery: discovery([
        discoveredSkill({ name: "systematic-debugging" })
      ])
    });
    const decision = resolveSkillRoute({
      role: "hygiene",
      requestedCapability: "debug",
      config
    });

    expect(decision.source).toBe("external-adapter");
    expect(decision.selectedAdapterId).toBe("systematic-debugging");
  });

  it("prefers purpose-built skills over broader workflow skills for the same capability", () => {
    const config = buildSkillOrchestratorConfigFromDiscovery({
      baseConfig,
      discovery: discovery([
        discoveredSkill({
          name: "brainstorming",
          capabilities: ["brief"]
        }),
        discoveredSkill({
          name: "task-brief-drafter",
          capabilities: ["brief"]
        })
      ])
    });
    const decision = resolveSkillRoute({
      role: "planner",
      requestedCapability: "brief",
      config
    });

    expect(decision.selectedAdapterId).toBe("task-brief-drafter");
  });

  it("falls back when discovery has no matching skill", () => {
    const config = buildSkillOrchestratorConfigFromDiscovery({
      baseConfig,
      discovery: discovery([
        discoveredSkill({ name: "task-closeout" })
      ])
    });
    const decision = resolveSkillRoute({
      role: "verifier",
      requestedCapability: "verify",
      config
    });

    expect(decision.source).toBe("built-in");
    expect(decision.selectedProtocol).toBe("verify");
  });

  it("prefers project-local discovered skills over global skills with the same id", () => {
    const config = buildSkillOrchestratorConfigFromDiscovery({
      baseConfig,
      discovery: discovery([
        discoveredSkill({
          name: "systematic-debugging",
          source: "global-codex",
          description: "Global debugging skill."
        }),
        discoveredSkill({
          name: "systematic-debugging",
          source: "project-codex",
          sourceRoot: "/repo/.codex/skills",
          skillPath: "/repo/.codex/skills/systematic-debugging/SKILL.md",
          relativePath: "systematic-debugging/SKILL.md",
          description: "Project debugging skill."
        })
      ])
    });

    expect(config.adapters).toHaveLength(1);
    expect(config.adapters[0]?.id).toBe("systematic-debugging");
  });

  it("applies project-level route preferences after discovery", () => {
    const config = buildSkillOrchestratorConfigFromDiscovery({
      baseConfig,
      discovery: discovery([
        discoveredSkill({
          name: "verification-before-completion"
        }),
        discoveredSkill({
          name: "independent-verification"
        })
      ]),
      routingConfig: {
        version: 1,
        updatedAt: "2026-05-10T12:00:00.000Z",
        generatedFrom: {
          discoveryGeneratedAt: "2026-05-10T11:00:00.000Z",
          discoverySkillCount: 2
        },
        routePreferences: [
          {
            role: "verifier",
            capability: "verify",
            adapterId: "independent-verification",
            reason: "Use independent verification for verifier-owned checks."
          }
        ],
        disabledAdapters: [],
        fallbackAvailability: "missing",
        notes: []
      }
    });
    const decision = resolveSkillRoute({
      role: "verifier",
      requestedCapability: "verify",
      config
    });

    expect(decision.selectedAdapterId).toBe("independent-verification");
  });

  it("marks project-disabled adapters unavailable while preserving fallback", () => {
    const config = buildSkillOrchestratorConfigFromDiscovery({
      baseConfig,
      discovery: discovery([
        discoveredSkill({
          name: "systematic-debugging"
        })
      ]),
      routingConfig: {
        version: 1,
        updatedAt: "2026-05-10T12:00:00.000Z",
        generatedFrom: {
          discoveryGeneratedAt: "2026-05-10T11:00:00.000Z",
          discoverySkillCount: 1
        },
        routePreferences: [
          {
            role: null,
            capability: "debug",
            adapterId: "systematic-debugging",
            reason: null
          }
        ],
        disabledAdapters: [
          {
            adapterId: "systematic-debugging",
            reason: "Temporarily disabled by project config."
          }
        ],
        fallbackAvailability: "missing",
        notes: []
      }
    });
    const decision = resolveSkillRoute({
      role: "hygiene",
      requestedCapability: "debug",
      config
    });

    expect(decision.selectedAdapterId).toBe("systematic-debugging");
    expect(decision.source).toBe("fallback");
    expect(decision.availability).toBe("disabled");
    expect(decision.selectedProtocol).toBe("debug");
  });
});
