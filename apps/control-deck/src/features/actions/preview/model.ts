import type { ActionRecommendation, CommandBridgeSummary } from "@threadsmith/runtime";
import { formatRole } from "../../display/labels";
import { formatEventTime } from "../../events/formatters";

type PromptCopyState = "idle" | "copied" | "failed";
type ExecutionMode = "action" | "direct-run" | null;

export interface PreviewDetailRow {
  label: string;
  value: string;
}

export interface PreviewCardModel {
  kicker: string;
  title: string;
  detail: string;
  rows: PreviewDetailRow[];
  path?: string | null;
}

export interface ActionPreviewViewModel {
  headerKicker: string;
  showContinuationControls: boolean;
  showAutomationBridgeCopy: boolean;
  showDirectRunFallback: boolean;
  suggestedPrompt: string | null;
  promptCopyLabel: string;
  heroIcon: "spark" | "target";
  modeSummary: string;
  routeCard: PreviewCardModel;
  latestRouteCard: PreviewCardModel;
  latestResultCard: PreviewCardModel;
  fallbackCard: PreviewCardModel;
  promptCardDescription: string | null;
  primaryActionLabel: string;
  directRunLabel: string;
}

function formatProvider(provider: "codex" | "claude") {
  return provider === "codex" ? "Codex" : "Claude";
}

