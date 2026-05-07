import type {
  AcceptanceState,
  AgentRunRecord,
  PhaseOwner,
  ProjectState,
  ProviderRouting
} from "@threadsmith/domain";
import {
  describeRouteSupport,
  formatConductorSurfaceLabel,
  type SupervisorState
} from "@threadsmith/runtime";
import { formatRole } from "../../../display/labels";
import type { LatestBridgeModel } from "../runBridge";
import {
  formatCollaborationThreadLabel,
  formatProviderLabel
} from "../shared";
import type { AcceptanceRoutingOverviewItem, AcceptanceRoutingTarget } from "./types";
import {
  deriveHomepageCloseoutStatus,
  deriveHomepageFinalAcceptanceStatus,
  deriveHomepageReviewStatus,
  deriveHomepageVerificationStatus,
  pickHomepageAcceptanceItemTone
} from "./status";

function findActiveAcceptanceRole(args: {
  activeWork: ProjectState["activeWork"];
  roles: PhaseOwner[];
}): PhaseOwner | null {
  const statusPriority = ["running", "blocked", "waiting"] as const;

  for (const status of statusPriority) {
    const activeItem = args.activeWork.items.find(
      (item) => item.status === status && args.roles.includes(item.role)
    );

    if (activeItem) {
      return activeItem.role;
    }
  }

  return null;
}

function buildAcceptanceRoutingTarget(args: {
  acceptanceState: AcceptanceState;
  activeWork: ProjectState["activeWork"];
}): AcceptanceRoutingTarget {
  const reviewGateStatus = deriveHomepageReviewStatus(args.acceptanceState);
  const verificationGateStatus = deriveHomepageVerificationStatus(args.acceptanceState);
  const closeoutGateStatus = deriveHomepageCloseoutStatus(args.acceptanceState);
  const finalAcceptanceGateStatus = deriveHomepageFinalAcceptanceStatus(
    args.acceptanceState
  );
  const currentGate =
    [
      { label: "评审", status: reviewGateStatus },
      { label: "验证", status: verificationGateStatus },
      { label: "收尾", status: closeoutGateStatus },
      { label: "最终接受", status: finalAcceptanceGateStatus }
    ].find((gate) => gate.status !== "pass") ?? null;

  if (!currentGate) {
    return {
      gateLabel: "四道门已全部通过",
      gateStatus: "pass",
      role: null
    };
  }

  if (currentGate.label === "评审") {
    const activeReviewRole = findActiveAcceptanceRole({
      activeWork: args.activeWork,
      roles: ["executor", "reviewer"]
    });

    return {
      gateLabel: currentGate.label,
      gateStatus: currentGate.status,
      role:
        activeReviewRole
        ?? (args.acceptanceState.implementationStatus === "not-started"
          ? "planner"
          : "reviewer")
    };
  }

  if (currentGate.label === "验证") {
    return {
      gateLabel: currentGate.label,
      gateStatus: currentGate.status,
      role:
        findActiveAcceptanceRole({
          activeWork: args.activeWork,
          roles: ["verifier"]
        }) ?? "verifier"
    };
  }

  return {
    gateLabel: currentGate.label,
    gateStatus: currentGate.status,
    role:
      findActiveAcceptanceRole({
        activeWork: args.activeWork,
        roles: ["closeout"]
      }) ?? "closeout"
  };
}

