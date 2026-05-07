import { describe, expect, it } from "vitest";
import type { ProviderRouting } from "@threadsmith/domain";
import {
  describeRouteSupport,
  formatConductorSurfaceLabel,
  resolveRoleProvider
} from "./providerRouting.ts";

const mixedRouting: ProviderRouting = {
  planner: "claude",
  executor: "codex",
  reviewer: "codex",
  verifier: "codex",
  closeout: "codex",
  conductorSurface: "claude-cli"
};

describe("providerRouting runtime helpers", () => {
  it("prefers the live provider for real threads", () => {
    const resolved = resolveRoleProvider({
      role: "planner",
      line: {
        id: "planner-main",
        role: "planner",
        threadLabel: "Conductor",
        provider: "codex",
        presence: "live",
        status: "running",
        taskSummary: "Keep the current phase on track",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: null,
        updatedAt: null
      },
      routing: mixedRouting
    });

    expect(resolved.provider).toBe("codex");
    expect(resolved.source).toBe("live");
    expect(resolved.providerLabel).toBe("Codex");
  });

  it("falls back to the routed provider for logical roles", () => {
    const resolved = resolveRoleProvider({
      role: "planner",
      line: {
        id: "planner-main",
        role: "planner",
        threadLabel: "Conductor",
        provider: null,
        presence: "logical",
        status: "waiting",
        taskSummary: "Plan the next slice",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: null,
        updatedAt: null
      },
      routing: mixedRouting
    });

    expect(resolved.provider).toBe("claude");
    expect(resolved.source).toBe("routing");
    expect(resolved.providerLabel).toBe("Claude");
  });

  it("describes claude routes as configured but unsupported for auto execution", () => {
    const support = describeRouteSupport({
      provider: "claude",
      conductorSurface: "claude-cli",
      routeKind: "workflow-recommended",
      busy: false
    });

    expect(support.availability).toBe("unavailable");
    expect(support.availabilityLabel).toBe("已配置，暂不支持自动执行");
    expect(support.bridgeSurfaceLabel).toBe("回到当前入口（Claude CLI）");
    expect(support.detail).toContain("auto-execution v1 仅支持 Codex");
    expect(formatConductorSurfaceLabel("claude-cli")).toBe("Claude CLI");
  });
});
