import type {
  AgentRunRecord,
  CommandBridgeState,
  PhaseOwner,
  ProjectState,
  ProviderId,
  ProviderRouting
} from "@threadsmith/domain";
import type { ActionRecommendation, RuntimeActionId } from "./nextBestStep.ts";
import {
  describeRouteSupport,
  formatConductorSurfaceLabel
} from "./providerRouting.ts";

export interface CommandBridgeActionSummary {
  actionId: RuntimeActionId;
  label: string;
  bridgeEnabled: boolean;
  bridgeReason: string;
}

export interface CommandBridgeRouteSummary {
  kind: "workflow-recommended" | "direct-run-fallback";
  label: string;
  provider: ProviderId;
  targetRole: PhaseOwner;
  targetProjectLabel: string;
  availability: "available" | "unavailable";
  availabilityLabel: string;
  bridgeSurfaceLabel: string;
  detail: string;
  suggestedPrompt: string | null;
  artifactPath: string | null;
}

export interface CommandBridgeLatestRouteSummary {
  status: "missing" | "dispatched" | "running" | "succeeded" | "failed";
  statusLabel: string;
  headline: string;
  detail: string;
  provider: ProviderId | null;
  targetRole: PhaseOwner | null;
  recordedAt: string | null;
  artifactPath: string | null;
  routeId: string | null;
  bridgeSurfaceLabel: string | null;
}

export interface CommandBridgeLatestResultSummary {
  status: AgentRunRecord["status"] | "missing";
  statusLabel: string;
  headline: string;
  detail: string;
  taskOutcome: AgentRunRecord["taskOutcome"] | null;
  taskOutcomeLabel: string | null;
  failureStage: AgentRunRecord["failureStage"] | null;
  failureStageLabel: string | null;
  failureKind: AgentRunRecord["failureKind"] | null;
  failureKindLabel: string | null;
  recordedAt: string | null;
  truthWritebackLabel: string;
  artifactPath: string | null;
  runId: string | null;
}

export interface CommandBridgeSummary {
  projectLabel: string;
  action: CommandBridgeActionSummary;
  recommendedRoute: CommandBridgeRouteSummary | null;
  fallbackRoute: CommandBridgeRouteSummary | null;
  latestRoute: CommandBridgeLatestRouteSummary;
  latestResult: CommandBridgeLatestResultSummary;
}

function isAutomationBridgeAction(action: ActionRecommendation) {
  return action.actionId === "advance-phase";
}

function pickLatestArtifactPath(run: AgentRunRecord | null) {
  if (!run) {
    return null;
  }

  return (
    run.summaryPath ??
    run.resultPath ??
    run.stderrPath ??
    run.stdoutPath ??
    run.promptPath ??
    run.packetPath
  );
}

function latestResultStatusLabel(status: CommandBridgeLatestResultSummary["status"]) {
  switch (status) {
    case "queued":
      return "已排队";
    case "running":
      return "执行中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelled":
      return "已取消";
    default:
      return "暂无记录";
  }
}

function latestResultRunId(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  return commandBridgeState?.latestRun?.runId ?? run?.runId ?? null;
}

function latestRouteRunMismatch(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  const latestRouteRunId = commandBridgeState?.latestRoute?.runId ?? null;
  const latestRunId = latestResultRunId(run, commandBridgeState);

  return (
    latestRouteRunId !== null &&
    latestRunId !== null &&
    latestRouteRunId !== latestRunId
  );
}

function resolveLatestRunStatus(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  return commandBridgeState?.latestRun?.status ?? run?.status ?? "missing";
}

function resolveTaskOutcome(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  return commandBridgeState?.latestRun?.taskOutcome ?? run?.taskOutcome ?? null;
}

function resolveFailureStage(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  return commandBridgeState?.latestRun?.failureStage ?? run?.failureStage ?? null;
}

