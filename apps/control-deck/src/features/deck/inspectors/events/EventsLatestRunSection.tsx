import { Zap } from "lucide-react";
import { cyanMetaTagClass, pill } from "../shared";
import type { LatestRunModel } from "./types";

interface EventsLatestRunSectionProps {
  latestRunModel: LatestRunModel;
}

export function EventsLatestRunSection({
  latestRunModel
}: EventsLatestRunSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Zap className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">最新角色运行</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {pill(latestRunModel.tone, latestRunModel.statusLabel)}
          {latestRunModel.runId ? (
            <div className="text-xs text-zinc-500">运行 ID · {latestRunModel.runId}</div>
          ) : null}
        </div>
        {latestRunModel.providerLabel &&
        latestRunModel.roleLabel &&
        latestRunModel.threadLabel ? (
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={cyanMetaTagClass}>
              {latestRunModel.providerLabel}
            </span>
            <span className={cyanMetaTagClass}>
              {latestRunModel.roleLabel}
            </span>
            <span className={cyanMetaTagClass}>
              {latestRunModel.threadLabel}
            </span>
          </div>
        ) : null}
        <div className="text-sm leading-6 text-zinc-100">{latestRunModel.summary}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">结果写回</div>
            <div className="mt-1 text-sm leading-6 text-zinc-400">
              {latestRunModel.truthImpact}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">本次时间线</div>
            <div className="mt-1 text-sm leading-6 text-zinc-400">
              {latestRunModel.timingLine}
            </div>
          </div>
        </div>
        {latestRunModel.pathItems.length > 0 ? (
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <div className="mb-3 text-xs text-zinc-500">相关产物</div>
            <div className="grid gap-3">
              {latestRunModel.pathItems.map((item) => (
                <div key={`${item.label}-${item.value}`}>
                  <div className="text-xs text-zinc-500">{item.label}</div>
                  <div className="break-all font-mono text-sm leading-6 text-zinc-300">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
