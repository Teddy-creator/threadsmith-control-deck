import { describe, expect, it, vi } from "vitest";
import {
  applyPhaseReset,
  runBridgeAction,
  startAgentRun,
  updateProjectStatus,
  updateProjectSupervision,
  updateProjectRoadmap,
  updateProviderRouting
} from "./projectConnection";
import {
  buildBridgeResponseBody,
  createJsonResponse
} from "./projectConnection.test.fixtures";

describe("projectConnection mutations", () => {
  it("posts action options and returns a BridgeResponse", async () => {
    const responseBody = buildBridgeResponseBody(2);
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await runBridgeAction("/tmp/live-project", "create-handoff", {
      continuationBehavior: "smart-continuation",
      persistenceScope: "project"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/threadsmith/actions?projectRoot=%2Ftmp%2Flive-project"
      ),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          actionId: "create-handoff",
          continuationBehavior: "smart-continuation",
          persistenceScope: "project"
        })
      })
    );
    expect(result.actionHistoryLength).toBe(2);
    expect(result.state.projectRoadmap.versionLabel).toBe("live-project v1");
    expect(result.state.projectStatus.projectLabel).toBe("live-project");
  });

  it("posts project roadmap updates and returns a BridgeResponse", async () => {
    const roadmapValue = {
      versionLabel: "live-project v1",
      finalGoal: "Ship live-project v1",
      milestones: [
        {
          id: "roadmap-1",
          label: "任务定界",
          title: "明确当前版本范围",
          summary: "先收紧本轮范围。",
          state: "current"
        }
      ],
      updatedAt: "2026-04-06T01:23:45.000Z"
    } as const;
    const responseBody = {
      ...buildBridgeResponseBody(),
      state: {
        ...buildBridgeResponseBody().state,
        projectStatus: {
          projectLabel: "live-project",
          currentTrack: "Workflow-first control deck",
          overallState: "planning",
          currentFocus: "Define the current slice",
          projectStatusSummary: "The project is ready for its next slice.",
          latestAcceptedSlice: null,
          nextPlannedSlice: {
            title: "Define the current slice",
            recordedAt: null
          },
          topRisks: [],
          updatedAt: null
        },
        projectRoadmap: roadmapValue
      }
    };
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProjectRoadmap("/tmp/live-project", roadmapValue);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/threadsmith/project-roadmap?projectRoot=%2Ftmp%2Flive-project"
      ),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          value: roadmapValue
        })
      })
    );
    expect(result.state.projectRoadmap.versionLabel).toBe("live-project v1");
  });

  it("posts project status updates and returns a BridgeResponse", async () => {
    const projectStatusValue = {
      projectLabel: "live-project",
      currentTrack: "Control actions polish",
      overallState: "in-progress",
      currentFocus: "Bridge missing control surfaces",
      projectStatusSummary: "The project is wiring formal bridge entrypoints.",
      latestAcceptedSlice: {
        title: "phase reset + next-slice drafting v1",
        recordedAt: "2026-04-13T00:18:32.507Z"
      },
      nextPlannedSlice: null,
      currentMilestoneId: "command-bridge-control-actions-polish-v1",
      nextMilestoneId: null,
      topRisks: ["Some bridge surfaces are still missing."],
      updatedAt: "2026-04-13T01:00:00.000Z"
    } as const;
    const responseBody = {
      ...buildBridgeResponseBody(),
      state: {
        ...buildBridgeResponseBody().state,
        projectStatus: projectStatusValue
      }
    };
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProjectStatus("/tmp/live-project", projectStatusValue);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/threadsmith/project-status?projectRoot=%2Ftmp%2Flive-project"
      ),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          value: projectStatusValue
        })
      })
    );
    expect(result.state.projectStatus.currentTrack).toBe("Control actions polish");
  });

  it("posts project supervision updates and returns a BridgeResponse", async () => {
    const projectSupervisionValue = {
      mode: "multi-thread",
      modeLabel: "多角色协作",
      summary: "Executor is wiring formal control-action bridge surfaces.",
      lines: [
        {
          id: "executor-line",
          role: "executor",
          threadLabel: "Builder",
          provider: "codex",
          presence: "logical",
          status: "running",
          taskSummary: "正在接 project-status / project-supervision / phase-reset。",
          requiresUserDecision: false,
          blockerSummary: null,
          latestEvidenceLabel: null,
          updatedAt: "2026-04-13T01:05:00.000Z"
        }
      ],
      updatedAt: "2026-04-13T01:05:00.000Z"
    } as const;
    const responseBody = {
      ...buildBridgeResponseBody(),
      projectSupervision: projectSupervisionValue
    };
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProjectSupervision(
      "/tmp/live-project",
      projectSupervisionValue
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/threadsmith/project-supervision?projectRoot=%2Ftmp%2Flive-project"
      ),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          value: projectSupervisionValue
        })
      })
    );
    expect(result.projectSupervision?.summary).toContain("control-action bridge");
  });

  it("posts phase reset drafts and returns a normalized BridgeResponse", async () => {
    const phaseResetValue = {
      currentPhase: buildBridgeResponseBody().state.currentPhase,
      currentClaim: "Bridge surface is now formalized.",
      doneWhen: [
        {
          id: "bridge-routes-added",
          label: "Bridge routes are exposed."
        }
      ],
      startMode: "implementing",
      projectStatus: buildBridgeResponseBody().state.projectStatus,
      projectRoadmap: buildBridgeResponseBody().state.projectRoadmap,
      roleSummaries: {
        executor: "正在补齐正式入口。"
      },
      supervisionSummary: "Current phase has been formally reset."
    } as const;
    const responseBody = buildBridgeResponseBody();
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await applyPhaseReset("/tmp/live-project", phaseResetValue);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/threadsmith/phase-reset?projectRoot=%2Ftmp%2Flive-project"
      ),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          value: phaseResetValue
        })
      })
    );
    expect(result.state.projectStatus.projectLabel).toBe("live-project");
  });

  it("posts run-launch requests and returns typed run metadata", async () => {
    const responseBody = {
      projectRoot: "/tmp/live-project",
      packet: {
        runId: "run-1",
        projectRoot: "/tmp/live-project",
        role: "executor",
        provider: "codex",
        objective: "实现当前 slice",
        scope: ["修改 workflow.ts"],
        doneWhen: ["测试通过"],
        verification: ["npm test"],
        contextRefs: [],
        output: {
          resultPath: ".threadsmith/runs/run-1/result.json",
          summaryPath: ".threadsmith/runs/run-1/result.md"
        }
      },
      run: {
        runId: "run-1",
        projectRoot: "/tmp/live-project",
        role: "executor",
        provider: "codex",
        status: "running",
        createdAt: "2026-04-08T10:00:00.000Z",
        startedAt: "2026-04-08T10:00:00.000Z",
        finishedAt: null,
        packetPath: ".threadsmith/runs/run-1/packet.json",
        promptPath: ".threadsmith/runs/run-1/prompt.md",
        resultPath: null,
        summaryPath: null,
        stdoutPath: ".threadsmith/runs/run-1/stdout.log",
        stderrPath: ".threadsmith/runs/run-1/stderr.log",
        outcome: null,
        statusDetail: null
      }
    };
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await startAgentRun("/tmp/live-project");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/threadsmith/runs?projectRoot=%2Ftmp%2Flive-project"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ role: "executor" })
      })
    );
    expect(result.run.status).toBe("running");
    expect(result.packet.provider).toBe("codex");
  });

  it("posts provider routing updates and returns normalized routing truth", async () => {
    const responseBody = {
      planner: "claude",
      executor: "codex",
      reviewer: "codex",
      verifier: "claude",
      closeout: "codex",
      conductorSurface: "claude-cli"
    };
    const value = {
      planner: "claude",
      executor: "codex",
      reviewer: "codex",
      verifier: "claude",
      closeout: "codex",
      conductorSurface: "claude-cli"
    } as const;
    const fetchMock = vi.fn(async () => createJsonResponse(responseBody));

    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProviderRouting("/tmp/live-project", value);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/threadsmith/provider-routing?projectRoot=%2Ftmp%2Flive-project"
      ),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ value })
      })
    );
    expect(result.verifier).toBe("claude");
    expect(result.conductorSurface).toBe("claude-cli");
  });
});
