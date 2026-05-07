import { describe, expect, it } from "vitest";
import { providerRoutingSchema } from "./providerRouting.ts";

describe("providerRoutingSchema", () => {
  it("defaults every role to codex and the conductor surface to codex-desktop", () => {
    const parsed = providerRoutingSchema.parse({});

    expect(parsed.planner).toBe("codex");
    expect(parsed.executor).toBe("codex");
    expect(parsed.reviewer).toBe("codex");
    expect(parsed.verifier).toBe("codex");
    expect(parsed.closeout).toBe("codex");
    expect(parsed.conductorSurface).toBe("codex-desktop");
  });

  it("accepts a mixed-provider routing map", () => {
    const parsed = providerRoutingSchema.parse({
      planner: "claude",
      executor: "codex",
      reviewer: "codex",
      verifier: "codex",
      closeout: "codex",
      conductorSurface: "claude-cli"
    });

    expect(parsed.planner).toBe("claude");
    expect(parsed.executor).toBe("codex");
    expect(parsed.conductorSurface).toBe("claude-cli");
  });
});
