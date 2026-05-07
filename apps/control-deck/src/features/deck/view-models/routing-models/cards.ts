import type { AgentRunRecord, ProviderRouting } from "@threadsmith/domain";
import { describeRouteSupport, formatConductorSurfaceLabel } from "@threadsmith/runtime";
import { formatRole } from "../../../display/labels";
import type { LatestBridgeModel } from "../runBridge";
import {
  formatCollaborationThreadLabel,
  formatProviderLabel
} from "../shared";
import type { RoleRoutingCardModel, RoutingRole } from "./types";

export function buildRoleRoutingCardModel(args: {
  role: RoutingRole;
  routing: ProviderRouting;
  latestBridgeModel: LatestBridgeModel;
  latestRun: AgentRunRecord | null;
}): RoleRoutingCardModel {
  const provider = args.routing[args.role];
  const providerLabel = formatProviderLabel(provider) ?? "Codex";
  const surfaceLabel = formatConductorSurfaceLabel(args.routing.conductorSurface);
  const threadLabel = formatCollaborationThreadLabel(args.role);

  if (args.role === "executor") {
    const executorSupport = describeRouteSupport({
      provider,
      conductorSurface: args.routing.conductorSurface,
      routeKind: "workflow-recommended",
      busy: args.latestRun?.status === "queued" || args.latestRun?.status === "running"
    });

    if (provider === "claude") {
      return {
        role: args.role,
        roleLabel: formatRole(args.role),
        threadLabel,
        providerLabel,
        modeLabel: args.latestBridgeModel.handoffLabel === "交接已就绪" ? "外部 handoff" : "手动推进",
        modeTone: "amber",
        summary:
          args.latestBridgeModel.handoffLabel === "交接已就绪"
            ? `执行角色当前记为 ${providerLabel}；可在桥接预览复制交接提示词后，回到 ${surfaceLabel} 继续推进。`
            : `执行角色当前记为 ${providerLabel}；Threadsmith 暂不支持自动执行，需回到 ${surfaceLabel} 手动推进。`,
        surfaceLabel
      };
    }

    return {
      role: args.role,
      roleLabel: formatRole(args.role),
      threadLabel,
      providerLabel,
      modeLabel: executorSupport.availability === "available" ? "自动执行" : "等待回流",
      modeTone: executorSupport.availability === "available" ? "blue" : "amber",
      summary:
        executorSupport.availability === "available"
          ? `执行角色当前记为 ${providerLabel}；默认可沿 command bridge 自动推进，必要时再回到 ${surfaceLabel} 手动处理。`
          : "执行角色当前仍由 Codex 自动推进，但已有运行在途；先等待结果写回后再继续更稳。",
      surfaceLabel
    };
  }

  const roleSummaryByRole: Record<Exclude<RoutingRole, "executor">, string> = {
    planner: "负责项目级判断、切刀排序与交接收口。",
    reviewer: "负责复核结果与评审判断。",
    verifier: "负责独立验证与 acceptance 判断。",
    closeout: "负责收尾、沉淀与最终 truth 收口。"
  };

  return {
    role: args.role,
    roleLabel: formatRole(args.role),
    threadLabel,
    providerLabel,
    modeLabel: "指挥官流程",
    modeTone: "zinc",
    summary: `${providerLabel} ${roleSummaryByRole[args.role]} 当前仍通过 ${surfaceLabel} 的指挥官流程组织，不由 Threadsmith 直接自动启动。`,
    surfaceLabel
  };
}
