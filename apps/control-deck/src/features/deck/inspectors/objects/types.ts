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

export interface ObjectsInspectorProps {
  projectState: ProjectState;
  phaseCurrentSlice: string;
  phaseBoundarySections: PhaseBoundarySection[];
  phaseRoutingOverviewItems: PhaseRoutingOverviewItem[];
  phaseParticipants: PhaseParticipantCard[];
  acceptanceProgressLabel: string;
  lockedPhasePath: string | null;
  resumeHint: string | null;
}
