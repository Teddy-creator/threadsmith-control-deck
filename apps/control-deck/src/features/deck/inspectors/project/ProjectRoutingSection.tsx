import { Users } from "lucide-react";
import type { ProviderRouting } from "@threadsmith/domain";
import { pill, purpleMetaTagClass } from "../shared";
import type {
  ProviderRoutingRole,
  ProviderRoutingStatusBadge,
  RoleRoutingCard,
  RoutingOverviewItem,
  SelectOption
} from "./types";

interface ProjectRoutingSectionProps {
  editableProviderRouting: ProviderRouting;
  routingModeLabel: string;
  providerRoutingStatusBadge: ProviderRoutingStatusBadge;
  routingOverviewItems: RoutingOverviewItem[];
  structureItems: RoleRoutingCard[];
  currentSourceIsAppHome: boolean;
  providerRoutingStatusDetail: string;
  routingSupportSummaryText: string;
  providerRoutingSaveState: "idle" | "saving" | "failed";
  routingSelectClassName: string;
  conductorSurfaceOptions: Array<SelectOption<ProviderRouting["conductorSurface"]>>;
  providerOptions: Array<SelectOption<ProviderRouting["planner"]>>;
  saveRoutingDisabled: boolean;
  resetRoutingDisabled: boolean;
  onUpdateConductorSurface: (value: ProviderRouting["conductorSurface"]) => void;
  onUpdateProviderRoutingRole: (
    role: ProviderRoutingRole,
    value: ProviderRouting["planner"]
  ) => void;
  onSaveProviderRouting: () => void;
  onResetProviderRouting: () => void;
}

export function ProjectRoutingSection({
  editableProviderRouting,
  routingModeLabel,
  providerRoutingStatusBadge,
  routingOverviewItems,
  structureItems,
  currentSourceIsAppHome,
  providerRoutingStatusDetail,
  routingSupportSummaryText,
  providerRoutingSaveState,
  routingSelectClassName,
  conductorSurfaceOptions,
  providerOptions,
  saveRoutingDisabled,
  resetRoutingDisabled,
  onUpdateConductorSurface,
  onUpdateProviderRoutingRole,
  onSaveProviderRouting,
  onResetProviderRouting
}: ProjectRoutingSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-4.5 w-4.5 text-purple-400" />
        <h3 className="text-base text-zinc-100">指挥与路由</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {pill("purple", "当前指挥入口")}
            {pill("purple", routingModeLabel)}
            <span
              className={`inline-flex min-h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs leading-none ${providerRoutingStatusBadge.className}`}
            >
              {providerRoutingStatusBadge.label}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
              <div className="text-xs text-purple-200/70">角色</div>
              <div className="mt-2 text-sm text-zinc-100">Conductor</div>
            </div>
            <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
              <div className="text-xs text-purple-200/70">线程</div>
              <div className="mt-2 text-sm text-zinc-100">Main</div>
            </div>
            <label className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
              <div className="text-xs text-purple-200/70">入口</div>
              <select
                aria-label="指挥入口"
                className={`mt-2 ${routingSelectClassName}`}
                value={editableProviderRouting.conductorSurface}
                disabled={providerRoutingSaveState === "saving"}
                onChange={(event) =>
                  onUpdateConductorSurface(
                    event.target.value as ProviderRouting["conductorSurface"]
                  )
                }
              >
                {conductorSurfaceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 text-sm leading-6 text-zinc-300">
            {currentSourceIsAppHome
              ? "这里展示的是 Threadsmith 前门的默认路由，不绑定某个真实项目的编码执行。真正进入项目后，你会看到那个项目自己的 committed 路由。"
              : "默认由指挥官在外部聊天面接收你的指令，这里负责展示项目真相、路线与角色归属。"}
          </div>
          <div className="mt-2 text-xs text-zinc-500">{routingSupportSummaryText}</div>
          <div className="mt-2 text-xs text-zinc-500">{providerRoutingStatusDetail}</div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-purple-500 px-3.5 py-2 text-sm text-zinc-950 transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              disabled={saveRoutingDisabled}
              onClick={onSaveProviderRouting}
            >
              保存路由
            </button>
            <button
              type="button"
              className="rounded-lg border border-zinc-700/80 bg-zinc-950/50 px-3.5 py-2 text-sm text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={resetRoutingDisabled}
              onClick={onResetProviderRouting}
            >
              恢复当前 truth
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 text-xs text-zinc-500">当前使用方式</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {routingOverviewItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-zinc-500">{item.label}</div>
                  {pill(item.tone, item.value)}
                </div>
                <div className="mt-3 text-sm leading-6 text-zinc-300">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
          <div className="mb-3 text-xs text-zinc-500">角色路由</div>
          <div className="space-y-3">
            {structureItems.map((item) => (
              <div
                key={`${item.roleLabel}-${item.threadLabel}`}
                className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  <Users className="h-4 w-4 shrink-0 text-purple-400" />
                  <span className={purpleMetaTagClass}>
                    {item.roleLabel}
                  </span>
                  <span className={purpleMetaTagClass}>
                    {item.threadLabel}
                  </span>
                  <span className={purpleMetaTagClass}>
                    {item.providerLabel}
                  </span>
                  {pill(item.modeTone, item.modeLabel)}
                </div>
                <div className="grid gap-3 pl-6 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-start">
                  <div>
                    <div className="text-sm leading-6 text-zinc-300">{item.summary}</div>
                    <div className="mt-2 text-xs text-zinc-500">入口 · {item.surfaceLabel}</div>
                  </div>
                  <label>
                    <div className="mb-2 text-xs text-zinc-500">Provider</div>
                    <select
                      aria-label={`${item.roleLabel} provider`}
                      className={routingSelectClassName}
                      value={editableProviderRouting[item.role]}
                      disabled={providerRoutingSaveState === "saving"}
                      onChange={(event) =>
                        onUpdateProviderRoutingRole(
                          item.role,
                          event.target.value as ProviderRouting["planner"]
                        )
                      }
                    >
                      {providerOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
