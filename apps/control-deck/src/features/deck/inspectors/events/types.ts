import type { LatestPhaseRunModel as PhaseRunModel } from "../../view-models";
import type { WorkflowEvent } from "@threadsmith/domain";

export type LatestPhaseRunModel = PhaseRunModel;

export interface LatestRunPathItem {
  label: string;
  value: string;
}

export interface LatestRunModel {
  tone: string;
  statusLabel: string;
  runId: string | null;
  providerLabel: string | null;
  roleLabel: string | null;
  threadLabel: string | null;
  summary: string;
  truthImpact: string;
  timingLine: string;
  pathItems: LatestRunPathItem[];
}

export interface LatestBridgeModel {
  visible: boolean;
  tone: string;
  statusLabel: string;
  handoffTone: string;
  handoffLabel: string;
  providerLabel: string | null;
  roleLabel: string | null;
  surfaceLabel: string | null;
  headline: string;
  summary: string;
  recordedAtLabel: string;
  handoffDetail: string;
  artifactPath: string | null;
}

export interface SnapshotItem {
  label: string;
  tone: string;
  value: string;
  headline: string;
  meta: string;
}

export interface RecordItem {
  title: string;
  tone: string;
  statusLabel: string;
  headline: string;
  detail: string;
  recordedAtLabel: string;
  sourceLabel: string;
  artifactLabel: string;
  artifactPath: string | null;
}

export interface EventsInspectorProps {
  latestPhaseRunModel: PhaseRunModel;
  latestRunModel: LatestRunModel;
  latestBridgeModel: LatestBridgeModel;
  evidenceSnapshotItems: SnapshotItem[];
  keyRecordItems: RecordItem[];
  continuationTone: string;
  continuationStatusLabel: string;
  continuationKindLabel: string;
  continuationHeadline: string;
  continuationDetail: string;
  continuationFreshnessDetail: string;
  continuationRecordedAt: string | null;
  recentEvents: WorkflowEvent[];
  visibleTimelineCount: number;
  hasMoreTimelineEvents: boolean;
  eventsTimelinePageSize: number;
  onToggleTimeline: () => void;
}
