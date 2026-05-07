import { Layers3 } from "lucide-react";
import { pill } from "./shared";
import type { RoadmapMilestone } from "./types";

interface ProjectMapCardProps {
  roadmapVersion: string;
  roadmapProgressLabel: string;
  projectStateLabel: string;
  visibleMilestones: RoadmapMilestone[];
  latestDone: string;
  currentMilestone: string;
  nextMilestone: string;
  goal: string;
}

export function ProjectMapCard({
  roadmapVersion,
  roadmapProgressLabel,
  projectStateLabel,
  visibleMilestones,
  latestDone,
  currentMilestone,
  nextMilestone,
  goal
}: ProjectMapCardProps) {
  return (
    <article className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700/60">
      <div className="mb-5 flex items-center gap-3">
        <Layers3 className="h-5 w-5 text-blue-400" />
        <h3 className="text-base text-zinc-100">项目地图</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-xs text-zinc-500">版本路线</div>
            <div className="text-sm text-zinc-100">{roadmapVersion}</div>
          </div>
          <div className="flex items-center gap-2">
            {pill("blue", roadmapProgressLabel)}
            {pill("blue", projectStateLabel)}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/30 p-3">
          <div className="mb-3 text-xs text-zinc-500">里程碑地图</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {visibleMilestones.map((milestone) => {
              const toneClass =
                milestone.state === "done"
                  ? "border-blue-500/18 bg-blue-500/5"
                  : milestone.state === "current"
                    ? "border-blue-500/30 bg-blue-500/10"
                    : milestone.state === "next"
                      ? "border-blue-500/16 bg-blue-500/4"
                      : "border-zinc-800/70 bg-zinc-900/40";
              const barClass =
                milestone.state === "done"
                  ? "bg-blue-400/75"
                  : milestone.state === "current"
                    ? "bg-blue-400"
                    : milestone.state === "next"
                      ? "bg-blue-400/45"
                      : "bg-zinc-700";
              const textClass =
                milestone.state === "current"
                  ? "text-blue-100"
                  : milestone.state === "done"
                    ? "text-blue-100/85"
                    : milestone.state === "next"
                      ? "text-blue-100/70"
                      : "text-zinc-500";

              return (
                <div
                  key={milestone.id}
                  className={`rounded-lg border p-3 ${toneClass}`}
                  title={milestone.title}
                >
                  <div className={`mb-2 h-1 rounded-full ${barClass}`} />
                  <div className={`text-xs leading-5 ${textClass}`}>{milestone.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/30 p-3">
            <div className="mb-1 text-xs text-zinc-500">最近完成</div>
            <div className="text-sm leading-6 text-zinc-200">{latestDone}</div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/8 p-3">
            <div className="mb-1 text-xs text-blue-300/70">当前里程碑</div>
            <div className="text-sm leading-6 text-zinc-100">{currentMilestone}</div>
          </div>
          <div className="rounded-lg border border-zinc-800/70 bg-zinc-950/30 p-3">
            <div className="mb-1 text-xs text-zinc-500">下一里程碑</div>
            <div className="text-sm leading-6 text-zinc-200">{nextMilestone}</div>
          </div>
        </div>

        <div className="border-t border-zinc-800/70 pt-3">
          <div className="mb-1 text-xs text-zinc-500">最终目标</div>
          <div className="text-sm leading-6 text-zinc-400">{goal}</div>
        </div>
      </div>
    </article>
  );
}
