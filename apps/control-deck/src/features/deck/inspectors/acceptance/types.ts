import type { AcceptanceState, ProjectState, WorkflowTransitionId } from "@threadsmith/domain";

export interface AcceptanceRoutingOverviewItem {
  label: string;
  value: string;
  detail: string;
  tone: string;
}

export interface AcceptanceGateCard {
  label: string;
  status: string;
  blocker: string;
  missingEvidence: string;
  nextAction: string;
}

export interface SignoffItem {
  label: string;
  summary: string;
  meta: string;
}

export interface WorkflowTransitionAction {
  id: WorkflowTransitionId;
  label: string;
  detail: string;
  role: string;
  tone: string;
}

export interface AcceptanceInspectorProps {
  projectState: ProjectState;
  acceptanceState: AcceptanceState;
  acceptanceAlert: string;
  finalAcceptanceGateStatus: string;
  currentGateLabel: string | null;
  remainingGateCount: number;
  unresolvedChecklistLabels: string[];
  evidenceGapItems: string[];
  acceptanceRoutingOverviewItems: AcceptanceRoutingOverviewItem[];
  acceptanceGateCards: AcceptanceGateCard[];
  signoffItems: SignoffItem[];
  workflowTransitions: WorkflowTransitionAction[];
  applyingTransitionId: WorkflowTransitionId | null;
  transitionError: string | null;
  onApplyWorkflowTransition: (transitionId: WorkflowTransitionId) => void;
}
