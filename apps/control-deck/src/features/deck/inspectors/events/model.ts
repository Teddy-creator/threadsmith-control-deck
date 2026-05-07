import type { SupervisorState } from "@threadsmith/runtime";
import {
  type LatestPhaseRunModel,
  formatTruthWritebackStatus,
  pickTruthWritebackTone,
  type LatestBridgeModel,
  type LatestRunModel
} from "../../deckViewModels";
import {
  formatAcceptanceStatus,
  formatVerificationEvidenceStatus
} from "../../../display/labels";
import { formatEventTime } from "../../../events/formatters";
import {
  formatContinuationKind,
  formatContinuationStatus,
  formatEvidenceSource,
  pickAcceptanceTone,
  pickContinuationTone
} from "../shared";
import type { EventsInspectorProps } from "./types";

interface BuildEventsInspectorModelArgs {
  supervisorState: SupervisorState;
  latestPhaseRunModel: LatestPhaseRunModel;
  latestRunModel: LatestRunModel;
  latestBridgeModel: LatestBridgeModel;
  visibleTimelineCount: number;
  hasMoreTimelineEvents: boolean;
  eventsTimelinePageSize: number;
}

export type EventsInspectorModel = Omit<EventsInspectorProps, "onToggleTimeline">;

export function buildEventsInspectorModel(
  args: BuildEventsInspectorModelArgs
): EventsInspectorModel {
  const latestRun = args.supervisorState.latestRun ?? null;
  const continuationTone = pickContinuationTone(
    args.supervisorState.latestContinuationState.freshness,
    args.supervisorState.latestContinuationState.status
  );
  const truthWritebackTone = pickTruthWritebackTone(latestRun);

  return {
    latestPhaseRunModel: args.latestPhaseRunModel,
    latestRunModel: args.latestRunModel,
    latestBridgeModel: args.latestBridgeModel,
    evidenceSnapshotItems: [
      {
        label: "结果写回",
        tone: truthWritebackTone,
        value: formatTruthWritebackStatus(latestRun),
        headline: args.latestRunModel.truthImpact,
        meta: args.latestRunModel.runId
          ? args.latestRunModel.timingLine
          : "等待第一次自动执行"
      },
      {
        label: "验证",
        tone: pickAcceptanceTone(args.supervisorState.latestVerificationEvidence.status),
        value: formatVerificationEvidenceStatus(
          args.supervisorState.latestVerificationEvidence.status
        ),
        headline: args.supervisorState.latestVerificationEvidence.headline,
        meta: `${formatEvidenceSource(args.supervisorState.latestVerificationEvidence.source)} · ${formatEventTime(args.supervisorState.latestVerificationEvidence.recordedAt)}`
      },
      {
        label: "收尾",
        tone: pickAcceptanceTone(args.supervisorState.latestCloseoutRecord.status),
        value: formatAcceptanceStatus(args.supervisorState.latestCloseoutRecord.status),
        headline: args.supervisorState.latestCloseoutRecord.headline,
        meta: `${formatEvidenceSource(args.supervisorState.latestCloseoutRecord.source)} · ${formatEventTime(args.supervisorState.latestCloseoutRecord.recordedAt)}`
      },
      {
        label: "交接",
        tone: continuationTone,
        value: formatContinuationStatus(
          args.supervisorState.latestContinuationState.freshness,
          args.supervisorState.latestContinuationState.status
        ),
        headline: args.supervisorState.latestContinuationState.headline,
        meta: `${formatContinuationKind(args.supervisorState.latestContinuationState.kind)} · ${formatEventTime(args.supervisorState.latestContinuationState.recordedAt)}`
      }
    ],
    keyRecordItems: [
      {
        title: "最新验证证据",
        tone: pickAcceptanceTone(args.supervisorState.latestVerificationEvidence.status),
        statusLabel: formatVerificationEvidenceStatus(
          args.supervisorState.latestVerificationEvidence.status
        ),
        headline: args.supervisorState.latestVerificationEvidence.headline,
        detail: args.supervisorState.latestVerificationEvidence.detail,
        recordedAtLabel: formatEventTime(
          args.supervisorState.latestVerificationEvidence.recordedAt
        ),
        sourceLabel: formatEvidenceSource(args.supervisorState.latestVerificationEvidence.source),
        artifactLabel: "证据文件",
        artifactPath: args.supervisorState.latestVerificationEvidence.artifactPath
      },
      {
        title: "最新收尾记录",
        tone: pickAcceptanceTone(args.supervisorState.latestCloseoutRecord.status),
        statusLabel: formatAcceptanceStatus(args.supervisorState.latestCloseoutRecord.status),
        headline: args.supervisorState.latestCloseoutRecord.headline,
        detail: args.supervisorState.latestCloseoutRecord.detail,
        recordedAtLabel: formatEventTime(args.supervisorState.latestCloseoutRecord.recordedAt),
        sourceLabel: formatEvidenceSource(args.supervisorState.latestCloseoutRecord.source),
        artifactLabel: "收尾文件",
        artifactPath: args.supervisorState.latestCloseoutRecord.artifactPath
      }
    ],
    continuationTone,
    continuationStatusLabel: formatContinuationStatus(
      args.supervisorState.latestContinuationState.freshness,
      args.supervisorState.latestContinuationState.status
    ),
    continuationKindLabel: formatContinuationKind(
      args.supervisorState.latestContinuationState.kind
    ),
    continuationHeadline: args.supervisorState.latestContinuationState.headline,
    continuationDetail: args.supervisorState.latestContinuationState.detail,
    continuationFreshnessDetail:
      args.supervisorState.latestContinuationState.freshnessDetail
      ?? "当前还没有可判断的新鲜度。",
    continuationRecordedAt: args.supervisorState.latestContinuationState.recordedAt,
    recentEvents: args.supervisorState.recentEvents,
    visibleTimelineCount: args.visibleTimelineCount,
    hasMoreTimelineEvents: args.hasMoreTimelineEvents,
    eventsTimelinePageSize: args.eventsTimelinePageSize
  };
}
