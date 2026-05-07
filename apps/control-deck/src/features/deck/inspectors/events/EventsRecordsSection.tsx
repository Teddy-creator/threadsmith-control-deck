import { CheckCircle2 } from "lucide-react";
import { pill } from "../shared";
import type { RecordItem } from "./types";

interface EventsRecordsSectionProps {
  keyRecordItems: RecordItem[];
}

export function EventsRecordsSection({
  keyRecordItems
}: EventsRecordsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">关键记录</h3>
      </div>
      <div className="space-y-3">
        {keyRecordItems.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              {pill(item.tone, item.statusLabel)}
              <div className="text-sm text-zinc-200">{item.title}</div>
            </div>
            <div className="text-sm leading-6 text-zinc-100">{item.headline}</div>
            <div className="mt-2 text-sm leading-6 text-zinc-400">{item.detail}</div>
            <div className="mt-3 text-xs leading-5 text-zinc-500">
              记录时间：{item.recordedAtLabel}
            </div>
            <div className="mt-1 text-xs leading-5 text-zinc-500">
              来源：{item.sourceLabel}
            </div>
            {item.artifactPath ? (
              <div className="mt-4 border-t border-zinc-800/60 pt-3">
                <div className="mb-1 text-xs text-zinc-500">{item.artifactLabel}</div>
                <div className="break-all font-mono text-sm leading-6 text-zinc-300">
                  {item.artifactPath}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
