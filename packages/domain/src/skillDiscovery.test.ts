import { describe, expect, it } from "vitest";
import {
  discoveredSkillSchema,
  skillDiscoverySummarySchema
} from "./skillDiscovery.ts";

describe("discoveredSkillSchema", () => {
  it("parses a discovered Codex skill with inferred capabilities", () => {
    const parsed = discoveredSkillSchema.parse({
      id: "systematic-debugging",
      name: "systematic-debugging",
      description: "Use when encountering any bug or unexpected behavior.",
      skillPath: "/home/user/.codex/skills/systematic-debugging/SKILL.md",
      source: "global-codex",
      sourceRoot: "/home/user/.codex/skills",
      relativePath: "systematic-debugging/SKILL.md",
      frontmatter: {
        name: "systematic-debugging",
        description: "Use when encountering any bug or unexpected behavior."
      },
      bodyPreview: "# Systematic Debugging",
      capabilities: ["debug"],
      health: "available",
      warnings: []
    });

    expect(parsed.capabilities).toEqual(["debug"]);
    expect(parsed.health).toBe("available");
  });

  it("rejects a discovered skill without a stable name", () => {
    expect(() =>
      discoveredSkillSchema.parse({
        id: "",
        name: "",
        description: null,
        skillPath: "/tmp/SKILL.md",
        source: "unknown",
        sourceRoot: "/tmp",
        relativePath: "SKILL.md",
        frontmatter: {
          name: null,
          description: null
        },
        bodyPreview: "",
        capabilities: [],
        health: "available",
        warnings: []
      })
    ).toThrow();
  });
});

describe("skillDiscoverySummarySchema", () => {
  it("keeps explicit health counts for discovered skills", () => {
    const parsed = skillDiscoverySummarySchema.parse({
      generatedAt: "2026-05-10T11:00:00.000Z",
      roots: [
        {
          root: "/home/user/.codex/skills",
          source: "global-codex"
        }
      ],
      skills: [],
      counts: {
        total: 0,
        available: 0,
        missing: 0,
        stale: 0,
        disabled: 0,
        unsafe: 0
      },
      warnings: []
    });

    expect(parsed.counts.total).toBe(0);
  });
});
