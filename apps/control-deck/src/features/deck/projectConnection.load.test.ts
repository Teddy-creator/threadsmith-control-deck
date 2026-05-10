import { describe, expect, it, vi } from "vitest";
import {
  classifyProjectLoadFailure,
  explainProjectLoadFailure,
  fetchProjectBridgeState,
  fetchProviderRouting,
  fetchSkillRouting
} from "./projectConnection";
import {
  buildBridgeResponseBody,
  createJsonResponse
} from "./projectConnection.test.fixtures";

describe("projectConnection load helpers", () => {
  it("turns ENOENT failures into a friendly missing-state explanation", () => {
    expect(
      explainProjectLoadFailure(
        "/tmp/live-project",
        "ENOENT: no such file or directory, open '/tmp/live-project/.threadsmith/project-brief.json'"
      )
    ).toContain("点击“初始化 Threadsmith”");
  });

  it("turns invalid JSON or schema failures into a repair hint", () => {
    expect(
      explainProjectLoadFailure(
        "/tmp/live-project",
        "Unexpected token } in JSON at position 18"
      )
    ).toContain("无效或不完整");
  });

  it("keeps unknown failures explicit", () => {
    expect(
      explainProjectLoadFailure("/tmp/live-project", "Permission denied")
    ).toBe(`无法打开 "/tmp/live-project"。Permission denied`);
  });

  it("classifies missing state errors", () => {
    expect(
      classifyProjectLoadFailure(
        "ENOENT: no such file or directory, open '/tmp/live-project/.threadsmith/project-brief.json'"
      )
    ).toBe("missing-state");
  });

  it("classifies invalid state errors", () => {
    expect(
      classifyProjectLoadFailure("Unexpected token } in JSON at position 18")
    ).toBe("invalid-state");
  });

  it("falls back to unknown when the failure is not recognized", () => {
    expect(classifyProjectLoadFailure("Permission denied")).toBe("unknown");
  });

  it("fills missing projectStatus and projectRoadmap from older bridge responses", async () => {
    const fetchMock = vi.fn(async () => createJsonResponse(buildBridgeResponseBody()));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchProjectBridgeState("/tmp/live-project");

    expect(result.state.projectStatus.projectLabel).toBe("live-project");
    expect(result.state.projectStatus.currentFocus).toBe(
      "Stand up the first real workflow slice"
    );
    expect(result.state.projectStatus.currentTrack).toBe(
      "Workflow-first control deck"
    );
    expect(result.state.projectRoadmap.versionLabel).toBe("live-project v1");
    expect(result.state.projectRoadmap.milestones[2]?.title).toBe(
      "Build workflow loop"
    );
    expect(result.providerRouting.planner).toBe("codex");
    expect(result.providerRouting.conductorSurface).toBe("codex-desktop");
    expect(result.skillRouting.generatedFrom.discoverySkillCount).toBe(25);
    expect(result.skillRouting.routePreferences[0]?.adapterId).toBe("writing-plans");
  });

  it("fetches provider routing from the bridge api", async () => {
    const responseBody = {
      planner: "claude",
      executor: "codex",
      reviewer: "codex",
      verifier: "codex",
      closeout: "codex",
      conductorSurface: "claude-cli"
    };

    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchProviderRouting("/tmp/live-project");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/threadsmith/provider-routing?projectRoot=%2Ftmp%2Flive-project"
      )
    );
    expect(result.planner).toBe("claude");
    expect(result.conductorSurface).toBe("claude-cli");
  });

  it("fetches skill routing from the bridge api", async () => {
    const responseBody = {
      version: 1,
      updatedAt: "2026-05-10T12:10:15.000Z",
      generatedFrom: {
        discoveryGeneratedAt: "2026-05-10T11:25:00.000Z",
        discoverySkillCount: 25
      },
      routePreferences: [
        {
          role: "verifier",
          capability: "verify",
          adapterId: "independent-verification",
          reason: "Use independent verification for acceptance."
        }
      ],
      disabledAdapters: [
        {
          adapterId: "unsafe-demo",
          reason: "Unsafe in this project."
        }
      ],
      fallbackAvailability: "missing",
      notes: [
        "External skills are discovered and routed by Threadsmith v1, but not executed automatically."
      ]
    };

    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSkillRouting("/tmp/live-project");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/threadsmith/skill-routing?projectRoot=%2Ftmp%2Flive-project"
      )
    );
    expect(result.routePreferences[0]?.adapterId).toBe("independent-verification");
    expect(result.disabledAdapters[0]?.adapterId).toBe("unsafe-demo");
  });

  it("falls back to an empty skill routing config for older bridge responses", async () => {
    const responseBody = buildBridgeResponseBody();
    delete (responseBody as { skillRouting?: unknown }).skillRouting;
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchProjectBridgeState("/tmp/live-project");

    expect(result.skillRouting.generatedFrom.discoverySkillCount).toBe(0);
    expect(result.skillRouting.routePreferences).toEqual([]);
  });

  it("normalizes latest phase-run and pause truth from bridge payloads", async () => {
    const responseBody = {
      ...buildBridgeResponseBody(),
      latestPhaseRun: {
        phaseRunId: "phase-run-1",
        projectRoot: "/tmp/live-project",
        status: "paused",
        currentRole: "verifier",
        currentSliceId: "repair-2",
        repairCount: 2,
        lockedPhaseSnapshotRef:
          ".threadsmith/phase-runs/phase-run-1/locked-phase.json",
        latestSuccessfulRole: "reviewer",
        pauseReason: "验证失败，需要先修一轮。",
        resumeHint: "npm run threadsmith:autopilot -- continue /tmp/live-project",
        workspacePath: "/tmp/live-project/.threadsmith-runtime/phase-run-1",
        latestRunRef: ".threadsmith/runs/run-3/result.json",
        eventRefs: [],
        startedAt: "2026-04-12T09:00:00.000Z",
        finishedAt: null
      },
      latestPhasePause: {
        phaseRunId: "phase-run-1",
        type: "risk",
        role: "verifier",
        summary: "验证失败，需要先修一轮。",
        detail: "自动链路在 verifier 阶段命中风险规则，先修复再 continue。",
        resumeRequirements: ["修复失败测试", "重新跑验证"],
        recommendedPrompt:
          "npm run threadsmith:autopilot -- continue /tmp/live-project",
        createdAt: "2026-04-12T09:30:00.000Z"
      }
    };
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchProjectBridgeState("/tmp/live-project");

    expect(result.latestPhaseRun?.phaseRunId).toBe("phase-run-1");
    expect(result.latestPhaseRun?.repairCount).toBe(2);
    expect(result.latestPhasePause?.summary).toBe("验证失败，需要先修一轮。");
    expect(result.latestPhasePause?.role).toBe("verifier");
  });
});
