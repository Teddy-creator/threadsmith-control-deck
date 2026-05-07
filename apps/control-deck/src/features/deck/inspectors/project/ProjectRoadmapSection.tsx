import { Layers3 } from "lucide-react";
import { pill, statusBadgeClass } from "../shared";
import type { RoadmapMilestone } from "./types";

interface ProjectRoadmapSectionProps {
  homepageRoadmapVersion: string;
  homepageRoadmapProgressLabel: string;
  homepageRoadmapGoal: string;
  homepageRoadmapLatestDone: string;
  homepageRoadmapCurrent: string;
  homepageRoadmapNext: string;
  homepageRoadmapMilestones: RoadmapMilestone[];
}

function milestoneTone(state: RoadmapMilestone["state"]) {
  switch (state) {
    case "done":
      return "green";
    case "current":
      return "blue";
    case "next":
      return "amber";
    case "blocked":
      return "red";
    default:
      return "zinc";
  }
}

function milestoneLabel(state: RoadmapMilestone["state"]) {
  switch (state) {
    case "done":
      return "已完成";
    case "current":
      return "当前";
    case "next":
      return "下一步";
    case "blocked":
      return "阻塞";
    default:
      return "后续";
  }
}

function milestoneBadge(state: RoadmapMilestone["state"]) {
  return (
    <span
      className={`inline-flex min-h-7 w-[4.75rem] shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs leading-none ${statusBadgeClass(milestoneTone(state))}`}
    >
      {milestoneLabel(state)}
    </span>
  );
}

export function ProjectRoadmapSection({
  homepageRoadmapVersion,
  homepageRoadmapProgressLabel,
  homepageRoadmapGoal,
  homepageRoadmapLatestDone,
  homepageRoadmapCurrent,
  homepageRoadmapNext,
  homepageRoadmapMilestones
}: ProjectRoadmapSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Layers3 className="h-4.5 w-4.5 text-blue-400" />
        <h3 className="text-base text-zinc-100">项目路线</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-500">版本路线</div>
              <div className="mt-1 text-sm text-zinc-200">{homepageRoadmapVersion}</div>
            </div>
            {pill("blue", homepageRoadmapProgressLabel)}
          </div>
          <div className="text-sm leading-6 text-zinc-400">{homepageRoadmapGoal}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            <div className="text-xs text-zinc-500">最近完成</div>
            <div className="mt-1 text-sm leading-6 text-zinc-200">{homepageRoadmapLatestDone}</div>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-4">
            <div className="text-xs text-blue-300/70">当前里程碑</div>
            <div className="mt-1 text-sm leading-6 text-zinc-100">{homepageRoadmapCurrent}</div>
          </div>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            <div className="text-xs text-zinc-500">下一里程碑</div>
            <div className="mt-1 text-sm leading-6 text-zinc-200">{homepageRoadmapNext}</div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 text-xs text-zinc-500">全部里程碑</div>
          <div className="space-y-3">
            {homepageRoadmapMilestones.length > 0 ? (
              homepageRoadmapMilestones.map((milestone) => (
                <div key={milestone.id} className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400/80" />
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-500">{milestone.label}</div>
                      <div className="mt-1 text-sm text-zinc-200">{milestone.title}</div>
                      <div className="mt-1 text-sm leading-6 text-zinc-500">{milestone.summary}</div>
                    </div>
                  </div>
                  {milestoneBadge(milestone.state)}
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">当前还没有项目地图。</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
