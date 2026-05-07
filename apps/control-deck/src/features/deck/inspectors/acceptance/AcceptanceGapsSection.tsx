import { AlertTriangle } from "lucide-react";
import { compactText } from "../shared";
import type { AcceptanceState } from "@threadsmith/domain";

interface AcceptanceGapsSectionProps {
  acceptanceState: AcceptanceState;
  unresolvedChecklistLabels: string[];
  evidenceGapItems: string[];
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 3).map((item) => (
        <div key={item} className="flex items-start gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80" />
          <div className="text-sm leading-6 text-zinc-300">{compactText(item, 88)}</div>
        </div>
      ))}
    </div>
  );
}

export function AcceptanceGapsSection({
  acceptanceState,
  unresolvedChecklistLabels,
  evidenceGapItems
}: AcceptanceGapsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4.5 w-4.5 text-emerald-400" />
        <h3 className="text-base text-zinc-100">缺什么才算过</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 text-sm text-zinc-200">未过检查项</div>
          <BulletList
            items={
              unresolvedChecklistLabels.length > 0
                ? unresolvedChecklistLabels
                : ["当前检查项都已经通过。"]
            }
          />
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 text-sm text-zinc-200">已知缺口</div>
          <BulletList
            items={acceptanceState.knownGaps.length > 0 ? acceptanceState.knownGaps : ["当前没有新增缺口。"]}
          />
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 text-sm text-zinc-200">当前最缺的证据</div>
          <BulletList
            items={evidenceGapItems.length > 0 ? evidenceGapItems : ["当前关键证据已经齐备。"]}
          />
        </div>
      </div>
    </div>
  );
}
