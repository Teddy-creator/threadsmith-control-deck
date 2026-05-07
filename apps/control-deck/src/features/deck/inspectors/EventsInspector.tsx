import {
  EventsContinuationSection,
  EventsInspectorHeader,
  EventsLatestBridgeSection,
  EventsPhaseRunSection,
  EventsLatestRunSection,
  EventsRecordsSection,
  EventsSnapshotSection,
  EventsTimelineSection
} from "./events";
import type { EventsInspectorProps } from "./events";

export type { EventsInspectorProps } from "./events";

export function EventsInspector({
  latestPhaseRunModel,
  latestRunModel,
  latestBridgeModel,
  evidenceSnapshotItems,
  keyRecordItems,
  continuationTone,
  continuationStatusLabel,
  continuationKindLabel,
  continuationHeadline,
  continuationDetail,
  continuationFreshnessDetail,
  continuationRecordedAt,
  recentEvents,
  visibleTimelineCount,
  hasMoreTimelineEvents,
  eventsTimelinePageSize,
  onToggleTimeline
}: EventsInspectorProps) {
  return (
    <div className="space-y-8">
      <EventsInspectorHeader />

      <EventsPhaseRunSection latestPhaseRunModel={latestPhaseRunModel} />

      <EventsLatestRunSection latestRunModel={latestRunModel} />

      <EventsLatestBridgeSection latestBridgeModel={latestBridgeModel} />

      <EventsSnapshotSection evidenceSnapshotItems={evidenceSnapshotItems} />

      <EventsRecordsSection keyRecordItems={keyRecordItems} />

      <EventsContinuationSection
        continuationTone={continuationTone}
        continuationStatusLabel={continuationStatusLabel}
        continuationKindLabel={continuationKindLabel}
        continuationHeadline={continuationHeadline}
        continuationDetail={continuationDetail}
        continuationFreshnessDetail={continuationFreshnessDetail}
        continuationRecordedAt={continuationRecordedAt}
      />

      <EventsTimelineSection
        recentEvents={recentEvents}
        visibleTimelineCount={visibleTimelineCount}
        hasMoreTimelineEvents={hasMoreTimelineEvents}
        eventsTimelinePageSize={eventsTimelinePageSize}
        onToggleTimeline={onToggleTimeline}
      />
    </div>
  );
}
