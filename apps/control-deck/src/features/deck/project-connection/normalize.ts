import {
  agentRunRecordSchema,
  commandBridgeStateSchema,
  contextPacketSchema,
  deriveFallbackProjectRoadmap,
  deriveFallbackProjectStatus,
  phaseRunPauseSchema,
  phaseRunRecordSchema,
  projectSupervisionStateSchema,
  providerRoutingSchema,
  projectRoadmapSchema,
  projectStatusSchema,
  roleContextPacketSchema,
  skillRoutingConfigSchema
} from "@threadsmith/domain";
import type { BridgeResponse, BridgeResponsePayload, BridgeStatePayload } from "./types";

function deriveProjectLabelFromRoot(projectRoot: string) {
  const trimmedRoot = projectRoot.replace(/[\\/]+$/, "");
  const segments = trimmedRoot.split(/[\\/]/).filter(Boolean);
  return segments.at(-1) ?? "当前项目";
}

function normalizeProjectState(
  projectRoot: string,
  state: BridgeStatePayload
) {
  const normalizedProjectStatus = projectStatusSchema.safeParse(state.projectStatus);
  const projectStatus = normalizedProjectStatus.success
    ? normalizedProjectStatus.data
    : deriveFallbackProjectStatus({
        projectLabel: deriveProjectLabelFromRoot(projectRoot),
        projectBrief: state.projectBrief,
        currentPhase: state.currentPhase,
        acceptanceState: state.acceptanceState
      });
  const normalizedProjectRoadmap = projectRoadmapSchema.safeParse(
    state.projectRoadmap
  );
  const projectRoadmap = normalizedProjectRoadmap.success
    ? normalizedProjectRoadmap.data
    : deriveFallbackProjectRoadmap({
        projectLabel: projectStatus.projectLabel,
        projectBrief: state.projectBrief,
        projectStatus,
        currentPhase: state.currentPhase,
        acceptanceState: state.acceptanceState
      });

  return {
    ...state,
    projectStatus,
    projectRoadmap
  };
}

export function normalizeBridgeResponse(
  projectRoot: string,
  response: BridgeResponsePayload
): BridgeResponse {
  const normalizedProjectRoot = response.projectRoot ?? projectRoot;
  const normalizedLatestRun = response.latestRun
    ? agentRunRecordSchema.safeParse(response.latestRun).success
      ? agentRunRecordSchema.parse(response.latestRun)
      : null
    : null;
  const normalizedCommandBridgeState = commandBridgeStateSchema.safeParse(
    response.commandBridgeState
  ).success
    ? commandBridgeStateSchema.parse(response.commandBridgeState)
    : commandBridgeStateSchema.parse({
        latestRoute: null,
        latestRun: null,
        updatedAt: null
      });
  const normalizedLatestPhaseRun = response.latestPhaseRun
    ? phaseRunRecordSchema.safeParse(response.latestPhaseRun).success
      ? phaseRunRecordSchema.parse(response.latestPhaseRun)
      : null
    : null;
  const normalizedLatestPhasePause = response.latestPhasePause
    ? phaseRunPauseSchema.safeParse(response.latestPhasePause).success
      ? phaseRunPauseSchema.parse(response.latestPhasePause)
      : null
    : null;

  return {
    ...response,
    projectRoot: normalizedProjectRoot,
    state: normalizeProjectState(normalizedProjectRoot, response.state),
    providerRouting: providerRoutingSchema.safeParse(
      (response as { providerRouting?: unknown }).providerRouting
    ).success
      ? providerRoutingSchema.parse(
          (response as { providerRouting?: unknown }).providerRouting
        )
      : providerRoutingSchema.parse({}),
    skillRouting: skillRoutingConfigSchema.safeParse(
      (response as { skillRouting?: unknown }).skillRouting
    ).success
      ? skillRoutingConfigSchema.parse(
          (response as { skillRouting?: unknown }).skillRouting
        )
      : skillRoutingConfigSchema.parse({}),
    projectSupervision: projectSupervisionStateSchema.safeParse(
      (response as { projectSupervision?: unknown }).projectSupervision
    ).success
      ? projectSupervisionStateSchema.parse(
          (response as { projectSupervision?: unknown }).projectSupervision
        )
      : null,
    latestRun: normalizedLatestRun,
    latestPhaseRun: normalizedLatestPhaseRun,
    latestPhasePause: normalizedLatestPhasePause,
    commandBridgeState: normalizedCommandBridgeState,
    contextArtifactsLoaded: Boolean(
      (response as { contextArtifactsLoaded?: unknown }).contextArtifactsLoaded
    ),
    contextArtifactProblem:
      typeof (response as { contextArtifactProblem?: unknown }).contextArtifactProblem === "string"
        ? (response as { contextArtifactProblem: string }).contextArtifactProblem
        : null,
    currentPacket: contextPacketSchema.safeParse(
      (response as { currentPacket?: unknown }).currentPacket
    ).success
      ? contextPacketSchema.parse(
          (response as { currentPacket?: unknown }).currentPacket
        )
      : null,
    rolePackets: Array.isArray((response as { rolePackets?: unknown }).rolePackets)
      ? (response as { rolePackets?: unknown[] }).rolePackets
          .map((packet) => roleContextPacketSchema.safeParse(packet))
          .filter((result) => result.success)
          .map((result) => result.data)
      : []
  };
}
