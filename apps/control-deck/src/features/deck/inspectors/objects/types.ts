import type { ProjectState } from "@threadsmith/domain";

export interface PhaseBoundarySection {
  label: string;
  items: string[];
  empty: string;
}

export interface PhaseRoutingOverviewItem {
  label: string;
  value: string;
  detail: string;
  tone: string;
}

export interface PhaseParticipantCard {
  roleLabel: string;
  threadLabel: string;
  providerLabel: string;
  assignmentLabel: string;
  statusLabel: string;
  taskSummary: string;
  latestEvidenceLabel: string | null;
  routeHint: string;
}

export interface ContextRecoveryModel {
  statusLabel: string;
  actionLabel: string;
  tone: string;
  actionTone: string;
  detail: string;
  reasons: string[];
  handling: {
    title: string;
    detail: string;
    tone: string;
    executableActionId: "sync-context" | "run-hygiene" | "create-handoff" | null;
    executableLabel: string | null;
    manualHint: string | null;
  };
  packetItems: Array<{
    label: string;
    value: string;
    tone: string;
  }>;
}

export interface ObjectsInspectorProps {
  projectState: ProjectState;
  phaseCurrentSlice: string;
  contextRecovery: ContextRecoveryModel;
  phaseBoundarySections: PhaseBoundarySection[];
  phaseRoutingOverviewItems: PhaseRoutingOverviewItem[];
  phaseParticipants: PhaseParticipantCard[];
  acceptanceProgressLabel: string;
  lockedPhasePath: string | null;
  resumeHint: string | null;
  onOpenContextAction: (
    actionId: ContextRecoveryModel["handling"]["executableActionId"]
  ) => void;
}
