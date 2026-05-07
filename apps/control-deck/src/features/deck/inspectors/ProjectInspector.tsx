import {
  ProjectDefinitionSection,
  ProjectInspectorHeader,
  ProjectRoadmapSection,
  ProjectRoutingSection
} from "./project";
import type { ProjectInspectorProps } from "./project";

export type { ProjectInspectorProps } from "./project";

export function ProjectInspector({
  projectState,
  projectSummary,
  headline,
  projectOverallStateTone,
  projectOverallStateLabel,
  priorityPreview,
  definitionSections,
  homepageRoadmapVersion,
  homepageRoadmapProgressLabel,
  homepageRoadmapGoal,
  homepageRoadmapLatestDone,
  homepageRoadmapCurrent,
  homepageRoadmapNext,
  homepageRoadmapMilestones,
  editableProviderRouting,
  routingModeLabel,
  providerRoutingStatusBadge,
  routingOverviewItems,
  structureItems,
  currentSourceIsAppHome,
  providerRoutingStatusDetail,
  routingSupportSummaryText,
  providerRoutingSaveState,
  routingSelectClassName,
  conductorSurfaceOptions,
  providerOptions,
  saveRoutingDisabled,
  resetRoutingDisabled,
  onUpdateConductorSurface,
  onUpdateProviderRoutingRole,
  onSaveProviderRouting,
  onResetProviderRouting
}: ProjectInspectorProps) {
  return (
    <div className="space-y-8">
      <ProjectInspectorHeader projectSummary={projectSummary} headline={headline} />

      <ProjectDefinitionSection
        projectState={projectState}
        projectOverallStateTone={projectOverallStateTone}
        projectOverallStateLabel={projectOverallStateLabel}
        priorityPreview={priorityPreview}
        definitionSections={definitionSections}
      />

      <ProjectRoadmapSection
        homepageRoadmapVersion={homepageRoadmapVersion}
        homepageRoadmapProgressLabel={homepageRoadmapProgressLabel}
        homepageRoadmapGoal={homepageRoadmapGoal}
        homepageRoadmapLatestDone={homepageRoadmapLatestDone}
        homepageRoadmapCurrent={homepageRoadmapCurrent}
        homepageRoadmapNext={homepageRoadmapNext}
        homepageRoadmapMilestones={homepageRoadmapMilestones}
      />

      <ProjectRoutingSection
        editableProviderRouting={editableProviderRouting}
        routingModeLabel={routingModeLabel}
        providerRoutingStatusBadge={providerRoutingStatusBadge}
        routingOverviewItems={routingOverviewItems}
        structureItems={structureItems}
        currentSourceIsAppHome={currentSourceIsAppHome}
        providerRoutingStatusDetail={providerRoutingStatusDetail}
        routingSupportSummaryText={routingSupportSummaryText}
        providerRoutingSaveState={providerRoutingSaveState}
        routingSelectClassName={routingSelectClassName}
        conductorSurfaceOptions={conductorSurfaceOptions}
        providerOptions={providerOptions}
        saveRoutingDisabled={saveRoutingDisabled}
        resetRoutingDisabled={resetRoutingDisabled}
        onUpdateConductorSurface={onUpdateConductorSurface}
        onUpdateProviderRoutingRole={onUpdateProviderRoutingRole}
        onSaveProviderRouting={onSaveProviderRouting}
        onResetProviderRouting={onResetProviderRouting}
      />
    </div>
  );
}
