import type { AgentRunRecord, ProviderRouting } from "@threadsmith/domain";
import { describeRouteSupport, formatConductorSurfaceLabel } from "@threadsmith/runtime";
import type { LatestBridgeModel } from "../runBridge";
import type { RoutingOverviewItem } from "./types";

export function buildRoutingOverviewItems(args: {
  routing: ProviderRouting;
  latestBridgeModel: LatestBridgeModel;
  latestRun: AgentRunRecord | null;
}): RoutingOverviewItem[] {
  const surfaceLabel = formatConductorSurfaceLabel(args.routing.conductorSurface);
  const executorSupport = describeRouteSupport({
    provider: args.routing.executor,
    conductorSurface: args.routing.conductorSurface,
    routeKind: "workflow-recommended",
    busy: args.latestRun?.status === "queued" || args.latestRun?.status === "running"
  });

  const executorPath =
    args.routing.executor === "claude"
      ? {
          value: args.latestBridgeModel.handoffLabel === "交接已就绪" ? "外部 handoff" : "回到当前入口",
          detail:
            args.latestBridgeModel.handoffLabel === "交接已就绪"
              ? `执行角色已路由到 Claude；可在桥接预览复制交接提示词后回到 ${surfaceLabel} 继续。`
              : `执行角色已路由到 Claude；当前仍需回到 ${surfaceLabel} 手动推进。`,
          tone: "amber" as const
        }
      : executorSupport.availability === "available"
        ? {
            value: "自动执行优先",
            detail: "当前 executor 仍可沿 command bridge 推进；只有调试或例外情况才需要手动处理。",
            tone: "blue" as const
          }
        : {
            value: "等待结果回流",
            detail: "当前已有一轮 Codex 自动执行在跑，先等待结果写回后再继续更稳。",
            tone: "amber" as const
          };

  return [
    {
      label: "指挥入口",
      value: surfaceLabel,
      detail: `默认继续在 ${surfaceLabel} 与 Conductor 对话；Threadsmith 负责展示 truth、路由与 bridge 建议。`,
      tone: "blue"
    },
    {
      label: "执行线",
      value: executorPath.value,
      detail: executorPath.detail,
      tone: executorPath.tone
    },
    {
      label: "当前桥接",
      value: args.latestBridgeModel.visible ? args.latestBridgeModel.handoffLabel : "暂无",
      detail: args.latestBridgeModel.visible
        ? args.latestBridgeModel.handoffDetail
        : "当前还没有最新 bridge / handoff 记录。",
      tone: args.latestBridgeModel.visible ? args.latestBridgeModel.handoffTone : "zinc"
    }
  ];
}