function resolveFailureKind(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  return commandBridgeState?.latestRun?.failureKind ?? run?.failureKind ?? null;
}

function isReportingFailureAfterSuccessfulTask(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  return (
    resolveLatestRunStatus(run, commandBridgeState) === "failed" &&
    resolveTaskOutcome(run, commandBridgeState) === "succeeded" &&
    resolveFailureStage(run, commandBridgeState) === "result-reporting"
  );
}

function taskOutcomeLabel(
  taskOutcome: AgentRunRecord["taskOutcome"] | null
) {
  switch (taskOutcome) {
    case "succeeded":
      return "任务体已完成";
    case "failed":
      return "任务体未完成";
    case "unknown":
      return "任务体未确认";
    default:
      return null;
  }
}

function failureStageLabel(
  failureStage: AgentRunRecord["failureStage"] | null
) {
  switch (failureStage) {
    case "result-reporting":
      return "失败于结果上报";
    case "task":
      return "失败于任务执行";
    case "cli-startup":
      return "失败于 CLI 启动";
    case "unknown":
      return "失败阶段未确认";
    default:
      return null;
  }
}

function failureKindLabel(
  failureKind: AgentRunRecord["failureKind"] | null
) {
  switch (failureKind) {
    case "rate-limit":
      return "rate limit";
    case "missing-structured-result":
      return "缺少结构化结果";
    case "cli-exit":
      return "CLI 异常退出";
    case "cli-startup":
      return "CLI 启动失败";
    case "unknown":
      return "原因未分类";
    default:
      return null;
  }
}

function latestResultHeadline(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  const status = resolveLatestRunStatus(run, commandBridgeState);

  if (status === "missing") {
    return "还没有桥接结果";
  }

  if (isReportingFailureAfterSuccessfulTask(run, commandBridgeState)) {
    return "最近一次桥接卡在结果上报";
  }

  switch (status) {
    case "queued":
      return "最近一次桥接已经排队";
    case "running":
      return "最近一次桥接正在执行";
    case "succeeded":
      return "最近一次桥接已完成";
    case "failed":
      return "最近一次桥接失败";
    case "cancelled":
      return "最近一次桥接已取消";
    default:
      return "还没有桥接结果";
  }
}

function latestResultDetail(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  const persistedSummary = commandBridgeState?.latestRun?.summary?.trim();
  const detachedRouteNote = latestRouteRunMismatch(run, commandBridgeState)
    ? "注意：这次最新运行没有刷新 latestRoute，最近桥接仍停留在更早的一轮。"
    : null;

  if (persistedSummary) {
    return detachedRouteNote
      ? `${persistedSummary} ${detachedRouteNote}`
      : persistedSummary;
  }

  if (!run) {
    return "第一次签发 command bridge 后，这里会显示最近一次 route / run 的摘要。";
  }

  if (isReportingFailureAfterSuccessfulTask(run, commandBridgeState)) {
    const kindLabel = failureKindLabel(resolveFailureKind(run, commandBridgeState));
    return kindLabel
      ? `任务主体已完成，但桥接结果在上报阶段失败（${kindLabel}）；请优先处理 CLI / bridge 回流问题。`
      : "任务主体已完成，但桥接结果在上报阶段失败；请优先处理 CLI / bridge 回流问题。";
  }

  if (run.statusDetail?.trim()) {
    return detachedRouteNote
      ? `${run.statusDetail.trim()} ${detachedRouteNote}`
      : run.statusDetail.trim();
  }

  let detail: string;
  switch (run.status) {
    case "queued":
      detail = "命令已经入队，等待真正启动 Codex CLI。";
      break;
    case "running":
      detail = "命令已经发给 Builder，等待结果回流到 Threadsmith。";
      break;
    case "succeeded":
      detail = "这轮自动执行已经完成，结果与产物应该已写回当前项目。";
      break;
    case "failed":
      detail = "这轮自动执行没有完成，需要先处理失败原因再决定是否重试。";
      break;
    case "cancelled":
      detail = "这轮自动执行已被取消，可按需重新签发。";
      break;
    default:
      detail = "第一次签发 command bridge 后，这里会显示最近一次 route / run 的摘要。";
      break;
  }

  return detachedRouteNote ? `${detail} ${detachedRouteNote}` : detail;
}

