import {
  ContextRecoverySection,
  ObjectsInspectorHeader,
  PhaseContractSection,
  PhaseExitSection,
  PhaseParticipantsSection,
  PhaseRoutingSection,
  PhaseSliceSection
} from "./objects";
import type { ObjectsInspectorProps } from "./objects";

export type { ObjectsInspectorProps } from "./objects";

export function ObjectsInspector({
  projectState,
  phaseCurrentSlice,
  contextRecovery,
  phaseBoundarySections,
  phaseRoutingOverviewItems,
  phaseParticipants,
  acceptanceProgressLabel,
  lockedPhasePath,
  resumeHint,
  onOpenContextAction
}: ObjectsInspectorProps) {
  return (
    <div className="space-y-8">
      <ObjectsInspectorHeader phaseGoal={projectState.currentPhase.phaseGoal} />

      <ContextRecoverySection
        contextRecovery={contextRecovery}
        onOpenContextAction={onOpenContextAction}
      />

      <PhaseContractSection
        projectState={projectState}
        phaseCurrentSlice={phaseCurrentSlice}
        lockedPhasePath={lockedPhasePath}
        resumeHint={resumeHint}
      />

      <PhaseRoutingSection phaseRoutingOverviewItems={phaseRoutingOverviewItems} />

      <PhaseSliceSection phaseBoundarySections={phaseBoundarySections} />

      <PhaseExitSection
        projectState={projectState}
        acceptanceProgressLabel={acceptanceProgressLabel}
      />

      <PhaseParticipantsSection phaseParticipants={phaseParticipants} />
    </div>
  );
}
