import { AlertTriangle, BarChart3, CheckCircle2, Circle, Clock3 } from "lucide-react";
import { formatAcceptanceStatus } from "./shared";
import type { AcceptanceItem } from "./types";

interface AcceptanceCardProps {
  acceptanceItems: AcceptanceItem[];
  acceptanceAlert: string;
}

export function AcceptanceCard({
  acceptanceItems,
  acceptanceAlert
}: AcceptanceCardProps) {
  return (
    <article className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700/60">
      <div className="mb-5 flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-cyan-400" />
        <h3 className="text-base text-zinc-100">验收雷达</h3>
      </div>
      <div className="space-y-4">
        {acceptanceItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.status === "pass" ? (
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              ) : item.status === "failed" ? (
                <Circle className="h-4 w-4 text-cyan-400" />
              ) : item.status === "running" ? (
                <Clock3 className="h-4 w-4 text-cyan-400" />
              ) : (
                <Circle className="h-4 w-4 text-zinc-600" />
              )}
              <span className="text-sm text-zinc-400">{item.label}</span>
            </div>
            <span
              className={`text-sm ${item.status === "pending" ? "text-zinc-500" : "text-cyan-400"}`}
            >
              {formatAcceptanceStatus(item.status)}
            </span>
          </div>
        ))}
        <div className="border-t border-zinc-800 pt-3">
          <div className="mb-2 text-xs text-zinc-500">当前提醒</div>
          <div className="flex items-start gap-2 text-xs text-cyan-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="leading-5">{acceptanceAlert}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