function truthWritebackLabel(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  const persisted = commandBridgeState?.latestRun?.truthWritebackStatus;

  switch (persisted) {
    case "written":
      return "已写回 truth";
    case "failed-written":
      return "失败结果已写回";
    case "cancelled-written":
      return "已写回取消状态";
    case "pending":
      return "等待结果回流";
    default:
      break;
  }

  if (!run) {
    return "尚未写回 truth";
  }

  switch (run.status) {
    case "queued":
    case "running":
      return "等待结果回流";
    case "succeeded":
      return "已写回 truth";
    case "failed":
      return "失败结果已写回";
    case "cancelled":
      return "已写回取消状态";
    default:
      return "尚未写回 truth";
  }
}

function buildLatestResult(
  run: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
): CommandBridgeLatestResultSummary {
  const recordedAt =
    commandBridgeState?.latestRun?.recordedAt ??
    run?.finishedAt ??
    run?.startedAt ??
    run?.createdAt ??
    null;
  const status = resolveLatestRunStatus(run, commandBridgeState);
  const taskOutcome = resolveTaskOutcome(run, commandBridgeState);
  const failureStage = resolveFailureStage(run, commandBridgeState);
  const failureKind = resolveFailureKind(run, commandBridgeState);

  return {
    status,
    statusLabel: latestResultStatusLabel(status),
    headline: latestResultHeadline(run, commandBridgeState),
    detail: latestResultDetail(run, commandBridgeState),
    taskOutcome,
    taskOutcomeLabel: taskOutcomeLabel(taskOutcome),
    failureStage,
    failureStageLabel: failureStageLabel(failureStage),
    failureKind,
    failureKindLabel: failureKindLabel(failureKind),
    recordedAt,
    truthWritebackLabel: truthWritebackLabel(run, commandBridgeState),
    artifactPath:
      commandBridgeState?.latestRun?.artifactPath ?? pickLatestArtifactPath(run),
    runId: commandBridgeState?.latestRun?.runId ?? run?.runId ?? null
  };
}

function latestRouteStatusLabel(
  status: CommandBridgeLatestRouteSummary["status"]
) {
  switch (status) {
    case "dispatched":
      return "已签发";
    case "running":
      return "运行中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return "暂无记录";
  }
}

function latestRouteHeadline(commandBridgeState: CommandBridgeState | null | undefined) {
  const latestRoute = commandBridgeState?.latestRoute;

  if (!latestRoute) {
    return "还没有桥接路由";
  }

  switch (latestRoute.status) {
    case "running":
      return "最近一次桥接路由正在执行";
    case "succeeded":
      return "最近一次桥接路由已完成";
    case "failed":
      return "最近一次桥接路由失败";
    default:
      return "最近一次桥接路由已签发";
  }
}

function latestRouteDetail(commandBridgeState: CommandBridgeState | null | undefined) {
  const latestRoute = commandBridgeState?.latestRoute;
  const latestRun = commandBridgeState?.latestRun;

  if (!latestRoute) {
    return "第一次签发 command bridge 后，这里会记录最新 route 的桥接面、状态和 artifact。";
  }

  const baseDetail = latestRoute.statusDetail?.trim()
    ? latestRoute.statusDetail.trim()
    : "最近一次 route 已记录到 committed truth。";

  if (
    latestRun?.runId &&
    latestRoute.runId &&
    latestRun.runId !== latestRoute.runId
  ) {
    return `${baseDetail} 注意：最新运行已经换成另一轮，当前这条 route 不是最新运行对应的桥接记录。`;
  }

  return baseDetail;
}

