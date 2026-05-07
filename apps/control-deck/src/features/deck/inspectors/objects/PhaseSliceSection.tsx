import { Layers3 } from "lucide-react";
import type { PhaseBoundarySection } from "./types";

interface PhaseSliceSectionProps {
  phaseBoundarySections: PhaseBoundarySection[];
}

export function PhaseSliceSection({
  phaseBoundarySections
}: PhaseSliceSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Layers3 className="h-4.5 w-4.5 text-blue-400" />
        <h3 className="text-base text-zinc-100">当前 slice</h3>
      </div>
      <div className="space-y-3">
        {phaseBoundarySections.map((section) => (
          <div
            key={section.label}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
          >
            <div className="text-xs text-zinc-500">{section.label}</div>
            {section.items.length > 0 ? (
              <div className="mt-2 space-y-2">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span
                      className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                        section.label === "阻塞 / 待决策"
                          ? "bg-amber-400/80"
                          : "bg-blue-400/80"
                      }`}
                    />
                    <div className="text-sm leading-6 text-zinc-300">{item}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-zinc-500">{section.empty}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
