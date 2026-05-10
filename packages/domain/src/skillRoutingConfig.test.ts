import { describe, expect, it } from "vitest";
import { skillRoutingConfigSchema } from "./skillRoutingConfig.ts";

describe("skillRoutingConfigSchema", () => {
  it("parses an empty project-level routing config with safe defaults", () => {
    const parsed = skillRoutingConfigSchema.parse({});

    expect(parsed.version).toBe(1);
    expect(parsed.generatedFrom.discoveryGeneratedAt).toBeNull();
    expect(parsed.generatedFrom.discoverySkillCount).toBe(0);
    expect(parsed.routePreferences).toEqual([]);
    expect(parsed.disabledAdapters).toEqual([]);
    expect(parsed.fallbackAvailability).toBe("missing");
  });

  it("stores capability and role-specific adapter preferences", () => {
    const parsed = skillRoutingConfigSchema.parse({
      version: 1,
      updatedAt: "2026-05-10T12:00:00.000Z",
      generatedFrom: {
        discoveryGeneratedAt: "2026-05-10T11:58:00.000Z",
        discoverySkillCount: 25
      },
      routePreferences: [
        {
          capability: "debug",
          adapterId: "systematic-debugging",
          reason: "Purpose-built debugging skill."
        },
        {
          role: "verifier",
          capability: "verify",
          adapterId: "independent-verification"
        }
      ],
      disabledAdapters: [
        {
          adapterId: "legacy-reviewer",
          reason: "Disabled until output contract is updated."
        }
      ],
      notes: ["External skills are routed but not executed by v1."]
    });

    expect(parsed.routePreferences[0]?.role).toBeNull();
    expect(parsed.routePreferences[1]?.role).toBe("verifier");
    expect(parsed.disabledAdapters[0]?.adapterId).toBe("legacy-reviewer");
  });

  it("rejects duplicate preferences for the same role and capability", () => {
    expect(() =>
      skillRoutingConfigSchema.parse({
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

  it("rejects duplicate disabled adapters", () => {
    expect(() =>
      skillRoutingConfigSchema.parse({
        disabledAdapters: [
          {
            adapterId: "legacy-reviewer"
          },
          {
            adapterId: "legacy-reviewer"
          }
        ]
      })
    ).toThrow(/disabledAdapters/);
  });
});
