import { CheckCircle2 } from "lucide-react";
import { pill } from "../shared";
import type { AcceptanceGateCard } from "./types";
import {
  formatHomepageAcceptanceItemStatus,
  pickHomepageAcceptanceItemTone
} from "../../view-models/acceptance";

interface AcceptanceGatesSectionProps {
  acceptanceGateCards: AcceptanceGateCard[];
}

export function AcceptanceGatesSection({
  acceptanceGateCards
}: AcceptanceGatesSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
        <h3 className="text-base text-zinc-100">四道门</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {acceptanceGateCards.map((gate) => (
          <div
            key={gate.label}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm text-zinc-200">{gate.label}</div>
              {pill(
                pickHomepageAcceptanceItemTone(gate.status),
                formatHomepageAcceptanceItemStatus(gate.status)
              )}
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-zinc-500">阻塞原因</div>
                <div className="mt-1 text-sm leading-6 text-zinc-300">{gate.blocker}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">缺的证据</div>
                <div className="mt-1 text-sm leading-6 text-zinc-300">{gate.missingEvidence}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">下一步</div>
                <div className="mt-1 text-sm leading-6 text-zinc-300">{gate.nextAction}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
