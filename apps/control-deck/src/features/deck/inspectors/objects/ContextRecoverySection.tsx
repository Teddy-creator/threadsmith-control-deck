import { RefreshCcw } from "lucide-react";
import { pill, toneTextClass } from "../shared";
import type { ContextRecoveryModel } from "./types";

interface ContextRecoverySectionProps {
  contextRecovery: ContextRecoveryModel;
  onOpenContextAction: (
    actionId: ContextRecoveryModel["handling"]["executableActionId"]
  ) => void;
}

export function ContextRecoverySection({
  contextRecovery,
  onOpenContextAction
}: ContextRecoverySectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <RefreshCcw className="h-4.5 w-4.5 text-purple-400" />
        <h3 className="text-base text-zinc-100">Context 状态</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {pill(contextRecovery.tone, contextRecovery.statusLabel)}
          {pill(contextRecovery.actionTone, contextRecovery.actionLabel)}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {contextRecovery.packetItems.map((item) => (
            <div key={item.label}>
              <div className="text-xs text-zinc-500">{item.label}</div>
              <div className={`mt-1 text-sm ${toneTextClass(item.tone)}`}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-zinc-800/60 pt-4">
          <div className="text-xs text-zinc-500">为什么现在</div>
          <div className="mt-1 text-sm leading-6 text-zinc-300">
            {contextRecovery.detail}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-zinc-800/70 bg-zinc-950/30 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs text-zinc-500">处理方式</div>
              <div className={`mt-1 text-sm ${toneTextClass(contextRecovery.handling.tone)}`}>
                {contextRecovery.handling.title}
              </div>
            </div>
            {contextRecovery.handling.executableActionId ? (
              <button
                type="button"
                className="rounded-lg bg-purple-500 px-3 py-2 text-xs text-zinc-950 transition-colors hover:bg-purple-400"
                onClick={() =>
                  onOpenContextAction(contextRecovery.handling.executableActionId)
                }
              >
                {contextRecovery.handling.executableLabel}
              </button>
            ) : null}
          </div>
          <div className="text-sm leading-6 text-zinc-400">
            {contextRecovery.handling.detail}
          </div>
          {contextRecovery.handling.manualHint ? (
            <div className="mt-2 text-xs leading-5 text-zinc-500">
              {contextRecovery.handling.manualHint}
            </div>
          ) : null}
        </div>

        {contextRecovery.reasons.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {contextRecovery.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-md bg-zinc-950/50 px-2.5 py-1 text-xs text-zinc-400"
              >
                {reason}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
