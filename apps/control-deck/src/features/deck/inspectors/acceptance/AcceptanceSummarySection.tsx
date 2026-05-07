import { Shield } from "lucide-react";
import type { AcceptanceState, ProjectState } from "@threadsmith/domain";
import { pill } from "../shared";
import {
  formatHomepageAcceptanceItemStatus,
  pickHomepageAcceptanceItemTone
} from "../../view-models/acceptance";

interface AcceptanceSummarySectionProps {
  projectState: ProjectState;
  acceptanceState: AcceptanceState;
  acceptanceAlert: string;
  finalAcceptanceGateStatus: string;
  currentGateLabel: string | null;
  remainingGateCount: number;
}

export function AcceptanceSummarySection({
  projectState,
  acceptanceState,
  acceptanceAlert,
  finalAcceptanceGateStatus,
  currentGateLabel,
  remainingGateCount
}: AcceptanceSummarySectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="h-4.5 w-4.5 text-emerald-400" />
        <h3 className="text-base text-zinc-100">当前判定</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {pill(
            pickHomepageAcceptanceItemTone(finalAcceptanceGateStatus),
            formatHomepageAcceptanceItemStatus(finalAcceptanceGateStatus)
          )}
          {pill("blue", currentGateLabel ? `卡在 ${currentGateLabel}` : "四道门已全部通过")}
        </div>
        <div className="text-sm leading-6 text-zinc-100">{acceptanceState.currentClaim}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-zinc-500">当前提醒</div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">{acceptanceAlert}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">距离 accepted</div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">
              {remainingGateCount === 0 ? "当前已 accepted" : `还差 ${remainingGateCount} 门`}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">检查项进度</div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">
              {
                projectState.acceptanceState.doneWhenChecklist.filter((item) =>
                  ["accepted", "passed", "done", "pass"].includes(item.status)
                ).length
              }
              /{projectState.acceptanceState.doneWhenChecklist.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
