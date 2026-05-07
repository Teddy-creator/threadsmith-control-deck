import { FolderKanban, RefreshCw } from "lucide-react";
import { pill } from "../inspectors/shared";

export function DeckTopBar(props: {
  sourceButtonActive: boolean;
  currentProjectSourceLabel: string;
  currentProjectIdentityName: string;
  projectRoot: string;
  projectSurfaceLabel?: string | null;
  projectSurfaceTone?: "blue" | "green" | "amber" | "zinc";
  actionHistoryLength: number;
  gateTone: "green" | "amber" | "red" | "blue" | "purple" | "zinc";
  gateLabel: string;
  refreshing?: boolean;
  lastSyncLabel?: string | null;
  onToggleSources: () => void;
  onReloadProject?: () => void;
}) {
  return (
    <div className="h-14 border-b border-zinc-800/50 bg-[#0f0f11]/40 px-8">
      <div className="flex h-full items-center justify-between">
        <div className="flex min-w-0 items-center gap-8">
          <button
            type="button"
            aria-label={`来源：${props.currentProjectSourceLabel}`}
            className={`flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left transition-colors ${
              props.sourceButtonActive
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-zinc-800/70 bg-zinc-900/30 hover:border-zinc-700"
            }`}
            onClick={props.onToggleSources}
          >
            <FolderKanban
              className={`h-3.5 w-3.5 shrink-0 ${
                props.sourceButtonActive ? "text-amber-500" : "text-zinc-500"
              }`}
            />
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">来源</span>
            <span
              className="truncate text-sm text-zinc-300"
              title={props.currentProjectSourceLabel}
            >
              {props.currentProjectSourceLabel}
            </span>
            <span className="sr-only">{`来源：${props.currentProjectSourceLabel}`}</span>
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">项目</span>
            <span className="truncate text-sm text-zinc-300" title={props.projectRoot}>
              {props.currentProjectIdentityName}
            </span>
            {props.projectSurfaceLabel
              ? pill(props.projectSurfaceTone ?? "zinc", props.projectSurfaceLabel)
              : null}
            <span className="sr-only">{`项目根目录：${props.projectRoot}`}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {props.onReloadProject ? (
            <>
              <button
                type="button"
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-colors ${
                  props.refreshing
                    ? "cursor-wait border-blue-500/30 bg-blue-500/10 text-blue-200"
                    : "border-zinc-800/70 bg-zinc-900/30 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                }`}
                aria-label={props.refreshing ? "正在刷新状态" : "刷新状态"}
                title={props.lastSyncLabel ?? "刷新状态"}
                disabled={props.refreshing}
                onClick={props.onReloadProject}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 shrink-0 ${
                    props.refreshing ? "animate-spin text-blue-300" : "text-zinc-500"
                  }`}
                />
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                  刷新状态
                </span>
                <span className="text-sm text-zinc-300">
                  {props.lastSyncLabel ?? (props.refreshing ? "同步中" : "未同步")}
                </span>
              </button>
              <div className="h-4 w-px bg-zinc-800" />
            </>
          ) : null}
          <div
            className="flex items-center gap-2.5"
            aria-label={`动作数 ${props.actionHistoryLength}`}
          >
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">动作</span>
            <span className="text-sm text-zinc-100">{props.actionHistoryLength}</span>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">状态</span>
            {pill(props.gateTone, props.gateLabel)}
          </div>
        </div>
      </div>
    </div>
  );
}
