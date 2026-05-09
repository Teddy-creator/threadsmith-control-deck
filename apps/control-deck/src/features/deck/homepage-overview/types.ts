export type Tone = "green" | "amber" | "red" | "blue" | "zinc";
type MilestoneState = "done" | "current" | "next" | "later";
type AcceptanceStatus = "pass" | "running" | "pending" | "failed";

export interface RoadmapMilestone {
  id: string;
  label: string;
  title: string;
  state: MilestoneState;
}

export interface CollaborationRunSummary {
  tone: Tone;
  statusLabel: string;
  providerLabel: string | null;
  roleLabel: string | null;
  threadLabel: string | null;
  summary: string;
  timingLine: string;
  truthImpact: string;
}

export interface CollaborationBridgeSummary {
  visible: boolean;
  tone: Tone;
  statusLabel: string;
  providerLabel: string | null;
  roleLabel: string | null;
  surfaceLabel: string | null;
  summary: string;
  recordedAtLabel: string;
  handoffLabel: string;
}

export interface CollaborationSignal {
  label: string;
  value: string;
  className: string;
}

export interface CollaborationItem {
  roleLabel: string;
  threadLabel: string;
  assignmentLabel: string;
  statusLabel: string;
  taskSummary: string;
}

export interface CollaborationModel {
  state: {
    className: string;
    label: string;
  };
  phaseRun: CollaborationRunSummary;
  latestRun: CollaborationRunSummary;
  latestBridge: CollaborationBridgeSummary;
  signals: CollaborationSignal[];
  items: CollaborationItem[];
  hiddenCount: number;
  alert: string;
}

export interface DecisionSignal {
  label: string;
  value: string;
  tone: Tone;
}

export interface ContextSignal {
  label: string;
  value: string;
  tone: Tone;
}

export interface ContextModel {
  visible: boolean;
  label: string;
  tone: Tone;
  summary: string;
  signals: ContextSignal[];
}

export interface AcceptanceItem {
  label: string;
  status: AcceptanceStatus;
}

export interface HomepageOverviewGridProps {
  roadmapVersion: string;
  roadmapProgressLabel: string;
  projectStateLabel: string;
  visibleMilestones: RoadmapMilestone[];
  latestDone: string;
  currentMilestone: string;
  nextMilestone: string;
  goal: string;
  collaboration: CollaborationModel;
  collaborationSignalsClassName: string;
  decisionSummary: string;
  decisionStateLabel: string;
  decisionSignals: DecisionSignal[];
  decisionAlert: string;
  context: ContextModel;
  acceptanceItems: AcceptanceItem[];
  acceptanceAlert: string;
}
