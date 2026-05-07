import {
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
  phaseBoundarySections,
  phaseRoutingOverviewItems,
  phaseParticipants,
  acceptanceProgressLabel,
  lockedPhasePath,
  resumeHint
}: ObjectsInspectorProps) {
  return (
    <div className="space-y-8">
      <ObjectsInspectorHeader phaseGoal={projectState.currentPhase.phaseGoal} />

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