function latestRouteSurfaceLabel(
  commandBridgeState: CommandBridgeState | null | undefined,
  providerRouting: ProviderRouting | null | undefined
) {
  const latestRoute = commandBridgeState?.latestRoute;

  if (!latestRoute) {
    return null;
  }

  if (latestRoute.provider === "claude") {
    return `回到当前入口（${formatConductorSurfaceLabel(providerRouting?.conductorSurface)})`;
  }

  return latestRoute.surface === "direct-run"
    ? "Direct run -> Codex CLI"
    : "Deck 推荐动作 -> Codex CLI";
}

function buildLatestRoute(
  commandBridgeState: CommandBridgeState | null | undefined,
  providerRouting: ProviderRouting | null | undefined
): CommandBridgeLatestRouteSummary {
  const latestRoute = commandBridgeState?.latestRoute ?? null;

  return {
    status: latestRoute?.status ?? "missing",
    statusLabel: latestRouteStatusLabel(latestRoute?.status ?? "missing"),
    headline: latestRouteHeadline(commandBridgeState),
    detail: latestRouteDetail(commandBridgeState),
    provider: latestRoute?.provider ?? null,
    targetRole: latestRoute?.targetRole ?? null,
    recordedAt: latestRoute?.updatedAt ?? latestRoute?.createdAt ?? null,
    artifactPath: latestRoute?.artifactPath ?? null,
    routeId: latestRoute?.routeId ?? null,
    bridgeSurfaceLabel: latestRouteSurfaceLabel(commandBridgeState, providerRouting)
  };
}

function formatRoleForPrompt(role: PhaseOwner) {
  switch (role) {
    case "planner":
      return "规划";
    case "executor":
      return "执行";
    case "reviewer":
      return "评审";
    case "verifier":
      return "验证";
    case "closeout":
      return "收尾";
    default:
      return role;
  }
}

function formatProviderForPrompt(provider: ProviderId) {
  switch (provider) {
    case "claude":
      return "Claude";
    case "codex":
    default:
      return "Codex";
  }
}

function buildUnsupportedRouteSuggestedPrompt(args: {
  state: ProjectState;
  action: ActionRecommendation;
  provider: ProviderId;
  targetRole: PhaseOwner;
  providerRouting: ProviderRouting | null | undefined;
}) {
  const providerLabel = formatProviderForPrompt(args.provider);
  const roleLabel = formatRoleForPrompt(args.targetRole);
  const surfaceLabel = formatConductorSurfaceLabel(
    args.providerRouting?.conductorSurface
  );

  return [
    `请继续推进当前项目，并让 ${providerLabel} 承接这一步。`,
    "",
    `项目：${args.state.projectStatus.projectLabel}`,
    `当前 phase：${args.state.currentPhase.phaseName}`,
    `当前建议动作：${args.action.label}`,
    `动作原因：${args.action.reason}`,
    `当前阶段出口：${args.state.currentPhase.stopCondition}`,
    `本轮停止条件：${args.action.stopCondition}`,
    `执行归属：${roleLabel} -> ${providerLabel}`,
    `当前指挥入口：${surfaceLabel}`,
    "",
    `请在当前入口继续担任指挥，向 ${providerLabel} 的${roleLabel}角色发出下一步实现指令；完成后返回验证结果、残留风险，以及下一步建议。`
  ].join("\n");
}

function buildUnavailableSummary(
  state: ProjectState,
  action: ActionRecommendation,
  latestRun: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined,
  providerRouting: ProviderRouting | null | undefined
): CommandBridgeSummary {
  const failureReason =
    latestRun?.status === "running"
      ? "当前已经有一轮自动执行在跑，先等待结果回流，再决定要不要重新签发。"
      : "当前推荐动作不是自动执行桥，默认应回到 Conductor 聊天继续推进。";

  return {
    projectLabel: state.projectStatus.projectLabel,
    action: {
      actionId: action.actionId,
      label: action.label,
      bridgeEnabled: false,
      bridgeReason: failureReason
    },
    recommendedRoute: null,
    fallbackRoute: null,
    latestRoute: buildLatestRoute(commandBridgeState, providerRouting),
    latestResult: buildLatestResult(latestRun, commandBridgeState)
  };
}

