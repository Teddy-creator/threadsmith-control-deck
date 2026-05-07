import type { ProjectsEntryMode } from "./types";
import { pill } from "../shared";

interface ProjectsEntryModeCardProps {
  effectiveEntryMode: ProjectsEntryMode;
  dailyEntryProjectIdentityName: string | null;
  primaryRecentProjectIdentityName: string | null;
  onSetEntryModePreference?: (value: ProjectsEntryMode) => void;
}

export function ProjectsEntryModeCard({
  effectiveEntryMode,
  dailyEntryProjectIdentityName,
  primaryRecentProjectIdentityName,
  onSetEntryModePreference
}: ProjectsEntryModeCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">日常打开方式</div>
        {effectiveEntryMode === "app-home"
          ? pill("blue", "前门优先")
          : pill("blue", "直达默认项目")}
      </div>
      <div className="text-sm leading-6 text-zinc-400">
        {effectiveEntryMode === "app-home"
          ? "普通打开 Threadsmith 时，会先回到前门入口，再从这里决定今天进入哪个真实项目。"
          : dailyEntryProjectIdentityName
            ? `普通打开 Threadsmith 时，会优先直达默认项目 ${dailyEntryProjectIdentityName}。`
            : primaryRecentProjectIdentityName
              ? `当前模式是直达默认项目，但你还没有设置默认项目，所以普通打开时会先回到最近项目 ${primaryRecentProjectIdentityName}。`
              : "当前模式是直达默认项目，但你还没有设置默认项目；普通打开时会沿当前默认路径进入，在这个仓库里通常会先回到 Threadsmith 自身项目。"}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">前门入口</div>
          <div className="mt-2 break-all text-sm text-zinc-100">./Open-Threadsmith-App.command</div>
          <div className="mt-2 text-sm leading-6 text-zinc-500">
            适合日常打开、先看默认项目和最近项目，再决定今天从哪条线进入。
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">项目直达</div>
          <div className="mt-2 break-all text-sm text-zinc-100">
            ./Launch-Threadsmith.command "/path/to/project"
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-500">
            适合明确知道本轮就要进入哪个项目时，直接打开对应控制台。
          </div>
        </div>
      </div>
      {onSetEntryModePreference ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-lg px-4 py-2.5 text-sm transition-colors ${
              effectiveEntryMode === "app-home"
                ? "border border-amber-500/30 bg-amber-500/15 text-amber-200"
                : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            }`}
            onClick={() => onSetEntryModePreference("app-home")}
          >
            设为前门优先
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2.5 text-sm transition-colors ${
              effectiveEntryMode === "direct-project"
                ? "border border-amber-500/30 bg-amber-500/15 text-amber-200"
                : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            }`}
            onClick={() => onSetEntryModePreference("direct-project")}
          >
            设为直达默认项目
          </button>
        </div>
      ) : null}
      <div className="mt-3 text-xs leading-6 text-zinc-500">
        显式前门脚本和显式项目路径始终覆盖这个偏好。如果浏览器支持，也可以把
        `?appHome=1` 这个前门固定到 Dock、应用列表或独立窗口。
      </div>
    </div>
  );
}
