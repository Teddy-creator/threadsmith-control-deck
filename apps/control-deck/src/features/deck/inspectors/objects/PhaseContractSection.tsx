import { FolderKanban } from "lucide-react";
import type { ProjectState } from "@threadsmith/domain";
import { formatAcceptanceStatus } from "../../../display/labels";
import { pill, pickAcceptanceTone } from "../shared";

interface PhaseContractSectionProps {
  projectState: ProjectState;
  phaseCurrentSlice: string;
  lockedPhasePath: string | null;
  resumeHint: string | null;
}

export function PhaseContractSection({
  projectState,
  phaseCurrentSlice,
  lockedPhasePath,
  resumeHint
}: PhaseContractSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FolderKanban className="h-4.5 w-4.5 text-amber-400" />
        <h3 className="text-base text-zinc-100">阶段合同</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {pill(
            pickAcceptanceTone(projectState.acceptanceState.finalState),
            formatAcceptanceStatus(projectState.acceptanceState.finalState)
          )}
          {pill("amber", "phase contract")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">阶段名称</div>
            <div className="mt-1 text-sm leading-6 text-zinc-200">
              {projectState.currentPhase.phaseName}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">阶段目标</div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">
              {projectState.currentPhase.phaseGoal}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">当前切口</div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">{phaseCurrentSlice}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">交付物</div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">
              {projectState.currentPhase.deliverable}
            </div>
          </div>
        </div>
        {lockedPhasePath || resumeHint ? (
          <div className="mt-4 grid gap-4 border-t border-zinc-800/60 pt-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-500">Locked phase 快照</div>
              <div className="mt-1 break-all font-mono text-sm leading-6 text-zinc-300">
                {lockedPhasePath ?? "当前还没有 locked snapshot。"}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">显式 continue</div>
              <div className="mt-1 break-all font-mono text-sm leading-6 text-zinc-300">
                {resumeHint ?? "当前没有显式 continue 指令。"}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
