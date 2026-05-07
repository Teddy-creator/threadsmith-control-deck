import type {
  AgentRunRecord,
  CommandBridgeState,
  PhaseRunPause,
  PhaseRunRecord,
  ProviderRouting,
  ProjectState,
  ProjectSupervisionState,
  WorkflowEvent
} from "@threadsmith/domain";
import { providerRoutingSchema } from "@threadsmith/domain";
import {
  deriveLatestVerificationEvidence,
  type VerificationEvidenceSummary
} from "./evidence.ts";
import {
  deriveLatestCloseoutRecord,
  type CloseoutRecordSummary
} from "./closeout.ts";
import { deriveGateSignal } from "./gates.ts";
import { deriveHealth } from "./health.ts";
import { selectNextBestStep, type NextBestStepDecision } from "./nextBestStep.ts";
import {
  selectWorkflowTransitions,
  type WorkflowTransitionAction
} from "./workflowTransitions.ts";
import {
  deriveSupervisionTimeline,
  type SupervisionTimelineEntry
} from "./supervisionTimeline.ts";
import {
  derivePhaseReadiness,
  type PhaseReadinessSummary
} from "./phaseReadiness.ts";
import {
  deriveLatestContinuationState,
  type LatestContinuationState
} from "./continuationState.ts";
import {
  deriveCommandBridgeSummary,
  type CommandBridgeSummary
} from "./commandBridge.ts";
import {
  deriveLatestPhasePauseSummary,
  deriveLatestPhaseRunSummary,
  type PhasePauseSummary,
  type PhaseRunSummary
} from "./phaseRun.ts";
import {
  derivePhaseParticipantSummary,
  deriveProjectSupervisionSummary,
  type PhaseParticipantSummary,
  type ProjectSupervisionSummary
} from "./supervision.ts";

export interface PhaseTrackItem {
  label: string;
  state: "done" | "in-progress" | "next" | "later";
}

export interface AcceptanceSummary {
  finalState: string;
  currentClaim: string;
  completedCount: number;
  totalCount: number;
  reviewStatus: string;
  verificationStatus: string;
  closeoutStatus: string;
  knownGapsCount: number;
}

export interface SupervisorState {
  projectState: ProjectState;
  providerRouting: ProviderRouting;
  projectSupervision: ProjectSupervisionSummary;
  phaseParticipants: PhaseParticipantSummary[];
  recentEvents: WorkflowEvent[];
  latestRun: AgentRunRecord | null;
  latestPhaseRun: PhaseRunRecord | null;
  latestPhasePause: PhaseRunPause | null;
  latestPhaseRunSummary: PhaseRunSummary;
  latestPhasePauseSummary: PhasePauseSummary;
  commandBridge: CommandBridgeSummary;
  latestVerificationEvidence: VerificationEvidenceSummary;
  latestCloseoutRecord: CloseoutRecordSummary;
  latestContinuationState: LatestContinuationState;
  supervisionTimeline: SupervisionTimelineEntry[];
  phaseReadiness: PhaseReadinessSummary;
  nextBestStep: NextBestStepDecision;
  workflowTransitions: WorkflowTransitionAction[];
  health: ReturnType<typeof deriveHealth>;
  gateSignal: ReturnType<typeof deriveGateSignal>;
  phaseTrack: PhaseTrackItem[];
  acceptanceSummary: AcceptanceSummary;
}

function buildPhaseTrack(state: ProjectState): PhaseTrackItem[] {
  const currentPhaseState: PhaseTrackItem["state"] =
    state.acceptanceState.finalState === "accepted"
      ? "done"
      : state.acceptanceState.verificationStatus === "running" ||
          state.acceptanceState.reviewStatus === "in-review" ||
          state.acceptanceState.implementationStatus === "implementing"
        ? "in-progress"
        : "next";

  const verificationState: PhaseTrackItem["state"] =
    state.acceptanceState.verificationStatus === "passed"
      ? "done"
      : state.acceptanceState.verificationStatus === "running"
        ? "in-progress"
        : state.acceptanceState.reviewStatus === "ready-for-verification"
          ? "next"
          : "later";

  const closeoutState: PhaseTrackItem["state"] =
    state.acceptanceState.closeoutStatus === "done"
      ? "done"
      : state.acceptanceState.closeoutStatus === "running"
        ? "in-progress"
        : state.acceptanceState.verificationStatus === "passed" ||
            state.acceptanceState.finalState ===
              "accepted-with-closeout-pending"
          ? "next"
          : "later";

  return [
    { label: "项目简报", state: "done" },
    { label: state.currentPhase.phaseName, state: currentPhaseState },
    { label: "验证", state: verificationState },
    { label: "收尾", state: closeoutState }
  ];
}

