import { CheckCircle2 } from "lucide-react";
import type { ProjectState } from "@threadsmith/domain";
import { formatDoneWhenStatus } from "../../../display/labels";
import { pill, pickAcceptanceTone } from "../shared";

interface PhaseExitSectionProps {
  projectState: ProjectState;
  acceptanceProgressLabel: string;
}

export function PhaseExitSection({
  projectState,
  acceptanceProgressLabel
}: PhaseExitSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">阶段出口</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-500">阶段完成标志</div>
          <div className="mt-2 text-sm leading-6 text-zinc-300">
            {projectState.currentPhase.stopCondition}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-xs text-zinc-500">本阶段验证重点</div>
          <div className="mt-2 space-y-2">
            {(projectState.currentPhase.verificationForThisPhase.length > 0
              ? projectState.currentPhase.verificationForThisPhase
              : ["当前没有记录阶段验证重点。"])
              .slice(0, 3)
              .map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" />
                  <div className="text-sm leading-6 text-zinc-300">{item}</div>
                </div>
              ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">Done when 进度</div>
            <div className="text-sm text-zinc-200">{acceptanceProgressLabel}</div>
          </div>
          <div className="mt-3 space-y-3">
            {projectState.acceptanceState.doneWhenChecklist.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" />
                  <div className="text-sm leading-6 text-zinc-300">{item.label}</div>
                </div>
                {pill(pickAcceptanceTone(item.status), formatDoneWhenStatus(item.status))}
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <div className="mb-1 text-xs text-zinc-500">当前缺口</div>
            <div className="text-sm leading-6 text-zinc-400">
              {projectState.acceptanceState.knownGaps[0] ?? "当前没有记录缺口。"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
