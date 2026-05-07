import { BarChart3 } from "lucide-react";
import type { WorkflowEvent } from "@threadsmith/domain";
import { formatRole } from "../../../display/labels";
import { formatEventTime } from "../../../events/formatters";
import { formatProviderLabel } from "../../view-models/shared";
import { cyanMetaTagClass, formatWorkflowEventKind } from "../shared";

interface EventsTimelineSectionProps {
  recentEvents: WorkflowEvent[];
  visibleTimelineCount: number;
  hasMoreTimelineEvents: boolean;
  eventsTimelinePageSize: number;
  onToggleTimeline: () => void;
}

export function EventsTimelineSection({
  recentEvents,
  visibleTimelineCount,
  hasMoreTimelineEvents,
  eventsTimelinePageSize,
  onToggleTimeline
}: EventsTimelineSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">事件时间线</h3>
      </div>
      <div className="space-y-3">
        {recentEvents.length > 0 ? (
          recentEvents.slice(0, visibleTimelineCount).map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-sm text-zinc-200">{event.title}</div>
                    <div className="text-xs text-zinc-500">
                      {formatEventTime(event.createdAt)}
                    </div>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className={cyanMetaTagClass}>
                      {formatWorkflowEventKind(event.kind)}
                    </span>
                    {event.role ? (
                      <span className={cyanMetaTagClass}>
                        {formatRole(event.role)}
                      </span>
                    ) : null}
                    {event.provider ? (
                      <span className={cyanMetaTagClass}>
                        {formatProviderLabel(event.provider)}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-sm leading-6 text-zinc-400">{event.detail}</div>
                  {event.artifactPath ? (
                    <div className="mt-3 break-all font-mono text-xs leading-5 text-zinc-500">
                      {event.artifactPath}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 text-sm text-zinc-500">
            当前还没有最近事件。
          </div>
        )}
        {recentEvents.length > eventsTimelinePageSize ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-4 py-3">
            <div className="text-xs text-zinc-500">
              已显示 {visibleTimelineCount} / {recentEvents.length} 条
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-zinc-600 hover:text-zinc-50"
              onClick={onToggleTimeline}
            >
              {hasMoreTimelineEvents ? "展开更多" : `收起到最近 ${eventsTimelinePageSize} 条`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
