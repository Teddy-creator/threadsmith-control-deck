import type { ActionRecommendation, SupervisorState } from "@threadsmith/runtime";
import { formatProviderLabel } from "../../deckViewModels";
import { formatRole, formatRoleStatus } from "../../../display/labels";
import {
  formatRuntimeAction,
  pickLatestFailureStageTone,
  pickLatestTaskOutcomeTone
} from "../shared";
import type {
  AppHomeActionInspectorProps,
  ProjectActionInspectorProps
} from "./types";

interface BuildAppHomeActionInspectorModelArgs {
  homepageActionSummary: AppHomeActionInspectorProps["homepageActionSummary"];
  homepageStopCondition: AppHomeActionInspectorProps["homepageStopCondition"];
  homepageConversationPath: AppHomeActionInspectorProps["homepageConversationPath"];
  dailyEntryProjectIdentityName: string | null;
  dailyEntryProjectRoot: string | null;
  primaryRecentProjectIdentityName: string | null;
  primaryRecentProjectRoot: string | null;
  onConnectCustomProject: (projectRoot: string) => void;
  onConnectNewProject: () => void;
}

interface BuildProjectActionInspectorModelArgs {
  action: ActionRecommendation;
  commandBridge: SupervisorState["commandBridge"] | null;
  projectRoot: string;
  executionMode: ProjectActionInspectorProps["executionMode"];
  primaryActionUsesAutomationBridge: boolean;
  activeExecutionItems: Array<{
    role: string;
    status: string;
    taskSummary: string;
    requiresUserDecision: boolean;
  }>;
  sequence: ActionRecommendation[];
}

export type AppHomeActionInspectorModel = Omit<
  AppHomeActionInspectorProps,
  "mode" | "openProjectWorkbench"
>;

export type ProjectActionInspectorModel = Omit<
  ProjectActionInspectorProps,
  "mode" | "openProjectWorkbench" | "openPrimaryActionPreview"
>;

export function buildAppHomeActionInspectorModel(
  args: BuildAppHomeActionInspectorModelArgs
): AppHomeActionInspectorModel {
  return {
    homepageActionSummary: args.homepageActionSummary,
    homepageStopCondition: args.homepageStopCondition,
    homepageConversationPath: args.homepageConversationPath,
    entryOptions: [
      {
        label: "默认项目",
        headline: args.dailyEntryProjectIdentityName ?? "当前还没有设置",
        detail: args.dailyEntryProjectIdentityName
          ? "如果今天继续主线开发，直接从这里回到默认项目最顺。"
          : "先到项目工作台里把一个真实项目设成默认进入。",
        action: args.dailyEntryProjectIdentityName && args.dailyEntryProjectRoot
          ? {
              label: `打开默认项目 ${args.dailyEntryProjectIdentityName}`,
              onClick: () => args.onConnectCustomProject(args.dailyEntryProjectRoot!)
            }
          : null
      },
      {
        label: "最近项目",
        headline: args.primaryRecentProjectIdentityName ?? "当前还没有记录",
        detail: args.primaryRecentProjectIdentityName
          ? "如果今天临时切线，可以直接从最近项目继续。"
          : "一旦连接过真实项目，这里会自动出现恢复入口。",
        action: args.primaryRecentProjectIdentityName && args.primaryRecentProjectRoot
          ? {
              label: `继续最近项目 ${args.primaryRecentProjectIdentityName}`,
              onClick: () => args.onConnectCustomProject(args.primaryRecentProjectRoot!)
            }
          : null
      },
      {
        label: "首次连接",
        headline: "连接新项目",
        detail: "如果今天是新项目，就去项目工作台输入根目录并初始化最小 `.threadsmith`。",
        action: {
          label: "连接新项目",
          onClick: args.onConnectNewProject
        }
      }
    ]
  };
}

