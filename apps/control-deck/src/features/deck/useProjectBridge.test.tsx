import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deriveSupervisorState } from "@threadsmith/runtime";
import { useProjectBridge } from "./useProjectBridge";
import {
  applyPhaseReset,
  fetchProjectBridgeState,
  updateProviderRouting
} from "./projectConnection";

vi.mock("@threadsmith/runtime", () => ({
  deriveSupervisorState: vi.fn(() => null)
}));

vi.mock("./projectConnection", () => ({
  fetchProjectBridgeState: vi.fn(),
  runBridgeAction: vi.fn(),
  applyBridgeTransition: vi.fn(),
  startAgentRun: vi.fn(),
  updateProjectBrief: vi.fn(),
  updateCurrentPhase: vi.fn(),
  updateAcceptanceState: vi.fn(),
  updateProjectRoadmap: vi.fn(),
  updateProjectStatus: vi.fn(),
  updateProjectSupervision: vi.fn(),
  updateProviderRouting: vi.fn(),
  applyPhaseReset: vi.fn(),
  ProjectLoadError: class ProjectLoadError extends Error {
    kind: string;
    projectRoot: string;

    constructor(projectRoot: string, message: string, kind: string) {
      super(message);
      this.name = "ProjectLoadError";
      this.projectRoot = projectRoot;
      this.kind = kind;
    }
  }
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function buildBridgeResponse(projectRoot: string, actionHistoryLength = 0) {
  return {
    projectRoot,
    state: {} as never,
    providerRouting: {} as never,
    skillRouting: {} as never,
    projectSupervision: null,
    recentEvents: [],
    latestRun: null,
    latestPhaseRun: null,
    latestPhasePause: null,
    commandBridgeState: {
      latestRoute: null,
      latestRun: null,
      updatedAt: null
    },
    contextArtifactsLoaded: false,
    contextArtifactProblem: null,
    currentPacket: null,
    rolePackets: [],
    actionHistoryLength
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("useProjectBridge", () => {
  it("ignores a stale project load when the operator switches to a new project", async () => {
    const alphaResponse = createDeferred<ReturnType<typeof buildBridgeResponse>>();
    const betaResponse = createDeferred<ReturnType<typeof buildBridgeResponse>>();
    const fetchProjectBridgeStateMock = vi.mocked(fetchProjectBridgeState);

    fetchProjectBridgeStateMock.mockImplementation((projectRoot: string) => {
      if (projectRoot === "/tmp/alpha") {
        return alphaResponse.promise;
      }

      return betaResponse.promise;
    });

    const { result, rerender } = renderHook(
      ({ projectRoot }) => useProjectBridge(projectRoot),
      {
        initialProps: {
          projectRoot: "/tmp/alpha"
        }
      }
    );

    rerender({
      projectRoot: "/tmp/beta"
    });

    betaResponse.resolve(buildBridgeResponse("/tmp/beta", 2));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.projectRoot).toBe("/tmp/beta");
      expect(result.current.actionHistoryLength).toBe(2);
    });

    alphaResponse.resolve(buildBridgeResponse("/tmp/alpha", 1));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.projectRoot).toBe("/tmp/beta");
    expect(result.current.actionHistoryLength).toBe(2);
  });

  it("keeps the newest reload result when overlapping refreshes resolve out of order", async () => {
    const initialResponse = createDeferred<ReturnType<typeof buildBridgeResponse>>();
    const olderReload = createDeferred<ReturnType<typeof buildBridgeResponse>>();
    const newerReload = createDeferred<ReturnType<typeof buildBridgeResponse>>();
    const fetchProjectBridgeStateMock = vi.mocked(fetchProjectBridgeState);

    fetchProjectBridgeStateMock
      .mockReturnValueOnce(initialResponse.promise)
      .mockReturnValueOnce(olderReload.promise)
      .mockReturnValueOnce(newerReload.promise);

    const { result } = renderHook(() => useProjectBridge("/tmp/project"));

    initialResponse.resolve(buildBridgeResponse("/tmp/project", 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.actionHistoryLength).toBe(0);
    });

    let firstReloadPromise: Promise<unknown>;
    let secondReloadPromise: Promise<unknown>;

    act(() => {
      firstReloadPromise = result.current.reload();
      secondReloadPromise = result.current.reload();
    });

    newerReload.resolve(buildBridgeResponse("/tmp/project", 2));

    await waitFor(() => {
      expect(result.current.actionHistoryLength).toBe(2);
    });

    olderReload.resolve(buildBridgeResponse("/tmp/project", 1));

    await act(async () => {
      await Promise.all([firstReloadPromise!, secondReloadPromise!]);
    });

    expect(result.current.actionHistoryLength).toBe(2);
  });

  it("invalidates older loads when saving provider routing", async () => {
    const initialResponse = createDeferred<ReturnType<typeof buildBridgeResponse>>();
    const staleReload = createDeferred<ReturnType<typeof buildBridgeResponse>>();
    const fetchProjectBridgeStateMock = vi.mocked(fetchProjectBridgeState);
    const updateProviderRoutingMock = vi.mocked(updateProviderRouting);

    fetchProjectBridgeStateMock
      .mockReturnValueOnce(initialResponse.promise)
      .mockReturnValueOnce(staleReload.promise);
    updateProviderRoutingMock.mockResolvedValue({} as never);

    const { result } = renderHook(() => useProjectBridge("/tmp/project"));

    initialResponse.resolve(buildBridgeResponse("/tmp/project", 0));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let staleReloadPromise: Promise<unknown>;

    act(() => {
      staleReloadPromise = result.current.reload();
    });

    await act(async () => {
      await result.current.saveProviderRouting({} as never);
    });

    staleReload.resolve(buildBridgeResponse("/tmp/project", 9));

    await act(async () => {
      await staleReloadPromise!;
    });

    expect(result.current.actionHistoryLength).toBe(0);
  });

  it("updates the current response when phase reset returns new bridge truth", async () => {
    const fetchProjectBridgeStateMock = vi.mocked(fetchProjectBridgeState);
    const applyPhaseResetMock = vi.mocked(applyPhaseReset);

    fetchProjectBridgeStateMock.mockResolvedValue(buildBridgeResponse("/tmp/project", 0) as never);
    applyPhaseResetMock.mockResolvedValue(buildBridgeResponse("/tmp/project", 3) as never);

    const { result } = renderHook(() => useProjectBridge("/tmp/project"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.actionHistoryLength).toBe(0);
    });

    await act(async () => {
      await result.current.resetPhase({} as never);
    });

    expect(result.current.actionHistoryLength).toBe(3);
  });

  it("passes phase-run truth into deriveSupervisorState", async () => {
    const fetchProjectBridgeStateMock = vi.mocked(fetchProjectBridgeState);
    const deriveSupervisorStateMock = vi.mocked(deriveSupervisorState);
    const response = {
      ...buildBridgeResponse("/tmp/project"),
      latestPhaseRun: {
        phaseRunId: "phase-run-1",
        projectRoot: "/tmp/project",
        status: "running",
        currentRole: "reviewer",
        currentSliceId: "repair-1",
        repairCount: 1,
        lockedPhaseSnapshotRef:
          ".threadsmith/phase-runs/phase-run-1/locked-phase.json",
        latestSuccessfulRole: "executor",
        pauseReason: null,
        resumeHint: null,
        workspacePath: "/tmp/project/.threadsmith-runtime/phase-run-1",
        latestRunRef: ".threadsmith/runs/run-3/result.json",
        eventRefs: [],
        startedAt: "2026-04-12T09:00:00.000Z",
        finishedAt: null
      },
      latestPhasePause: null
    };

    fetchProjectBridgeStateMock.mockResolvedValue(response as never);

    renderHook(() => useProjectBridge("/tmp/project"));

    await waitFor(() => {
      expect(deriveSupervisorStateMock).toHaveBeenCalledWith(
        response.state,
        response.recentEvents,
        response.latestRun,
        response.commandBridgeState,
        response.projectSupervision,
        response.providerRouting,
        response.latestPhaseRun,
        response.latestPhasePause,
        response.currentPacket,
        response.rolePackets,
        response.contextArtifactsLoaded,
        response.contextArtifactProblem,
        response.skillRouting
      );
    });
  });
});