function buildAcceptanceSummary(state: ProjectState): AcceptanceSummary {
  const completedCount = state.acceptanceState.doneWhenChecklist.filter(
    (item) => item.status === "pass"
  ).length;

  return {
    finalState: state.acceptanceState.finalState,
    currentClaim: state.acceptanceState.currentClaim,
    completedCount,
    totalCount: state.acceptanceState.doneWhenChecklist.length,
    reviewStatus: state.acceptanceState.reviewStatus,
    verificationStatus: state.acceptanceState.verificationStatus,
    closeoutStatus: state.acceptanceState.closeoutStatus,
    knownGapsCount: state.acceptanceState.knownGaps.length
  };
}

export function deriveSupervisorState(
  state: ProjectState,
  recentEvents: WorkflowEvent[] = [],
  latestRun: AgentRunRecord | null = null,
  commandBridgeState: CommandBridgeState | null = null,
  projectSupervisionState: ProjectSupervisionState | null = null,
  providerRouting: ProviderRouting | null = null,
  latestPhaseRun: PhaseRunRecord | null = null,
  latestPhasePause: PhaseRunPause | null = null
): SupervisorState {
  const latestContinuationState = deriveLatestContinuationState(recentEvents);
  const latestPhasePauseSummary = deriveLatestPhasePauseSummary(latestPhasePause);
  const latestPhaseRunSummary = deriveLatestPhaseRunSummary(
    latestPhaseRun,
    latestPhasePauseSummary
  );
  const gateSignal = deriveGateSignal(
    state,
    latestContinuationState,
    latestRun,
    latestPhaseRunSummary,
    latestPhasePauseSummary
  );
  const nextBestStep = selectNextBestStep(
    state,
    latestContinuationState,
    latestRun,
    latestPhaseRunSummary,
    latestPhasePauseSummary
  );
  const resolvedProviderRouting = providerRouting ?? providerRoutingSchema.parse({});

  return {
    projectState: state,
    providerRouting: resolvedProviderRouting,
    projectSupervision: deriveProjectSupervisionSummary(
      state,
      projectSupervisionState,
      latestRun,
      resolvedProviderRouting
    ),
    phaseParticipants: derivePhaseParticipantSummary(
      state,
      projectSupervisionState,
      resolvedProviderRouting
    ),
    recentEvents,
    latestRun,
    latestPhaseRun,
    latestPhasePause,
    latestPhaseRunSummary,
    latestPhasePauseSummary,
    commandBridge: deriveCommandBridgeSummary(
      state,
      nextBestStep.primary,
      latestRun,
      commandBridgeState,
      resolvedProviderRouting
    ),
    latestVerificationEvidence: deriveLatestVerificationEvidence(state, recentEvents),
    latestCloseoutRecord: deriveLatestCloseoutRecord(state, recentEvents),
    latestContinuationState,
    supervisionTimeline: deriveSupervisionTimeline(
      state,
      gateSignal,
      recentEvents,
      latestRun
    ),
    phaseReadiness: derivePhaseReadiness(state, recentEvents),
    nextBestStep,
    workflowTransitions: selectWorkflowTransitions(state),
    health: deriveHealth(
      state,
      latestContinuationState,
      latestPhaseRunSummary,
      latestPhasePauseSummary
    ),
    gateSignal,
    phaseTrack: buildPhaseTrack(state),
    acceptanceSummary: buildAcceptanceSummary(state)
  };
}
