import { Users } from "lucide-react";
import { purpleMetaTagClass } from "../shared";
import type { PhaseParticipantCard } from "./types";

interface PhaseParticipantsSectionProps {
  phaseParticipants: PhaseParticipantCard[];
}

export function PhaseParticipantsSection({
  phaseParticipants
}: PhaseParticipantsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-4.5 w-4.5 text-purple-400" />
        <h3 className="text-base text-zinc-100">角色归属</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-sm leading-6 text-zinc-300">
            这里展示当前 phase contract 约定参与的角色。真实线程显示当前实际 provider，逻辑角色显示默认路由 provider。
          </div>
        </div>
        {phaseParticipants.map((item) => (
          <div
            key={`${item.roleLabel}-${item.threadLabel}`}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <Users className="h-4 w-4 shrink-0 text-purple-400" />
              <span className={purpleMetaTagClass}>
                {item.roleLabel}
              </span>
              <span className={purpleMetaTagClass}>
                {item.threadLabel}
              </span>
              <span className={purpleMetaTagClass}>
                {item.providerLabel}
              </span>
              <span className={purpleMetaTagClass}>
                {item.assignmentLabel}
              </span>
              <span className={purpleMetaTagClass}>
                {item.statusLabel}
              </span>
            </div>
            <div className="pl-6 text-sm leading-6 text-zinc-300">{item.taskSummary}</div>
            <div className="pl-6 pt-2 text-xs leading-5 text-zinc-500">{item.routeHint}</div>
            {item.latestEvidenceLabel ? (
              <div className="pl-6 pt-2 text-xs text-zinc-500">
                最近证据：{item.latestEvidenceLabel}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
