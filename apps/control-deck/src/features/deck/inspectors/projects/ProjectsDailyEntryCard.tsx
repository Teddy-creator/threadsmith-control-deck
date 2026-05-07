import { pill } from "../shared";

interface ProjectsDailyEntryCardProps {
  currentSourceIsCustomProject: boolean;
  dailyEntryProjectRoot: string | null | undefined;
  dailyEntryProjectIdentityName: string | null;
  isDailyEntryCurrent: boolean;
  primaryRecentProjectIdentityName: string | null;
  projectRoot: string;
  onConnectCustomProject: (projectRoot: string) => void;
  onClearDailyEntryProject?: () => void;
  onSetDailyEntryProject?: (projectRoot: string) => void;
}

export function ProjectsDailyEntryCard({
  currentSourceIsCustomProject,
  dailyEntryProjectRoot,
  dailyEntryProjectIdentityName,
  isDailyEntryCurrent,
  primaryRecentProjectIdentityName,
  projectRoot,
  onConnectCustomProject,
  onClearDailyEntryProject,
  onSetDailyEntryProject
}: ProjectsDailyEntryCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">日常进入项目</div>
        {dailyEntryProjectIdentityName ? pill("blue", "默认进入") : pill("zinc", "未设置")}
        {isDailyEntryCurrent ? pill("green", "当前") : null}
      </div>
      {dailyEntryProjectIdentityName ? (
        <>
          <div className="text-sm text-zinc-100">{dailyEntryProjectIdentityName}</div>
          <div className="mt-1 text-xs text-zinc-500">{dailyEntryProjectRoot}</div>
          <div className="mt-3 text-sm leading-6 text-zinc-400">
            {isDailyEntryCurrent
              ? "当前项目已经是你的默认进入项目。没有显式 query 或启动参数覆盖时，Threadsmith 会优先从这里进入。"
              : "当前日常入口已经设好。重新打开 Threadsmith 时，若没有显式覆盖，会优先回到这个项目。"}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!isDailyEntryCurrent && dailyEntryProjectRoot ? (
              <button
                type="button"
                className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-700"
                onClick={() => onConnectCustomProject(dailyEntryProjectRoot)}
              >
                打开默认项目
              </button>
            ) : null}
            {onClearDailyEntryProject ? (
              <button
                type="button"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
                onClick={onClearDailyEntryProject}
              >
                取消默认
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="text-sm leading-6 text-zinc-400">
            {currentSourceIsCustomProject
              ? "当前还没有设置默认进入项目。你可以把正在查看的真实项目设成日常入口。"
              : primaryRecentProjectIdentityName
                ? `当前还没有默认进入项目。没有显式覆盖时，Threadsmith 会先回到最近项目 ${primaryRecentProjectIdentityName}。`
                : "当前还没有默认进入项目。连接一个真实项目后，可以把它设成日常入口。"}
          </div>
          {currentSourceIsCustomProject && onSetDailyEntryProject ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-700"
                onClick={() => onSetDailyEntryProject(projectRoot)}
              >
                设为默认进入
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
