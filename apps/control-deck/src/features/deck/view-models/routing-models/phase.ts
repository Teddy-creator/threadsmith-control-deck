import type { AgentRunRecord, PhaseOwner, ProviderRouting } from "@threadsmith/domain";
import { describeRouteSupport, formatConductorSurfaceLabel } from "@threadsmith/runtime";
import { formatRole } from "../../../display/labels";
import type { LatestBridgeModel } from "../runBridge";
import {
  formatCollaborationThreadLabel,
  formatProviderLabel
} from "../shared";
import type { PhaseRoutingOverviewItem } from "./types";

function buildPhaseLeadRole(args: {
  activeOwners: PhaseOwner[];
  latestRun: AgentRunRecord | null;
}): PhaseOwner | null {
  if (
    args.latestRun &&
    (args.latestRun.status === "queued" || args.latestRun.status === "running") &&
    args.activeOwners.includes(args.latestRun.role)
  ) {
    return args.latestRun.role;
  }

  if (args.activeOwners.includes("executor")) {
    return "executor";
  }

  return args.activeOwners[0] ?? null;
}

export function buildPhaseRoutingOverviewItems(args: {
  activeOwners: PhaseOwner[];
  routing: ProviderRouting;
  latestBridgeModel: LatestBridgeModel;
  latestRun: AgentRunRecord | null;
}): PhaseRoutingOverviewItem[] {
  const surfaceLabel = formatConductorSurfaceLabel(args.routing.conductorSurface);
  const leadRole = buildPhaseLeadRole({
    activeOwners: args.activeOwners,
    latestRun: args.latestRun
  });
  const leadProvider = leadRole ? args.routing[leadRole] : null;
  const leadProviderLabel = formatProviderLabel(leadProvider);
  const leadThreadLabel = leadRole ? formatCollaborationThreadLabel(leadRole) : null;
  const executorActive = args.activeOwners.includes("executor");
  const executorSupport = executorActive
    ? describeRouteSupport({
        provider: args.routing.executor,
        conductorSurface: args.routing.conductorSurface,
        routeKind: "workflow-recommended",
        busy: args.latestRun?.status === "queued" || args.latestRun?.status === "running"
      })
    : null;

  const pathItem = !executorActive
    ? {
        value: "指挥官流程",
        detail: `当前 phase 暂时不依赖 executor 自动执行，默认继续在 ${surfaceLabel} 收束判断与下一步。`,
        tone: "zinc" as const
      }
    : args.routing.executor === "claude"
      ? {
          value: args.latestBridgeModel.handoffLabel === "交接已就绪" ? "外部 handoff" : "回到当前入口",
          detail:
            args.latestBridgeModel.handoffLabel === "交接已就绪"
              ? `当前 phase 的执行线已路由到 Claude；可在桥接预览复制交接提示词后回到 ${surfaceLabel} 继续。`
              : `当前 phase 的执行线已路由到 Claude；需要回到 ${surfaceLabel} 手动继续推进。`,
          tone: "amber" as const
        }
      : executorSupport?.availability === "available"
        ? {
            value: "可自动执行",
            detail: "当前 phase 的执行线仍可沿 command bridge 推进；默认不需要额外 handoff。",
            tone: "blue" as const
          }
        : {
            value: "等待结果回流",
            detail: "当前 phase 已有一轮 executor 自动执行在跑，先等待结果回写后再继续更稳。",
            tone: "amber" as const
          };

  return [
    {
      label: "当前入口",
      value: surfaceLabel,
      detail: `这个 phase 默认仍从 ${surfaceLabel} 继续，由 Conductor 负责组织下一步。`,
      tone: "blue"
    },
    {
      label: "主承接角色",
      value:
        leadRole && leadThreadLabel && leadProviderLabel
          ? `${formatRole(leadRole)} · ${leadThreadLabel}`
          : "待明确",
      detail:
        leadRole && leadThreadLabel && leadProviderLabel
          ? `当前 phase 主要由 ${leadThreadLabel} 承接，默认 provider 为 ${leadProviderLabel}。`
          : "当前还没有足够信息判断谁在承接这个 phase。",
      tone: leadRole === "executor" ? pathItem.tone : "zinc"
    },
    {
      label: "当前执行线",
      value: pathItem.value,
      detail: pathItem.detail,
      tone: pathItem.tone
    }
  ];
}

export function buildPhaseParticipantRouteHint(args: {
  role: PhaseOwner;
  routing: ProviderRouting;
  latestBridgeModel: LatestBridgeModel;
  latestRun: AgentRunRecord | null;
  conductorSurface: ProviderRouting["conductorSurface"];
}): string {
  const surfaceLabel = formatConductorSurfaceLabel(args.conductorSurface);

  if (args.role === "executor") {
    const executorSupport = describeRouteSupport({
      provider: args.routing.executor,
      conductorSurface: args.conductorSurface,
      routeKind: "workflow-recommended",
      busy: args.latestRun?.status === "queued" || args.latestRun?.status === "running"
    });

    if (args.routing.executor === "claude") {
      return args.latestBridgeModel.handoffLabel === "交接已就绪"
        ? `当前 phase 的执行线走外部 handoff；在桥接预览复制提示词后回到 ${surfaceLabel} 继续。`
        : `当前 phase 的执行线已路由到 Claude；需要回到 ${surfaceLabel} 手动推进。`;
    }

    return executorSupport.availability === "available"
      ? "当前 phase 仍可沿 command bridge 自动推进。"
      : "当前 phase 正等待 executor 结果回流，再决定下一步。";
  }

  return `当前仍通过 ${surfaceLabel} 的指挥官流程协调这个角色。`;
}
