import { AlertTriangle, Shield } from "lucide-react";
import { pill } from "./shared";
import type { DecisionSignal } from "./types";

interface DecisionCardProps {
  decisionSummary: string;
  decisionStateLabel: string;
  decisionSignals: DecisionSignal[];
  decisionAlert: string;
}

export function DecisionCard({
  decisionSummary,
  decisionStateLabel,
  decisionSignals,
  decisionAlert
}: DecisionCardProps) {
  return (
    <article className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700/60">
      <div className="mb-5 flex items-center gap-3">
        <Shield className="h-5 w-5 text-emerald-400" />
        <h3 className="text-base text-zinc-100">推进判断</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-xs text-zinc-500">当前判断</div>
            <div className="text-sm leading-6 text-zinc-300">{decisionSummary}</div>
          </div>
          <div className="shrink-0">{pill("green", decisionStateLabel)}</div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {decisionSignals.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-zinc-800/70 bg-zinc-950/30 p-3"
            >
              <div className="mb-1 text-xs text-zinc-500">{item.label}</div>
              <div
                className={`text-sm ${item.tone === "zinc" ? "text-zinc-300" : "text-emerald-400"}`}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 border-t border-zinc-800 pt-3">
          <div className="mb-2 text-xs text-zinc-500">当前提醒</div>
          <div className="flex items-start gap-2 text-xs text-emerald-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="leading-5">{decisionAlert}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
