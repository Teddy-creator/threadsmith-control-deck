import { providerRoutingSchema } from "@threadsmith/domain";
import type {
  AcceptanceState,
  CurrentPhase,
  DoneWhenItem,
  PhaseOwner,
  ProjectBrief,
  ProjectRoadmap,
  ProjectStatus,
  ProjectSupervisionState,
  ProviderRouting,
  WorkflowTransitionId
} from "@threadsmith/domain";
import { normalizeBridgeResponse } from "./normalize";
import { buildApiUrl, buildJsonPostRequest, readBridgeErrorMessage } from "./request";
import type {
  ActionExecutionOptions,
  BridgeResponsePayload,
  RunLaunchResponse,
  RuntimeActionId
} from "./types";

export interface PhaseResetDraftInput {
  currentPhase: CurrentPhase;
  currentClaim: string;
  doneWhen: Array<Pick<DoneWhenItem, "id" | "label">>;
  startMode?: "planning" | "implementing";
  projectStatus: ProjectStatus;
  projectRoadmap: ProjectRoadmap;
  roleSummaries?: Partial<Record<PhaseOwner, string>>;
  supervisionSummary?: string;
  recordedAt?: string;
}

async function postNormalizedBridgeResponse(
  projectRoot: string,
  path: string,
  body: unknown,
  fallbackMessage: (status: number) => string
) {
  const response = await fetch(
    buildApiUrl(path, projectRoot),
    buildJsonPostRequest(body)
  );

  if (!response.ok) {
    throw new Error(
      await readBridgeErrorMessage(response, fallbackMessage(response.status))
    );
  }

  return normalizeBridgeResponse(
    projectRoot,
    (await response.json()) as BridgeResponsePayload
  );
}

export async function updateProjectBrief(
  projectRoot: string,
  value: ProjectBrief
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/project-brief",
    { value },
    (status) => `保存项目简报失败（${status}）`
  );
}

export async function updateCurrentPhase(
  projectRoot: string,
  value: CurrentPhase
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/current-phase",
    { value },
    (status) => `保存当前 phase 失败（${status}）`
  );
}

export async function updateProjectRoadmap(
  projectRoot: string,
  value: ProjectRoadmap
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/project-roadmap",
    { value },
    (status) => `保存项目地图失败（${status}）`
  );
}

export async function updateProjectStatus(
  projectRoot: string,
  value: ProjectStatus
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/project-status",
    { value },
    (status) => `保存项目状态失败（${status}）`
  );
}

export async function updateProjectSupervision(
  projectRoot: string,
  value: ProjectSupervisionState
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/project-supervision",
    { value },
    (status) => `保存协作现场失败（${status}）`
  );
}

export async function applyPhaseReset(
  projectRoot: string,
  value: PhaseResetDraftInput
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/phase-reset",
    { value },
    (status) => `执行 phase reset 失败（${status}）`
  );
}

export async function updateAcceptanceState(
  projectRoot: string,
  value: AcceptanceState
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/acceptance-state",
    { value },
    (status) => `保存验收状态失败（${status}）`
  );
}

export async function updateProviderRouting(
  projectRoot: string,
  value: ProviderRouting
) {
  const response = await fetch(
    buildApiUrl("/api/threadsmith/provider-routing", projectRoot),
    buildJsonPostRequest({ value })
  );

  if (!response.ok) {
    throw new Error(
      await readBridgeErrorMessage(
        response,
        `保存 provider routing 失败（${response.status}）`
      )
    );
  }

  return providerRoutingSchema.parse(await response.json());
}

export async function runBridgeAction(
  projectRoot: string,
  actionId: RuntimeActionId,
  options?: ActionExecutionOptions
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/actions",
    { actionId, ...options },
    (status) => `执行动作失败（${status}）`
  );
}

export async function applyBridgeTransition(
  projectRoot: string,
  transitionId: WorkflowTransitionId
) {
  return postNormalizedBridgeResponse(
    projectRoot,
    "/api/threadsmith/transitions",
    { transitionId },
    (status) => `应用 transition 失败（${status}）`
  );
}

export async function startAgentRun(
  projectRoot: string,
  role: PhaseOwner = "executor"
) {
  const response = await fetch(
    buildApiUrl("/api/threadsmith/runs", projectRoot),
    buildJsonPostRequest({ role })
  );

  if (!response.ok) {
    throw new Error(
      await readBridgeErrorMessage(
        response,
        `启动自动执行失败（${response.status}）`
      )
    );
  }

  return (await response.json()) as RunLaunchResponse;
}
