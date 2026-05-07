import { Zap } from "lucide-react";
import { cyanMetaTagClass, pill } from "../shared";
import type { LatestBridgeModel } from "./types";

interface EventsLatestBridgeSectionProps {
  latestBridgeModel: LatestBridgeModel;
}

export function EventsLatestBridgeSection({
  latestBridgeModel
}: EventsLatestBridgeSectionProps) {
  if (!latestBridgeModel.visible) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Zap className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">最新桥接</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {pill(latestBridgeModel.tone, latestBridgeModel.statusLabel)}
          {pill(latestBridgeModel.handoffTone, latestBridgeModel.handoffLabel)}
        </div>
        {latestBridgeModel.providerLabel &&
        latestBridgeModel.roleLabel &&
        latestBridgeModel.surfaceLabel ? (
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={cyanMetaTagClass}>
              {latestBridgeModel.providerLabel}
            </span>
            <span className={cyanMetaTagClass}>
              {latestBridgeModel.roleLabel}
            </span>
            <span className={cyanMetaTagClass}>
              {latestBridgeModel.surfaceLabel}
            </span>
          </div>
        ) : null}
        <div className="text-sm leading-6 text-zinc-100">{latestBridgeModel.headline}</div>
        <div className="mt-2 text-sm leading-6 text-zinc-400">{latestBridgeModel.summary}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">最近记录</div>
            <div className="mt-1 text-sm leading-6 text-zinc-400">
              {latestBridgeModel.recordedAtLabel}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">交接状态</div>
            <div className="mt-1 text-sm leading-6 text-zinc-400">
              {latestBridgeModel.handoffDetail}
            </div>
          </div>
        </div>
        {latestBridgeModel.artifactPath ? (
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <div className="mb-1 text-xs text-zinc-500">桥接产物</div>
            <div className="break-all font-mono text-sm leading-6 text-zinc-300">
              {latestBridgeModel.artifactPath}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
