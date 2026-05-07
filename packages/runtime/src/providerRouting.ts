import type {
  ConductorSurface,
  PhaseOwner,
  ProjectSupervisionLine,
  ProviderId,
  ProviderRouting
} from "@threadsmith/domain";

export interface ResolvedRoleProvider {
  provider: ProviderId;
  providerLabel: string;
  source: "live" | "routing";
}

export interface RouteSupportSummary {
  availability: "available" | "unavailable";
  availabilityLabel: string;
  bridgeSurfaceLabel: string;
  detail: string;
  bridgeEnabled: boolean;
}

export function formatProviderLabel(
  provider: ProviderId | null | undefined
) {
  switch (provider) {
    case "codex":
      return "Codex";
    case "claude":
      return "Claude";
    default:
      return null;
  }
}

export function formatConductorSurfaceLabel(
  surface: ConductorSurface | null | undefined
) {
  switch (surface) {
    case "codex-cli":
      return "Codex CLI";
    case "claude-cli":
      return "Claude CLI";
    case "codex-desktop":
    default:
      return "Codex Desktop";
  }
}

export function resolveRoleProvider(args: {
  role: PhaseOwner;
  line?: ProjectSupervisionLine | null;
  routing?: ProviderRouting | null;
}): ResolvedRoleProvider {
  if (args.line?.presence === "live" && args.line.provider) {
    return {
      provider: args.line.provider,
      providerLabel: formatProviderLabel(args.line.provider) ?? args.line.provider,
      source: "live"
    };
  }

  const provider = args.routing?.[args.role] ?? "codex";

  return {
    provider,
    providerLabel: formatProviderLabel(provider) ?? provider,
    source: "routing"
  };
}

export function describeRouteSupport(args: {
  provider: ProviderId;
  conductorSurface: ConductorSurface | null | undefined;
  routeKind: "workflow-recommended" | "direct-run-fallback";
  busy: boolean;
}): RouteSupportSummary {
  if (args.provider === "claude") {
    const surfaceLabel = formatConductorSurfaceLabel(args.conductorSurface);

    return {
      availability: "unavailable",
      availabilityLabel: "已配置，暂不支持自动执行",
      bridgeSurfaceLabel: `回到当前入口（${surfaceLabel}）`,
      detail: `该角色已路由到 Claude；auto-execution v1 仅支持 Codex，请回到当前入口（${surfaceLabel}）继续。`,
      bridgeEnabled: false
    };
  }

  if (args.busy) {
    return {
      availability: "unavailable",
      availabilityLabel:
        args.routeKind === "direct-run-fallback" ? "暂不建议重复启动" : "已有运行中",
      bridgeSurfaceLabel:
        args.routeKind === "direct-run-fallback"
          ? "Direct run -> Codex CLI"
          : "Deck 推荐动作 -> Codex CLI",
      detail:
        "当前已经有一轮 Builder 自动执行在跑，先等待结果回流，再决定是否继续桥接。",
      bridgeEnabled: false
    };
  }

  return {
    availability: "available",
    availabilityLabel:
      args.routeKind === "direct-run-fallback" ? "可作为备用入口" : "可桥接",
    bridgeSurfaceLabel:
      args.routeKind === "direct-run-fallback"
        ? "Direct run -> Codex CLI"
        : "Deck 推荐动作 -> Codex CLI",
    detail:
      args.routeKind === "direct-run-fallback"
        ? "跳过 workflow 推荐动作，直接启动一轮 executor run。它适合调试 bridge 或紧急重试，不适合作为默认推进方式。"
        : "先签发 workflow 推荐动作，再通过 Codex CLI 启动 Builder 自动执行，并把结果回流到当前项目 truth。",
    bridgeEnabled: true
  };
}

export function isAllCodexRouting(
  routing: ProviderRouting | null | undefined
) {
  return (
    (routing?.planner ?? "codex") === "codex" &&
    (routing?.executor ?? "codex") === "codex" &&
    (routing?.reviewer ?? "codex") === "codex" &&
    (routing?.verifier ?? "codex") === "codex" &&
    (routing?.closeout ?? "codex") === "codex"
  );
}