export function buildProjectActionInspectorModel(
  args: BuildProjectActionInspectorModelArgs
): ProjectActionInspectorModel {
  return {
    actionLabel: args.action.label,
    actionBadgeLabel: formatRuntimeAction(args.action.actionId),
    expectedRoleLabels: args.action.expectedRoles.map((role) => formatRole(role)),
    actionReason: args.action.reason,
    actionStopCondition: args.action.stopCondition,
    activeExecutionItems: args.activeExecutionItems.map((item) => ({
      roleLabel: formatRole(item.role),
      taskSummary: item.taskSummary,
      statusTone:
        item.status === "blocked" ? "red" : item.status === "running" ? "amber" : "zinc",
      statusLabel: formatRoleStatus(item.status),
      requiresUserDecision: item.requiresUserDecision
    })),
    sequence: args.sequence.map((step) => ({
      actionId: step.actionId,
      label: step.label,
      reason: step.reason
    })),
    manualBridgeTitle: args.primaryActionUsesAutomationBridge
      ? "手动启动桥接"
      : "手动确认这一步",
    executionMode: args.executionMode,
    primaryActionUsesAutomationBridge: args.primaryActionUsesAutomationBridge,
    recommendedRouteCard: {
      title: args.commandBridge?.recommendedRoute ? "推荐路由" : "桥接状态",
      headline: args.commandBridge?.recommendedRoute
        ? `${formatRole(args.commandBridge.recommendedRoute.targetRole)} · ${formatProviderLabel(args.commandBridge.recommendedRoute.provider)}`
        : "当前建议不走自动执行桥",
      detail: args.commandBridge?.recommendedRoute
        ? args.commandBridge.recommendedRoute.detail
        : (args.commandBridge?.action.bridgeReason ?? "当前建议回到指挥官聊天推进。"),
      badges: args.commandBridge?.recommendedRoute
        ? [
            {
              tone:
                args.commandBridge.recommendedRoute.availability === "available" ? "amber" : "zinc",
              label: args.commandBridge.recommendedRoute.availabilityLabel
            },
            { tone: "zinc", label: args.commandBridge.recommendedRoute.bridgeSurfaceLabel }
          ]
        : [{ tone: "zinc", label: "回到 Conductor 聊天" }],
      meta: []
    },
    latestResultCard: {
      title: "最近一次桥接结果",
      headline: args.commandBridge?.latestResult.headline ?? "还没有桥接结果",
      detail: args.commandBridge?.latestResult.detail ?? "等待第一次桥接执行。",
      badges: [
        {
          tone:
            args.commandBridge?.latestResult.status === "failed"
              ? "red"
              : args.commandBridge?.latestResult.status === "succeeded"
                ? "green"
                : args.commandBridge?.latestResult.status === "running" ||
                    args.commandBridge?.latestResult.status === "queued"
                  ? "amber"
                  : "zinc",
          label: args.commandBridge?.latestResult.statusLabel ?? "暂无记录"
        },
        ...(args.commandBridge?.latestResult.taskOutcomeLabel
          ? [
              {
                tone: pickLatestTaskOutcomeTone(args.commandBridge.latestResult.taskOutcome),
                label: args.commandBridge.latestResult.taskOutcomeLabel
              }
            ]
          : []),
        ...(args.commandBridge?.latestResult.failureStageLabel
          ? [
              {
                tone: pickLatestFailureStageTone(args.commandBridge.latestResult.failureStage),
                label: args.commandBridge.latestResult.failureStageLabel
              }
            ]
          : []),
        ...(args.commandBridge?.latestResult.failureKindLabel
          ? [{ tone: "zinc", label: args.commandBridge.latestResult.failureKindLabel }]
          : [])
      ],
      meta: [
        ...(args.commandBridge?.latestResult.runId
          ? [`运行 ID · ${args.commandBridge.latestResult.runId}`]
          : []),
        ...(args.commandBridge?.latestResult.truthWritebackLabel
          ? [args.commandBridge.latestResult.truthWritebackLabel]
          : [])
      ]
    },
    fallbackRouteCard: {
      title: args.commandBridge?.fallbackRoute ? "Fallback / 出错后怎么办" : "默认路径",
      headline: args.commandBridge?.fallbackRoute
        ? args.commandBridge.fallbackRoute.detail
        : "当前建议默认回到 Conductor 聊天，不建议直接启动 executor run。",
      detail: args.commandBridge?.fallbackRoute
        ? "当推荐路由不可用或失败时，可以按这条退路继续。"
        : (args.commandBridge?.action.bridgeReason ?? "优先回到指挥官聊天继续推进。"),
      badges: args.commandBridge?.fallbackRoute
        ? [
            {
              tone: args.commandBridge.fallbackRoute.availability === "available" ? "amber" : "zinc",
              label: args.commandBridge.fallbackRoute.availabilityLabel
            },
            { tone: "zinc", label: args.commandBridge.fallbackRoute.bridgeSurfaceLabel }
          ]
        : [],
      meta: args.commandBridge?.fallbackRoute
        ? [`目标项目 · ${args.commandBridge.projectLabel}`, args.projectRoot]
        : []
    }
  };
}
