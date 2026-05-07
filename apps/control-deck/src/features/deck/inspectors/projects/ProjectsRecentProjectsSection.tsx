import { pill } from "../shared";
import type { RecentProjectCard } from "./types";

interface ProjectsRecentProjectsSectionProps {
  recentProjectCards: RecentProjectCard[];
  onClearDailyEntryProject?: () => void;
  onConnectCustomProject: (projectRoot: string) => void;
  onPinRecentProject: (projectRoot: string) => void;
  onRemoveRecentProject: (projectRoot: string) => void;
  onSetDailyEntryProject?: (projectRoot: string) => void;
  onUnpinRecentProject: (projectRoot: string) => void;
}

export function ProjectsRecentProjectsSection({
  recentProjectCards,
  onClearDailyEntryProject,
  onConnectCustomProject,
  onPinRecentProject,
  onRemoveRecentProject,
  onSetDailyEntryProject,
  onUnpinRecentProject
}: ProjectsRecentProjectsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-[0.18em] text-zinc-500">最近项目</h3>
      <div className="space-y-3">
        {recentProjectCards.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 text-sm text-zinc-500">
            还没有最近项目记录。
          </div>
        ) : (
          recentProjectCards.map(({ entry, name, isCurrent, isDefault }) => (
            <div
              key={entry.projectRoot}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4"
            >
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-zinc-200">{name}</div>
                  {isDefault ? pill("blue", "默认进入") : null}
                  {entry.pinned ? pill("amber", "固定") : null}
                  {isCurrent ? pill("green", "当前") : null}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{entry.projectRoot}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-label={isCurrent ? `当前项目 ${entry.projectRoot}` : `打开 ${entry.projectRoot}`}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
                  disabled={isCurrent}
                  onClick={() => {
                    if (!isCurrent) {
                      onConnectCustomProject(entry.projectRoot);
                    }
                  }}
                >
                  {isCurrent ? "当前项目" : "连接"}
                </button>
                <button
                  type="button"
                  aria-label={`${entry.pinned ? "取消固定" : "固定"} ${entry.projectRoot}`}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
                  onClick={() =>
                    entry.pinned
                      ? onUnpinRecentProject(entry.projectRoot)
                      : onPinRecentProject(entry.projectRoot)
                  }
                >
                  {entry.pinned ? "取消固定" : "固定"}
                </button>
                {isDefault && onClearDailyEntryProject ? (
                  <button
                    type="button"
                    aria-label={`取消默认 ${entry.projectRoot}`}
                    className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
                    onClick={onClearDailyEntryProject}
                  >
                    取消默认
                  </button>
                ) : onSetDailyEntryProject ? (
                  <button
                    type="button"
                    aria-label={`设为默认 ${entry.projectRoot}`}
                    className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
                    onClick={() => onSetDailyEntryProject(entry.projectRoot)}
                  >
                    设为默认
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`移除 ${entry.projectRoot}`}
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:bg-zinc-700"
                  onClick={() => onRemoveRecentProject(entry.projectRoot)}
                >
                  移除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="text-xs leading-6 text-zinc-500">
        固定的项目会排在顶部。默认进入项目会在没有显式覆盖时优先打开。移除只清掉入口，不会断开当前连接。
      </p>
    </div>
  );
}
