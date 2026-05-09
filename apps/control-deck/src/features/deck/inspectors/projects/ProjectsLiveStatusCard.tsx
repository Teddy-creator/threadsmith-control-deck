import { pill } from "../shared";

interface ProjectsLiveStatusCardProps {
  currentSourceIsAppHome: boolean;
  currentSourceIsCustomProject: boolean;
  supervisorSummary: string | null;
  currentPhaseLabel?: string | null;
  verificationTone?: string | null;
  verificationStatusLabel?: string | null;
  freshnessText: string;
  lastSyncLabel?: string | null;
}

export function ProjectsLiveStatusCard({
  currentSourceIsAppHome,
  currentSourceIsCustomProject,
  supervisorSummary,
  currentPhaseLabel,
  verificationTone,
  verificationStatusLabel,
  freshnessText,
  lastSyncLabel
}: ProjectsLiveStatusCardProps) {
  if (!currentSourceIsCustomProject && !currentSourceIsAppHome) {
    return null;
  }

  if (currentSourceIsAppHome) {
    return (
      <div className="scenario-live-status rounded-xl border border-blue-500/20 bg-blue-500/8 p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.18em] text-blue-200/70">
          当前显示范围
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pill("blue", "入口快照")}
          {pill("zinc", "非项目实时页")}
        </div>
        <div className="mt-3 text-sm leading-6 text-zinc-400">
          这里是 Threadsmith 前门，只用于选择默认项目、最近项目或新项目。进入真实项目后，才会读取该项目的
          `.threadsmith` 并展示实时 phase、acceptance、run 和 evidence。
        </div>
      </div>
    );
  }

  return (
    <div className="scenario-live-status rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">当前项目状态</div>
      <div className="flex flex-wrap items-center gap-2">
        {supervisorSummary ? (
          <>
            {currentPhaseLabel ? pill("blue", currentPhaseLabel) : null}
            {verificationTone && verificationStatusLabel
              ? pill(verificationTone, verificationStatusLabel)
              : null}
            {pill("blue", freshnessText)}
            {lastSyncLabel ? pill("green", lastSyncLabel) : pill("zinc", "尚未读取")}
          </>
        ) : (
          pill("red", "未就绪")
        )}
      </div>
      <div className="mt-3 text-sm leading-6 text-zinc-400">
        {supervisorSummary
          ? supervisorSummary
          : "当前项目还没有加载出可展示的真实状态。"}
      </div>
      <div className="mt-2 text-xs leading-5 text-zinc-500">
        顶部“刷新状态”会立即重读 `.threadsmith`；页面也会自动轮询。这里显示的是最近一次成功读取到的 committed truth。
      </div>
    </div>
  );
}