function isRouteBusy(
  latestRun: AgentRunRecord | null,
  commandBridgeState: CommandBridgeState | null | undefined
) {
  return resolveLatestRunStatus(latestRun, commandBridgeState) === "running";
}

export function deriveCommandBridgeSummary(
  state: ProjectState,
  action: ActionRecommendation,
  latestRun: AgentRunRecord | null = null,
  commandBridgeState: CommandBridgeState | null | undefined = null,
  providerRouting: ProviderRouting | null = null
): CommandBridgeSummary {
  if (!isAutomationBridgeAction(action)) {
    return buildUnavailableSummary(
      state,
      action,
      latestRun,
      commandBridgeState,
      providerRouting
    );
  }

  const routeProvider = providerRouting?.executor ?? "codex";
  const routeSupport = describeRouteSupport({
    provider: routeProvider,
    conductorSurface: providerRouting?.conductorSurface,
    routeKind: "workflow-recommended",
    busy: isRouteBusy(latestRun, commandBridgeState)
  });
  const fallbackSupport =
    routeProvider === "codex"
      ? describeRouteSupport({
          provider: routeProvider,
          conductorSurface: providerRouting?.conductorSurface,
          routeKind: "direct-run-fallback",
          busy: isRouteBusy(latestRun, commandBridgeState)
        })
      : null;
  const projectLabel = state.projectStatus.projectLabel;

  return {
    projectLabel,
    action: {
      actionId: action.actionId,
      label: action.label,
      bridgeEnabled: routeSupport.bridgeEnabled,
      bridgeReason: routeSupport.bridgeEnabled
        ? action.reason
        : routeSupport.detail
    },
    recommendedRoute: {
      kind: "workflow-recommended",
      label: "推荐路由",
      provider: routeProvider,
      targetRole: "executor",
      targetProjectLabel: projectLabel,
      availability: routeSupport.availability,
      availabilityLabel: routeSupport.availabilityLabel,
      bridgeSurfaceLabel: routeSupport.bridgeSurfaceLabel,
      detail: routeSupport.detail,
      suggestedPrompt:
        routeProvider === "codex"
          ? null
          : buildUnsupportedRouteSuggestedPrompt({
              state,
              action,
              provider: routeProvider,
              targetRole: "executor",
              providerRouting
            }),
      artifactPath:
        commandBridgeState?.latestRoute?.surface === "deck-action-bridge"
          ? commandBridgeState.latestRoute.artifactPath
          : null
    },
    fallbackRoute: fallbackSupport
      ? {
          kind: "direct-run-fallback",
          label: "直接运行 fallback",
          provider: routeProvider,
          targetRole: "executor",
          targetProjectLabel: projectLabel,
          availability: fallbackSupport.availability,
          availabilityLabel: fallbackSupport.availabilityLabel,
          bridgeSurfaceLabel: fallbackSupport.bridgeSurfaceLabel,
          detail:
            latestRun?.status === "failed"
              ? "如果你已经确认失败仍落在当前 slice 内，可以直接重试 executor run；但默认仍建议先回到 Conductor 聊天收束修复动作。"
              : fallbackSupport.detail,
          suggestedPrompt: null,
          artifactPath:
            commandBridgeState?.latestRoute?.surface === "direct-run"
              ? commandBridgeState.latestRoute.artifactPath
              : null
        }
      : null,
    latestRoute: buildLatestRoute(commandBridgeState, providerRouting),
    latestResult: buildLatestResult(latestRun, commandBridgeState)
  };
}
