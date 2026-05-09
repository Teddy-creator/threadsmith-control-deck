import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AcceptanceState,
  CurrentPhase,
  ProviderRouting,
  ProjectBrief,
  ProjectStatus,
  ProjectSupervisionState,
  ProjectRoadmap,
  WorkflowTransitionId
} from "@threadsmith/domain";
import { deriveSupervisorState, type RuntimeActionId } from "@threadsmith/runtime";
import {
  type ActionExecutionOptions,
  type PhaseResetDraftInput,
  type ProjectLoadFailureKind,
  ProjectLoadError,
  applyBridgeTransition,
  applyPhaseReset,
  fetchProjectBridgeState,
  runBridgeAction,
  startAgentRun,
  updateAcceptanceState,
  updateCurrentPhase,
  updateProviderRouting,
  updateProjectBrief,
  updateProjectStatus,
  updateProjectSupervision,
  updateProjectRoadmap
} from "./projectConnection";

export function useProjectBridge(projectRoot: string) {
  const [response, setResponse] = useState<Awaited<
    ReturnType<typeof fetchProjectBridgeState>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRefreshCount, setPendingRefreshCount] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ProjectLoadFailureKind | null>(null);
  const latestResponseRequestIdRef = useRef(0);

  function beginResponseRequest() {
    latestResponseRequestIdRef.current += 1;
    return latestResponseRequestIdRef.current;
  }

  function commitResponseIfCurrent(
    requestId: number,
    nextResponse: Awaited<ReturnType<typeof fetchProjectBridgeState>>
  ) {
    if (latestResponseRequestIdRef.current === requestId) {
      setResponse(nextResponse);
      setLastLoadedAt(Date.now());
    }

    return nextResponse;
  }

  function beginRefreshRequest() {
    let finished = false;
    setPendingRefreshCount((current) => current + 1);

    return () => {
      if (finished) {
        return;
      }

      finished = true;
      setPendingRefreshCount((current) => Math.max(current - 1, 0));
    };
  }

  async function load() {
    const requestId = beginResponseRequest();
    const finishRefresh = beginRefreshRequest();

    try {
      const nextResponse = await fetchProjectBridgeState(projectRoot);
      return commitResponseIfCurrent(requestId, nextResponse);
    } finally {
      finishRefresh();
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setErrorKind(null);

    const refresh = async () => {
      try {
        await load();
        if (active) {
          setError(null);
          setErrorKind(null);
          setLoading(false);
        }
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "未知 bridge 错误"
          );
          setErrorKind(
            reason instanceof ProjectLoadError ? reason.kind : null
          );
          setLoading(false);
        }
      }
    };

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [projectRoot]);

  async function runAction(
    actionId: RuntimeActionId,
    options?: ActionExecutionOptions
  ) {
    const requestId = beginResponseRequest();
    const nextResponse = await runBridgeAction(projectRoot, actionId, options);
    commitResponseIfCurrent(requestId, nextResponse);
  }

  async function applyTransition(transitionId: WorkflowTransitionId) {
    beginResponseRequest();
    await applyBridgeTransition(projectRoot, transitionId);
    await load();
  }

  async function saveProjectBrief(value: ProjectBrief) {
    const requestId = beginResponseRequest();
    const nextResponse = await updateProjectBrief(projectRoot, value);
    commitResponseIfCurrent(requestId, nextResponse);
  }

  async function saveCurrentPhase(value: CurrentPhase) {
    const requestId = beginResponseRequest();
    const nextResponse = await updateCurrentPhase(projectRoot, value);
    commitResponseIfCurrent(requestId, nextResponse);
  }

  async function saveAcceptanceState(value: AcceptanceState) {
    const requestId = beginResponseRequest();
    const nextResponse = await updateAcceptanceState(projectRoot, value);
    commitResponseIfCurrent(requestId, nextResponse);
  }

  async function saveProjectRoadmap(value: ProjectRoadmap) {
    const requestId = beginResponseRequest();
    const nextResponse = await updateProjectRoadmap(projectRoot, value);
    commitResponseIfCurrent(requestId, nextResponse);
  }

  async function saveProjectStatus(value: ProjectStatus) {
    const requestId = beginResponseRequest();
    const nextResponse = await updateProjectStatus(projectRoot, value);
    commitResponseIfCurrent(requestId, nextResponse);
  }

  async function saveProjectSupervision(value: ProjectSupervisionState) {
    const requestId = beginResponseRequest();
    const nextResponse = await updateProjectSupervision(projectRoot, value);
    commitResponseIfCurrent(requestId, nextResponse);
  }

  async function resetPhase(value: PhaseResetDraftInput) {
    const requestId = beginResponseRequest();
    const nextResponse = await applyPhaseReset(projectRoot, value);
    commitResponseIfCurrent(requestId, nextResponse);
  }

  async function saveProviderRouting(value: ProviderRouting) {
    const requestId = beginResponseRequest();
    const nextProviderRouting = await updateProviderRouting(projectRoot, value);
    if (latestResponseRequestIdRef.current === requestId) {
      setResponse((currentResponse) =>
        currentResponse
          ? {
              ...currentResponse,
              providerRouting: nextProviderRouting
            }
          : currentResponse
      );
    }
    return nextProviderRouting;
  }

  async function startRun() {
    beginResponseRequest();
    const launched = await startAgentRun(projectRoot, "executor");
    await load();
    return launched;
  }

  const supervisorState = useMemo(
    () =>
      response
        ? deriveSupervisorState(
            response.state,
            response.recentEvents,
            response.latestRun,
            response.commandBridgeState,
            response.projectSupervision,
            response.providerRouting,
            response.latestPhaseRun,
            response.latestPhasePause,
            response.currentPacket ?? null,
            response.rolePackets ?? [],
            Boolean(response.contextArtifactsLoaded),
            response.contextArtifactProblem ?? null
          )
        : null,
    [response]
  );

  return {
    loading,
    refreshing: pendingRefreshCount > 0,
    error,
    errorKind,
    lastLoadedAt,
    projectRoot: response?.projectRoot ?? projectRoot,
    actionHistoryLength: response?.actionHistoryLength ?? 0,
    supervisorState,
    reload: load,
    runAction,
    startRun,
    applyTransition,
    saveProjectBrief,
    saveCurrentPhase,
    saveAcceptanceState,
    saveProjectRoadmap,
    saveProjectStatus,
    saveProjectSupervision,
    resetPhase,
    saveProviderRouting
  };
}
