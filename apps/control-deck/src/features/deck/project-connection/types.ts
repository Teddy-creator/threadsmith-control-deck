import type {
  AgentRunRecord,
  CommandBridgeState,
  ContinuationBehavior,
  ContextPacket,
  ExecutionPacket,
  PhaseRunPause,
  PhaseRunRecord,
  PreferenceScope,
  ProjectState,
  ProjectSupervisionState,
  ProviderRouting,
  RoleContextPacket,
  WorkflowEvent
} from "@threadsmith/domain";
import type { RuntimeActionId } from "@threadsmith/runtime";

export interface BridgeResponse {
  projectRoot: string;
  state: ProjectState;
  providerRouting: ProviderRouting;
  projectSupervision: ProjectSupervisionState | null;
  recentEvents: WorkflowEvent[];
  latestRun: AgentRunRecord | null;
  latestPhaseRun: PhaseRunRecord | null;
  latestPhasePause: PhaseRunPause | null;
  commandBridgeState: CommandBridgeState;
  contextArtifactsLoaded?: boolean;
  contextArtifactProblem?: string | null;
  currentPacket?: ContextPacket | null;
  rolePackets?: RoleContextPacket[];
  actionHistoryLength: number;
}

export interface ActionExecutionOptions {
  continuationBehavior?: ContinuationBehavior;
  persistenceScope?: PreferenceScope;
}

export interface RunLaunchResponse {
  projectRoot: string;
  packet: ExecutionPacket;
  run: AgentRunRecord;
}

export type BridgeStatePayload = Omit<ProjectState, "projectStatus" | "projectRoadmap"> & {
  projectStatus?: unknown;
  projectRoadmap?: unknown;
};

export type BridgeResponsePayload = Omit<BridgeResponse, "state"> & {
  state: BridgeStatePayload;
};

export type ProjectLoadFailureKind =
  | "missing-state"
  | "invalid-state"
  | "unknown";

export type { RuntimeActionId };
