import { AlertTriangle } from "lucide-react";
import { compactText } from "../shared";
import type { SignoffItem } from "./types";

interface AcceptanceSignoffSectionProps {
  signoffItems: SignoffItem[];
}

export function AcceptanceSignoffSection({
  signoffItems
}: AcceptanceSignoffSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4.5 w-4.5 text-emerald-400" />
        <h3 className="text-base text-zinc-100">签字与记录</h3>
      </div>
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
        <div className="mb-3 text-sm leading-6 text-zinc-300">
          这里记录谁已经给出 review、verification、closeout 与最终接受结论。
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {signoffItems.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3"
            >
              <div className="text-xs text-zinc-500">{item.label}</div>
              <div className="mt-1 text-sm leading-6 text-zinc-200">
                {compactText(item.summary, 72)}
              </div>
              <div className="mt-1 text-xs text-zinc-500">{item.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