function buildAcceptanceRouteMode(args: {
  gateLabel: string;
  role: PhaseOwner | null;
  projectSupervision: SupervisorState["projectSupervision"];
  routing: ProviderRouting;
  latestBridgeModel: LatestBridgeModel;
  latestRun: AgentRunRecord | null;
}) {
  const surfaceLabel = formatConductorSurfaceLabel(args.routing.conductorSurface);

  if (!args.role) {
    return {
      value: "已接受",
      detail: "当前验收四道门已全部通过，可以直接查看 accepted 记录或进入下一阶段。",
      tone: "green" as const
    };
  }

  const line = args.projectSupervision.lines.find((item) => item.role === args.role);
  const provider = args.routing[args.role];
  const providerLabel =
    line?.providerLabel
    ?? formatProviderLabel(provider)
    ?? (provider === "claude" ? "Claude" : "Codex");
  const threadLabel = line?.threadLabel ?? formatCollaborationThreadLabel(args.role);

  if (args.role === "executor") {
    const executorSupport = describeRouteSupport({
      provider,
      conductorSurface: args.routing.conductorSurface,
      routeKind: "workflow-recommended",
      busy: args.latestRun?.status === "queued" || args.latestRun?.status === "running"
    });

    if (provider === "claude") {
      return {
        value: args.latestBridgeModel.handoffLabel === "交接已就绪" ? "外部 handoff" : "回到当前入口",
        detail:
          args.latestBridgeModel.handoffLabel === "交接已就绪"
            ? `当前还在为进入${args.gateLabel}准备结果；执行线已路由到 Claude，可在桥接预览复制提示词后回到 ${surfaceLabel} 继续。`
            : `当前还在为进入${args.gateLabel}准备结果；执行线已路由到 Claude，需要回到 ${surfaceLabel} 手动继续推进。`,
        tone: "amber" as const
      };
    }

    return executorSupport.availability === "available"
      ? {
          value: "可自动执行",
          detail: `当前还在为进入${args.gateLabel}准备结果；执行线仍可沿 command bridge 推进。`,
          tone: "blue" as const
        }
      : {
          value: "等待结果回流",
          detail: `当前还在为进入${args.gateLabel}准备结果；先等待 executor 结果回写后再继续更稳。`,
          tone: "amber" as const
        };
  }

  if (args.role === "planner") {
    return {
      value: "指挥官流程",
      detail: `当前还在为进入${args.gateLabel}收束边界，先回到 ${surfaceLabel} 由 Conductor 组织下一步。`,
      tone: "zinc" as const
    };
  }

  if (line?.status === "running") {
    return {
      value: "等待结论回流",
      detail: `当前${args.gateLabel}已由 ${threadLabel} 承接；继续在 ${surfaceLabel} 等待这道门的结论回流更稳。`,
      tone: "amber" as const
    };
  }

  if (provider === "claude") {
    return {
      value: "指挥官流程",
      detail: `当前${args.gateLabel}逻辑上由 ${providerLabel} ${threadLabel} 承接，但 Threadsmith 还不支持这道门的自动桥接；继续回到 ${surfaceLabel} 组织这一步。`,
      tone: "amber" as const
    };
  }

  return {
    value: "指挥官流程",
    detail: `当前${args.gateLabel}默认由 ${providerLabel} ${threadLabel} 通过 ${surfaceLabel} 的指挥官流程推进，不由 Threadsmith 直接自动启动。`,
    tone: "zinc" as const
  };
}

export function buildAcceptanceRoutingOverviewItems(args: {
  acceptanceState: AcceptanceState;
  activeWork: ProjectState["activeWork"];
  projectSupervision: SupervisorState["projectSupervision"];
  routing: ProviderRouting;
  latestBridgeModel: LatestBridgeModel;
  latestRun: AgentRunRecord | null;
}): AcceptanceRoutingOverviewItem[] {
  const target = buildAcceptanceRoutingTarget({
    acceptanceState: args.acceptanceState,
    activeWork: args.activeWork
  });
  const surfaceLabel = formatConductorSurfaceLabel(args.routing.conductorSurface);
  const line = target.role
    ? args.projectSupervision.lines.find((item) => item.role === target.role)
    : null;
  const providerLabel = target.role
    ? line?.providerLabel
      ?? formatProviderLabel(args.routing[target.role])
      ?? (args.routing[target.role] === "claude" ? "Claude" : "Codex")
    : null;
  const threadLabel = target.role
    ? line?.threadLabel ?? formatCollaborationThreadLabel(target.role)
    : null;
  const routeMode = buildAcceptanceRouteMode({
    gateLabel: target.gateLabel,
    role: target.role,
    projectSupervision: args.projectSupervision,
    routing: args.routing,
    latestBridgeModel: args.latestBridgeModel,
    latestRun: args.latestRun
  });

  return [
    {
      label: "当前责任门",
      value: target.gateLabel,
      detail:
        target.gateStatus === "pass"
          ? "当前验收已经完成，可以查看 accepted 记录或继续下一阶段。"
          : `当前离 accepted 最近的未通过 gate 是${target.gateLabel}；先把这道门处理掉，再继续后面的验收流。`,
      tone: pickHomepageAcceptanceItemTone(target.gateStatus)
    },
    {
      label: "主承接角色",
      value:
        target.role && threadLabel
          ? `${formatRole(target.role)} · ${threadLabel}`
          : "无需继续",
      detail:
        target.role && threadLabel && providerLabel
          ? target.role === "planner"
            ? `当前还在为进入${target.gateLabel}收束边界，暂由 ${threadLabel} 承接，默认 provider 为 ${providerLabel}。`
            : `当前${target.gateLabel}主要由 ${threadLabel} 承接，默认 provider 为 ${providerLabel}。`
          : "当前验收没有未完成的责任门。",
      tone:
        target.role === "executor"
          ? routeMode.tone
          : target.role
            ? providerLabel === "Claude"
              ? "amber"
              : "zinc"
            : "green"
    },
    {
      label: "当前入口",
      value:
        routeMode.value === "已接受"
          ? "无需继续"
          : surfaceLabel,
      detail:
        routeMode.value === "已接受"
          ? "当前这轮验收已经闭环，不需要再回到指挥入口推进。"
          : `当前这道验收门默认仍从 ${surfaceLabel} 继续，由 Conductor 负责组织下一步。`,
      tone: routeMode.value === "已接受" ? "green" : "blue"
    },
    {
      label: "推进路径",
      value: routeMode.value,
      detail: routeMode.detail,
      tone: routeMode.tone
    }
  ];
}
