import { Clock3 } from "lucide-react";
import { formatEventTime } from "../../../events/formatters";
import { pill } from "../shared";

interface EventsContinuationSectionProps {
  continuationTone: string;
  continuationStatusLabel: string;
  continuationKindLabel: string;
  continuationHeadline: string;
  continuationDetail: string;
  continuationFreshnessDetail: string;
  continuationRecordedAt: string | null;
}

export function EventsContinuationSection({
  continuationTone,
  continuationStatusLabel,
  continuationKindLabel,
  continuationHeadline,
  continuationDetail,
  continuationFreshnessDetail,
  continuationRecordedAt
}: EventsContinuationSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Clock3 className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">继续与交接</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {pill(continuationTone, continuationStatusLabel)}
          {pill("blue", continuationKindLabel)}
        </div>
        <div className="text-sm leading-6 text-zinc-100">{continuationHeadline}</div>
        <div className="mt-2 text-sm leading-6 text-zinc-300">{continuationDetail}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-zinc-500">判断依据</div>
            <div className="mt-1 text-sm leading-6 text-zinc-400">
              {continuationFreshnessDetail ?? "当前还没有可判断的新鲜度。"}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">最近记录</div>
            <div className="mt-1 text-sm leading-6 text-zinc-400">
              {formatEventTime(continuationRecordedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
