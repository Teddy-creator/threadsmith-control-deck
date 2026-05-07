import { Activity } from "lucide-react";
import { toneTextClass } from "../shared";
import type { SnapshotItem } from "./types";

interface EventsSnapshotSectionProps {
  evidenceSnapshotItems: SnapshotItem[];
}

export function EventsSnapshotSection({
  evidenceSnapshotItems
}: EventsSnapshotSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Activity className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">当前证据面</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {evidenceSnapshotItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
          >
            <div className="text-xs text-zinc-500">{item.label}</div>
            <div className={`mt-2 text-sm ${toneTextClass(item.tone)}`}>{item.value}</div>
            <div className="mt-2 text-sm leading-6 text-zinc-200">{item.headline}</div>
            <div className="mt-3 text-xs leading-5 text-zinc-500">{item.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
