import type { ProviderRouting, ProjectState } from "@threadsmith/domain";

export type ProviderRoutingRole = "planner" | "executor" | "reviewer" | "verifier" | "closeout";

export interface DefinitionSection {
  label: string;
  items: string[];
  empty: string;
}

export interface RoadmapMilestone {
  id: string;
  label: string;
  title: string;
  summary: string;
  state: "done" | "current" | "next" | "blocked" | "later";
}

export interface RoutingOverviewItem {
  label: string;
  value: string;
  detail: string;
  tone: string;
}

export interface RoleRoutingCard {
  role: ProviderRoutingRole;
  roleLabel: string;
  threadLabel: string;
  providerLabel: string;
  modeTone: string;
  modeLabel: string;
  summary: string;
  surfaceLabel: string;
}

export interface ProviderRoutingStatusBadge {
  label: string;
  className: string;
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface ProjectInspectorProps {
  projectState: ProjectState;
  projectSummary: string | null | undefined;
  headline: string;
  projectOverallStateTone: string;
  projectOverallStateLabel: string;
  priorityPreview: string[];
  definitionSections: DefinitionSection[];
  homepageRoadmapVersion: string;
  homepageRoadmapProgressLabel: string;
  homepageRoadmapGoal: string;
  homepageRoadmapLatestDone: string;
  homepageRoadmapCurrent: string;
  homepageRoadmapNext: string;
  homepageRoadmapMilestones: RoadmapMilestone[];
  editableProviderRouting: ProviderRouting;
  routingModeLabel: string;
  providerRoutingStatusBadge: ProviderRoutingStatusBadge;
  routingOverviewItems: RoutingOverviewItem[];
  structureItems: RoleRoutingCard[];
  currentSourceIsAppHome: boolean;
  providerRoutingStatusDetail: string;
  routingSupportSummaryText: string;
  providerRoutingSaveState: "idle" | "saving" | "failed";
  routingSelectClassName: string;
  conductorSurfaceOptions: Array<SelectOption<ProviderRouting["conductorSurface"]>>;
  providerOptions: Array<SelectOption<ProviderRouting["planner"]>>;
  saveRoutingDisabled: boolean;
  resetRoutingDisabled: boolean;
  onUpdateConductorSurface: (value: ProviderRouting["conductorSurface"]) => void;
  onUpdateProviderRoutingRole: (
    role: ProviderRoutingRole,
    value: ProviderRouting["planner"]
  ) => void;
  onSaveProviderRouting: () => void;
  onResetProviderRouting: () => void;
}