export function buildActionPreviewViewModel(args: {
  action: ActionRecommendation;
  projectRoot: string;
  commandBridge: CommandBridgeSummary;
  executionMode: ExecutionMode;
  promptCopyState: PromptCopyState;
}): ActionPreviewViewModel {
  const showContinuationControls = args.action.actionId === "create-handoff";
  const showAutomationBridgeCopy = args.action.actionId === "advance-phase";
  const showDirectRunFallback =
    showAutomationBridgeCopy &&
    args.commandBridge.fallbackRoute?.availability === "available";
  const recommendedRouteUnavailable =
    showAutomationBridgeCopy &&
    args.commandBridge.recommendedRoute?.availability === "unavailable";
  const suggestedPrompt = recommendedRouteUnavailable
    ? args.commandBridge.recommendedRoute?.suggestedPrompt ?? null
    : null;
  const latestRouteRecordedAt = args.commandBridge.latestRoute.recordedAt
    ? formatEventTime(args.commandBridge.latestRoute.recordedAt)
    : "未记录";
  const latestResultRecordedAt = args.commandBridge.latestResult.recordedAt
    ? formatEventTime(args.commandBridge.latestResult.recordedAt)
    : "未记录";

  return {
    headerKicker: showAutomationBridgeCopy ? "Command bridge 确认" : "动作确认",
    showContinuationControls,
    showAutomationBridgeCopy,
    showDirectRunFallback,
    suggestedPrompt,
    promptCopyLabel:
      args.promptCopyState === "copied"
        ? "已复制交接提示词"
        : args.promptCopyState === "failed"
          ? "复制失败"
          : "复制交接提示词",
    heroIcon: showContinuationControls ? "spark" : "target",
    modeSummary: showContinuationControls
      ? "会生成 continuation packet，并决定后续线程行为。"
      : recommendedRouteUnavailable
        ? "当前默认路由已经配置，但这条 provider 还不能由 Threadsmith 自动执行，应回到当前入口继续推进。"
        : showAutomationBridgeCopy
          ? "可按推荐路由签发，也可以在必要时直接启动 executor run。"
          : "当前建议默认回到指挥官聊天推进，这里只保留手动确认入口。",
    routeCard: {
      kicker: args.commandBridge.recommendedRoute ? "推荐路由" : "桥接状态",
      title: args.commandBridge.recommendedRoute
        ? `${formatRole(args.commandBridge.recommendedRoute.targetRole)} · ${formatProvider(args.commandBridge.recommendedRoute.provider)}`
        : "当前建议不走自动执行桥",
      rows: [
        {
          label: "状态",
          value: args.commandBridge.recommendedRoute?.availabilityLabel ?? "回到 Conductor 聊天"
        },
        ...(args.commandBridge.recommendedRoute
          ? [
              {
                label: "桥接面",
                value: args.commandBridge.recommendedRoute.bridgeSurfaceLabel
              }
            ]
          : []),
        {
          label: "目标项目",
          value: args.commandBridge.projectLabel
        }
      ],
      detail:
        args.commandBridge.recommendedRoute?.detail ?? args.commandBridge.action.bridgeReason,
      path: args.projectRoot
    },
    latestRouteCard: {
      kicker: "最近一次桥接路由",
      title: args.commandBridge.latestRoute.headline,
      rows: [
        {
          label: "状态",
          value: args.commandBridge.latestRoute.statusLabel
        },
        {
          label: "桥接面",
          value: args.commandBridge.latestRoute.bridgeSurfaceLabel ?? "未记录"
        },
        {
          label: "时间",
          value: latestRouteRecordedAt
        }
      ],
      detail: args.commandBridge.latestRoute.detail,
      path: args.commandBridge.latestRoute.artifactPath
    },
    latestResultCard: {
      kicker: "最近一次桥接结果",
      title: args.commandBridge.latestResult.headline,
      rows: [
        {
          label: "状态",
          value: args.commandBridge.latestResult.statusLabel
        },
        ...(args.commandBridge.latestResult.taskOutcomeLabel
          ? [
              {
                label: "任务体",
                value: args.commandBridge.latestResult.taskOutcomeLabel
              }
            ]
          : []),
        ...(args.commandBridge.latestResult.failureStageLabel
          ? [
              {
                label: "失败阶段",
                value: args.commandBridge.latestResult.failureStageLabel
              }
            ]
          : []),
        ...(args.commandBridge.latestResult.failureKindLabel
          ? [
              {
                label: "原因分类",
                value: args.commandBridge.latestResult.failureKindLabel
              }
            ]
          : []),
        {
          label: "写回",
          value: args.commandBridge.latestResult.truthWritebackLabel
        },
        {
          label: "时间",
          value: latestResultRecordedAt
        }
      ],
      detail: args.commandBridge.latestResult.detail,
      path: args.commandBridge.latestResult.artifactPath
    },
    fallbackCard: {
      kicker: args.commandBridge.fallbackRoute ? "Fallback / 出错后怎么办" : "默认路径",
      title: args.commandBridge.fallbackRoute
        ? `${formatRole(args.commandBridge.fallbackRoute.targetRole)} · ${formatProvider(args.commandBridge.fallbackRoute.provider)}`
        : "优先回到 Conductor 聊天",
      rows: [
        {
          label: "入口",
          value: args.commandBridge.fallbackRoute?.bridgeSurfaceLabel ?? "Conductor 聊天"
        },
        {
          label: "状态",
          value: args.commandBridge.fallbackRoute?.availabilityLabel ?? "默认路径"
        }
      ],
      detail: args.commandBridge.fallbackRoute?.detail ?? args.commandBridge.action.bridgeReason
    },
    promptCardDescription: suggestedPrompt
      ? "这条 provider 路由已经配置，但当前还不能由 Threadsmith 自动执行。把下面这段带回当前入口即可继续。"
      : null,
    primaryActionLabel: suggestedPrompt
      ? args.promptCopyState === "copied"
        ? "已复制交接提示词"
        : args.promptCopyState === "failed"
          ? "复制失败"
          : "复制交接提示词"
      : args.executionMode === "action"
        ? showAutomationBridgeCopy
          ? "正在按推荐路由签发..."
          : "正在启动..."
        : showAutomationBridgeCopy
          ? "按推荐路由签发"
          : "确认启动",
    directRunLabel:
      args.executionMode === "direct-run" ? "正在直接启动..." : "直接启动 executor run"
  };
}
