import { Activity, Users } from "lucide-react";
import { pill, purpleMetaTagClass } from "./shared";
import type { CollaborationModel } from "./types";

interface CollaborationCardProps {
  collaboration: CollaborationModel;
  collaborationSignalsClassName: string;
}

export function CollaborationCard({
  collaboration,
  collaborationSignalsClassName
}: CollaborationCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700/60">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-purple-400" />
          <h3 className="text-base text-zinc-100">协作现场</h3>
        </div>
        <div
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs ${collaboration.state.className}`}
        >
          {collaboration.state.label}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/20 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">自动链路</div>
            {pill(collaboration.phaseRun.tone, collaboration.phaseRun.statusLabel)}
          </div>
          {collaboration.phaseRun.roleLabel || collaboration.phaseRun.threadLabel ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {collaboration.phaseRun.roleLabel ? (
                <span className={purpleMetaTagClass}>
                  {collaboration.phaseRun.roleLabel}
                </span>
              ) : null}
              {collaboration.phaseRun.threadLabel ? (
                <span className={purpleMetaTagClass}>
                  {collaboration.phaseRun.threadLabel}
                </span>
              ) : null}
              {collaboration.phaseRun.repairLabel ? (
                <span className={purpleMetaTagClass}>
                  {collaboration.phaseRun.repairLabel}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="text-sm leading-6 text-zinc-200">{collaboration.phaseRun.summary}</div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-zinc-500">
            <span>{collaboration.phaseRun.truthImpact}</span>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-zinc-800/70 bg-zinc-950/20 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">最新角色运行</div>
            {pill(collaboration.latestRun.tone, collaboration.latestRun.statusLabel)}
          </div>
          {collaboration.latestRun.providerLabel &&
          collaboration.latestRun.roleLabel &&
          collaboration.latestRun.threadLabel ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <span className={purpleMetaTagClass}>
                {collaboration.latestRun.providerLabel}
              </span>
              <span className={purpleMetaTagClass}>
                {collaboration.latestRun.roleLabel}
              </span>
              <span className={purpleMetaTagClass}>
                {collaboration.latestRun.threadLabel}
              </span>
            </div>
          ) : null}
          <div className="text-sm leading-6 text-zinc-200">{collaboration.latestRun.summary}</div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-zinc-500">
            <span>{collaboration.latestRun.timingLine}</span>
            <span>回流：{collaboration.latestRun.truthImpact}</span>
          </div>
        </div>
        {collaboration.latestBridge.visible ? (
          <div className="mt-3 rounded-lg border border-zinc-800/70 bg-zinc-950/20 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-500">最新桥接</div>
              {pill(collaboration.latestBridge.tone, collaboration.latestBridge.statusLabel)}
            </div>
            {collaboration.latestBridge.providerLabel &&
            collaboration.latestBridge.roleLabel &&
            collaboration.latestBridge.surfaceLabel ? (
              <div className="mb-3 flex flex-wrap gap-2">
                <span className={purpleMetaTagClass}>
                  {collaboration.latestBridge.providerLabel}
                </span>
                <span className={purpleMetaTagClass}>
                  {collaboration.latestBridge.roleLabel}
                </span>
                <span className={purpleMetaTagClass}>
                  {collaboration.latestBridge.surfaceLabel}
                </span>
              </div>
            ) : null}
            <div className="text-sm leading-6 text-zinc-200">{collaboration.latestBridge.summary}</div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-zinc-500">
              <span>记录：{collaboration.latestBridge.recordedAtLabel}</span>
              <span>交接：{collaboration.latestBridge.handoffLabel}</span>
            </div>
          </div>
        ) : null}
        <div className={`mt-4 ${collaborationSignalsClassName}`}>
          {collaboration.signals.map((item) => (
            <div key={item.label} className={`rounded-lg border p-3 ${item.className}`}>
              <div className="mb-1 text-xs text-zinc-500">{item.label}</div>
              <div className="text-sm">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex-1 space-y-3.5">
          {collaboration.items.map((item) => (
            <div
              key={`${item.roleLabel}-${item.threadLabel}-${item.taskSummary}`}
              className="rounded-lg border border-zinc-800/70 bg-zinc-950/20 p-3"
            >
              <div className="flex items-start gap-3">
                <Users className="mt-1 h-4 w-4 shrink-0 text-purple-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className={purpleMetaTagClass}>
                      {item.roleLabel}
                    </span>
                    <span className={purpleMetaTagClass}>
                      {item.threadLabel}
                    </span>
                    <span className={purpleMetaTagClass}>
                      {item.assignmentLabel}
                    </span>
                    <span className={purpleMetaTagClass}>
                      {item.statusLabel}
                    </span>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-zinc-300">{item.taskSummary}</div>
                </div>
              </div>
            </div>
          ))}
          {collaboration.hiddenCount > 0 ? (
            <div className="text-right text-xs text-zinc-500">更多协作线见详情</div>
          ) : null}
        </div>
        <div className="mt-4 border-t border-zinc-800/70 pt-3">
          <div className="mb-2 text-xs text-zinc-500">现场提醒</div>
          <div className="text-xs leading-5 text-purple-300/90">{collaboration.alert}</div>
        </div>
      </div>
    </article>
  );
}
