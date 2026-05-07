import { Activity } from "lucide-react";
import { pill } from "../shared";
import type { PhaseRoutingOverviewItem } from "./types";

interface PhaseRoutingSectionProps {
  phaseRoutingOverviewItems: PhaseRoutingOverviewItem[];
}

export function PhaseRoutingSection({
  phaseRoutingOverviewItems
}: PhaseRoutingSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Activity className="h-4.5 w-4.5 text-purple-400" />
        <h3 className="text-base text-zinc-100">当前推进方式</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {phaseRoutingOverviewItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-500">{item.label}</div>
              {pill(item.tone, item.value)}
            </div>
            <div className="mt-3 text-sm leading-6 text-zinc-300">{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
