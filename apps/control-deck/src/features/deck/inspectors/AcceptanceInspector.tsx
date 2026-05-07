import {
  AcceptanceGapsSection,
  AcceptanceGatesSection,
  AcceptanceInspectorHeader,
  AcceptanceManualTransitionsSection,
  AcceptanceRoutingSection,
  AcceptanceSignoffSection,
  AcceptanceSummarySection
} from "./acceptance";
import type { AcceptanceInspectorProps } from "./acceptance";

export type { AcceptanceInspectorProps } from "./acceptance";

export function AcceptanceInspector({
  projectState,
  acceptanceState,
  acceptanceAlert,
  finalAcceptanceGateStatus,
  currentGateLabel,
  remainingGateCount,
  unresolvedChecklistLabels,
  evidenceGapItems,
  acceptanceRoutingOverviewItems,
  acceptanceGateCards,
  signoffItems,
  workflowTransitions,
  applyingTransitionId,
  transitionError,
  onApplyWorkflowTransition
}: AcceptanceInspectorProps) {
  return (
    <div className="space-y-8">
      <AcceptanceInspectorHeader currentClaim={projectState.acceptanceState.currentClaim} />

      <AcceptanceSummarySection
        projectState={projectState}
        acceptanceState={acceptanceState}
        acceptanceAlert={acceptanceAlert}
        finalAcceptanceGateStatus={finalAcceptanceGateStatus}
        currentGateLabel={currentGateLabel}
        remainingGateCount={remainingGateCount}
      />

      <AcceptanceRoutingSection
        acceptanceRoutingOverviewItems={acceptanceRoutingOverviewItems}
      />

      <AcceptanceGapsSection
        acceptanceState={acceptanceState}
        unresolvedChecklistLabels={unresolvedChecklistLabels}
        evidenceGapItems={evidenceGapItems}
      />

      <AcceptanceGatesSection acceptanceGateCards={acceptanceGateCards} />

      <AcceptanceSignoffSection signoffItems={signoffItems} />

      <AcceptanceManualTransitionsSection
        workflowTransitions={workflowTransitions}
        applyingTransitionId={applyingTransitionId}
        transitionError={transitionError}
        onApplyWorkflowTransition={onApplyWorkflowTransition}
      />
    </div>
  );
}
