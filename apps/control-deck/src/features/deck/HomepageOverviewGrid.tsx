import {
  AcceptanceCard,
  CollaborationCard,
  DecisionCard,
  ProjectMapCard
} from "./homepage-overview";
import type { HomepageOverviewGridProps } from "./homepage-overview";

export type { HomepageOverviewGridProps } from "./homepage-overview";

export function HomepageOverviewGrid({
  roadmapVersion,
  roadmapProgressLabel,
  projectStateLabel,
  visibleMilestones,
  latestDone,
  currentMilestone,
  nextMilestone,
  goal,
  collaboration,
  collaborationSignalsClassName,
  decisionSummary,
  decisionStateLabel,
  decisionSignals,
  decisionAlert,
  acceptanceItems,
  acceptanceAlert
}: HomepageOverviewGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <ProjectMapCard
        roadmapVersion={roadmapVersion}
        roadmapProgressLabel={roadmapProgressLabel}
        projectStateLabel={projectStateLabel}
        visibleMilestones={visibleMilestones}
        latestDone={latestDone}
        currentMilestone={currentMilestone}
        nextMilestone={nextMilestone}
        goal={goal}
      />

      <CollaborationCard
        collaboration={collaboration}
        collaborationSignalsClassName={collaborationSignalsClassName}
      />

      <DecisionCard
        decisionSummary={decisionSummary}
        decisionStateLabel={decisionStateLabel}
        decisionSignals={decisionSignals}
        decisionAlert={decisionAlert}
      />

      <AcceptanceCard
        acceptanceItems={acceptanceItems}
        acceptanceAlert={acceptanceAlert}
      />
    </div>
  );
}
