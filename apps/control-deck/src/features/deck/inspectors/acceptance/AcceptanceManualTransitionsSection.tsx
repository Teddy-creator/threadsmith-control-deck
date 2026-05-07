import { Zap } from "lucide-react";
import { formatRole } from "../../../display/labels";
import { pill, pickWorkflowTransitionTone, workflowTransitionButtonClass } from "../shared";
import type { WorkflowTransitionAction } from "./types";
import type { WorkflowTransitionId } from "@threadsmith/domain";

interface AcceptanceManualTransitionsSectionProps {
  workflowTransitions: WorkflowTransitionAction[];
  applyingTransitionId: WorkflowTransitionId | null;
  transitionError: string | null;
  onApplyWorkflowTransition: (transitionId: WorkflowTransitionId) => void;
}

export function AcceptanceManualTransitionsSection({
  workflowTransitions,
  applyingTransitionId,
  transitionError,
  onApplyWorkflowTransition
}: AcceptanceManualTransitionsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Zap className="h-4.5 w-4.5 text-emerald-400" />
        <h3 className="text-base text-zinc-100">手动流转（备用）</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="text-sm leading-6 text-zinc-300">
          默认应通过指挥官聊天推进验收流；只有需要手动签发状态时，才在这里直接操作。
        </div>
      </div>
      {workflowTransitions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {workflowTransitions.map((transition) => {
            const tone = pickWorkflowTransitionTone(transition.tone);
            const isApplying = applyingTransitionId === transition.id;

            return (
              <div
                key={transition.id}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {pill(tone, transition.label)}
                  <span className="inline-flex items-center justify-center rounded-md bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300">
                    {formatRole(transition.role)}
                  </span>
                </div>
                <div className="text-sm leading-6 text-zinc-300">{transition.detail}</div>
                <button
                  type="button"
                  className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm transition-colors ${workflowTransitionButtonClass(
                    transition.tone,
                    isApplying
                  )}`}
                  onClick={() => onApplyWorkflowTransition(transition.id)}
                  disabled={applyingTransitionId !== null}
                >
                  {isApplying ? "提交中..." : transition.label}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="text-sm leading-6 text-zinc-300">
            当前没有需要手动签发的流转动作。
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-500">
            当某个角色进入 running 状态后，这里会出现对应的放行或阻塞按钮。
          </div>
        </div>
      )}
      {transitionError ? (
        <div
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
          role="alert"
        >
          {transitionError}
        </div>
      ) : null}
    </div>
  );
}
