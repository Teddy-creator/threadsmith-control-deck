import { describe, expect, it } from "vitest";
import {
  getSelfHostingSafetyWarnings,
  skillOrchestratorConfigSchema,
  skillRouteDecisionSchema
} from "./skillOrchestrator.ts";

const safeSelfHosting = {
  activeController: "installed-skill",
  repositorySkillPath: "codex/skills/threadsmith/SKILL.md",
  installedSkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md",
  allowGlobalSkillMutation: false
} as const;

describe("skillOrchestratorConfigSchema", () => {
  it("parses a minimal built-in-only config", () => {
    const parsed = skillOrchestratorConfigSchema.parse({
      version: 1,
      builtInProtocols: ["brief", "plan", "verify"],
      defaultFallback: "plan",
      selfHosting: safeSelfHosting
    });

    expect(parsed.adapters).toEqual([]);
    expect(parsed.routePreferences).toEqual([]);
    expect(parsed.defaultFallback).toBe("plan");
    expect(parsed.selfHosting.activeController).toBe("installed-skill");
  });

  it("parses an optional external adapter declaration", () => {
    const parsed = skillOrchestratorConfigSchema.parse({
      version: 1,
      builtInProtocols: ["plan", "debug"],
      defaultFallback: "plan",
      selfHosting: safeSelfHosting,
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
          safety: {
            canMutateCommittedTruth: false,
            canMutateGlobalSkill: false,
            forbiddenPaths: ["/Users/cloud/.codex/skills/threadsmith"]
          }
        }
      ]
    });

    expect(parsed.adapters[0]?.availability).toBe("available");
    expect(parsed.adapters[0]?.capabilities).toContain("debug");
  });

  it("rejects self-hosting defaults that allow global skill mutation", () => {
    expect(() =>
      skillOrchestratorConfigSchema.parse({
        version: 1,
        builtInProtocols: ["plan"],
        defaultFallback: "plan",
        selfHosting: {
          ...safeSelfHosting,
          allowGlobalSkillMutation: true
        }
      })
    ).toThrow(/global skill mutation/);
  });

  it("rejects installed-skill controller without an installed path", () => {
    expect(() =>
      skillOrchestratorConfigSchema.parse({
        version: 1,
        builtInProtocols: ["plan"],
        defaultFallback: "plan",
        selfHosting: {
          ...safeSelfHosting,
          installedSkillPath: null
        }
      })
    ).toThrow(/installedSkillPath/);
  });

  it("rejects matching repository and installed skill paths", () => {
    expect(() =>
      skillOrchestratorConfigSchema.parse({
        version: 1,
        builtInProtocols: ["plan"],
        defaultFallback: "plan",
        selfHosting: {
          ...safeSelfHosting,
          repositorySkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md"
        }
      })
    ).toThrow(/repositorySkillPath/);
  });

  it("rejects repo-source controllers that point at the installed global skill", () => {
    expect(() =>
      skillOrchestratorConfigSchema.parse({
        version: 1,
        builtInProtocols: ["plan"],
        defaultFallback: "plan",
        selfHosting: {
          ...safeSelfHosting,
          activeController: "repo-source",
          repositorySkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md"
        }
      })
    ).toThrow(/repo-source controller/);
  });

  it("rejects fallbacks that are not enabled built-in protocols", () => {
    expect(() =>
      skillOrchestratorConfigSchema.parse({
        version: 1,
        builtInProtocols: ["plan"],
        defaultFallback: "debug",
        selfHosting: safeSelfHosting
      })
    ).toThrow(/defaultFallback/);
  });

  it("rejects duplicate route preferences", () => {
    expect(() =>
      skillOrchestratorConfigSchema.parse({
        version: 1,
        builtInProtocols: ["plan", "debug"],
        defaultFallback: "plan",
        selfHosting: safeSelfHosting,
        routePreferences: [
          {
            capability: "debug",
            adapterId: "systematic-debugging"
          },
          {
            capability: "debug",
            adapterId: "bug-driver"
          }
        ]
      })
    ).toThrow(/routePreferences/);
  });
});

describe("getSelfHostingSafetyWarnings", () => {
  it("returns warnings that can be recorded as route evidence", () => {
    const warnings = getSelfHostingSafetyWarnings({
      activeController: "repo-source",
      repositorySkillPath: "~/.codex/skills/threadsmith/SKILL.md",
      installedSkillPath: "/Users/cloud/.codex/skills/threadsmith/SKILL.md",
      allowGlobalSkillMutation: true
    });

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("global skill mutation"),
        expect.stringContaining("Repo-source controller")
      ])
    );
  });
});

describe("skillRouteDecisionSchema", () => {
  it("parses a route decision as evidence-friendly metadata", () => {
    const parsed = skillRouteDecisionSchema.parse({
      role: "executor",
      requestedCapability: "debug",
      selectedProtocol: "debug",
      selectedAdapterId: "systematic-debugging",
      source: "external-adapter",
      availability: "available",
      reason: "External adapter is available for debug.",
      safetyWarnings: []
    });

    expect(parsed.source).toBe("external-adapter");
  });
});
