import { Activity } from "lucide-react";
import { cyanMetaTagClass, pill } from "../shared";
import type { LatestPhaseRunModel } from "../../view-models";

interface EventsPhaseRunSectionProps {
  latestPhaseRunModel: LatestPhaseRunModel;
}

export function EventsPhaseRunSection({
  latestPhaseRunModel
}: EventsPhaseRunSectionProps) {
  if (!latestPhaseRunModel.exists) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Activity className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">自动链路</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {pill(latestPhaseRunModel.tone, latestPhaseRunModel.statusLabel)}
          {latestPhaseRunModel.phaseRunId ? (
            <div className="text-xs text-zinc-500">
              Phase run · {latestPhaseRunModel.phaseRunId}
            </div>
          ) : null}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {latestPhaseRunModel.roleLabel ? (
            <span className={cyanMetaTagClass}>
              {latestPhaseRunModel.roleLabel}
            </span>
          ) : null}
          {latestPhaseRunModel.sliceLabel ? (
            <span className={cyanMetaTagClass}>
              {latestPhaseRunModel.sliceLabel}
            </span>
          ) : null}
          {latestPhaseRunModel.repairLabel ? (
            <span className={cyanMetaTagClass}>
              {latestPhaseRunModel.repairLabel}
            </span>
          ) : null}
        </div>
        <div className="text-sm leading-6 text-zinc-100">{latestPhaseRunModel.headline}</div>
        <div className="mt-2 text-sm leading-6 text-zinc-400">{latestPhaseRunModel.summary}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">当前处理</div>
            <div className="mt-1 text-sm leading-6 text-zinc-400">
              {latestPhaseRunModel.operatorStateLabel} · {latestPhaseRunModel.operatorHeadline}
            </div>
            <div className="mt-1 text-sm leading-6 text-zinc-500">
              {latestPhaseRunModel.operatorDetail}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">最近成功角色</div>
            <div className="mt-1 text-sm leading-6 text-zinc-400">
              {latestPhaseRunModel.latestSuccessfulRoleLabel ?? "尚未记录"}
            </div>
            <div className="mt-1 text-sm leading-6 text-zinc-500">
              {latestPhaseRunModel.sliceLabel && latestPhaseRunModel.repairLabel
                ? `${latestPhaseRunModel.sliceLabel} · ${latestPhaseRunModel.repairLabel}`
                : latestPhaseRunModel.timingLine}
            </div>
          </div>
        </div>
        {latestPhaseRunModel.pauseHeadline || latestPhaseRunModel.resumeHint ? (
          <div className="mt-4 grid gap-4 border-t border-zinc-800/60 pt-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-500">暂停与恢复</div>
              <div className="mt-1 text-sm leading-6 text-zinc-200">
                {latestPhaseRunModel.pauseHeadline ?? "当前没有暂停记录。"}
              </div>
              {latestPhaseRunModel.pauseDetail ? (
                <div className="mt-2 text-sm leading-6 text-zinc-400">
                  {latestPhaseRunModel.pauseDetail}
                </div>
              ) : null}
              {latestPhaseRunModel.pauseRequirements.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {latestPhaseRunModel.pauseRequirements.map((item) => (
                    <div key={item} className="text-sm leading-6 text-zinc-400">
                      · {item}
                    </div>
                  ))}
                </div>
              ) : null}
              {latestPhaseRunModel.resumeHint ? (
                <div className="mt-3">
                  <div className="text-xs text-zinc-500">显式 continue</div>
                  <div className="mt-1 break-all font-mono text-sm leading-6 text-zinc-300">
                    {latestPhaseRunModel.resumeHint}
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs text-zinc-500">Locked phase 快照</div>
              <div className="mt-1 break-all font-mono text-sm leading-6 text-zinc-300">
                {latestPhaseRunModel.lockedPhasePath ?? "当前还没有 locked snapshot。"}
              </div>
              {latestPhaseRunModel.workspacePath ? (
                <>
                  <div className="mt-3 text-xs text-zinc-500">运行工作目录</div>
                  <div className="mt-1 break-all font-mono text-sm leading-6 text-zinc-300">
                    {latestPhaseRunModel.workspacePath}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
