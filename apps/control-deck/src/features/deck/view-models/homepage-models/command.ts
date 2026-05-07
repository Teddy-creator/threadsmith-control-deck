import { formatConductorSurfaceLabel, type SupervisorState } from "@threadsmith/runtime";
import type {
  HomepageCommandCardViewModel,
  HomepageEntryAction
} from "../../screen/HomepageCommandCard";
import { compactText } from "../shared";
import { buildHomepageFailureLoop, type HomepageFailureLoop } from "./failureLoop";
import { buildHomepageConductorPrompt } from "./collaboration-models/prompt";

type HomepageCopyState = "idle" | "copied" | "failed";

interface BuildHomepageCommandCardModelArgs {
  currentSourceIsAppHome: boolean;
  supervisorState: SupervisorState | null;
  dailyEntryProjectName: string | null;
  dailyEntryProjectRoot: string | null;
  primaryRecentProjectName: string | null;
  primaryRecentProjectRoot: string | null;
  requiresUserDecision: boolean;
  remainingExecutionCount: number;
  homepageCopyState: HomepageCopyState;
  transitionError: string | null;
  workflowTransitionCount: number;
}

export interface HomepageCommandCardModel extends HomepageCommandCardViewModel {
  conductorPrompt: string;
}

function buildFrontDoorEntryActions(args: {
  dailyEntryProjectName: string | null;
  dailyEntryProjectRoot: string | null;
  primaryRecentProjectName: string | null;
  primaryRecentProjectRoot: string | null;
}): HomepageEntryAction[] {
  const actions: HomepageEntryAction[] = [];

  if (args.dailyEntryProjectRoot && args.dailyEntryProjectName) {
    actions.push({
      id: "default-project",
      label: `打开默认项目 ${args.dailyEntryProjectName}`,
      detail: "如果今天继续主线开发，这是最短入口。",
      projectRoot: args.dailyEntryProjectRoot
    });
  } else if (args.primaryRecentProjectRoot && args.primaryRecentProjectName) {
    actions.push({
      id: "recent-project",
      label: `继续最近项目 ${args.primaryRecentProjectName}`,
      detail: "如果今天只是恢复上一条工作线，这条路径最快。",
      projectRoot: args.primaryRecentProjectRoot
    });
  }

  if (
    args.dailyEntryProjectRoot &&
    args.primaryRecentProjectRoot &&
    args.primaryRecentProjectName &&
    args.primaryRecentProjectRoot !== args.dailyEntryProjectRoot
  ) {
    actions.push({
      id: "recent-project",
      label: `继续最近项目 ${args.primaryRecentProjectName}`,
      detail: "如果今天临时切线，可以直接从最近项目继续。",
      projectRoot: args.primaryRecentProjectRoot
    });
  }

  actions.push({
    id: "connect-project",
    label: "连接新项目",
    detail: "如果今天是新项目，就直接进入连接与初始化流程。"
  });

  return actions;
}

function isPausedRecoveryState(supervisorState: SupervisorState | null) {
  return supervisorState?.latestPhaseRunSummary.status === "paused";
}

function isWaitingForResult(supervisorState: SupervisorState | null) {
  return (
    supervisorState?.latestPhaseRunSummary.status === "running" ||
    supervisorState?.latestRun?.status === "running"
  );
}

function isBootstrapBoundaryState(args: {
  requiresUserDecision: boolean;
  supervisorState: SupervisorState | null;
}) {
  return (
    args.requiresUserDecision &&
    args.supervisorState?.nextBestStep.primary.label === "补齐启动边界"
  );
}

function isAcceptedHandoffNextSliceState(supervisorState: SupervisorState | null) {
  return (
    supervisorState?.projectState.acceptanceState.finalState === "accepted" &&
    supervisorState.latestContinuationState.status === "available" &&
    supervisorState.latestContinuationState.kind === "handoff" &&
    supervisorState.latestContinuationState.freshness === "fresh"
  );
}

function buildCommandState(args: {
  currentSourceIsAppHome: boolean;
  failureLoop: HomepageFailureLoop | null;
  requiresUserDecision: boolean;
  supervisorState: SupervisorState | null;
}) {
  if (args.currentSourceIsAppHome) {
    return { label: "产品前门", tone: "blue" as const };
  }

  if (args.failureLoop) {
    return { label: "需要修复", tone: "red" as const };
  }

  if (isPausedRecoveryState(args.supervisorState)) {
    return { label: "等待恢复", tone: "red" as const };
  }

  if (isWaitingForResult(args.supervisorState)) {
    return { label: "等待回流", tone: "amber" as const };
  }

  if (
    isBootstrapBoundaryState({
      requiresUserDecision: args.requiresUserDecision,
      supervisorState: args.supervisorState
    })
  ) {
    return { label: "待补边界", tone: "amber" as const };
  }

  if (args.requiresUserDecision) {
    return { label: "等待决策", tone: "amber" as const };
  }

  if (args.supervisorState?.gateSignal.shouldSurfaceDeck) {
    return { label: "需要交接", tone: "amber" as const };
  }

  return { label: "可继续推进", tone: "amber" as const };
}

function buildCollaborationMode(args: {
  currentSourceIsAppHome: boolean;
  supervisorState: SupervisorState | null;
}) {
  return {
    label: args.currentSourceIsAppHome
      ? "日常进入"
      : args.supervisorState?.projectSupervision.modeLabel ?? "单线推进",
    tone: args.currentSourceIsAppHome ? ("blue" as const) : ("amber" as const)
  };
}

function buildConductorEntry(args: {
  currentSourceIsAppHome: boolean;
  supervisorState: SupervisorState | null;
}) {
  const activeToneClasses = args.currentSourceIsAppHome
    ? {
        className: "bg-blue-500/10 text-blue-300",
        labelClassName: "text-blue-200/70"
      }
    : {
        className: "bg-amber-500/10 text-amber-300",
        labelClassName: "text-amber-200/70"
      };

  return [
    {
      label: "角色",
      value: "Conductor",
      ...activeToneClasses
    },
    {
      label: "线程",
      value: args.currentSourceIsAppHome ? "Front Door" : "Main",
      ...activeToneClasses
    },
    {
      label: "入口",
      value: formatConductorSurfaceLabel(args.supervisorState?.providerRouting.conductorSurface),
      ...activeToneClasses
    }
  ];
}

function buildActionReasons(args: {
  currentSourceIsAppHome: boolean;
  dailyEntryProjectName: string | null;
  primaryRecentProjectName: string | null;
  failureLoop: HomepageFailureLoop | null;
  requiresUserDecision: boolean;
  supervisorState: SupervisorState | null;
  remainingExecutionCount: number;
}): [string, string] {
  if (args.currentSourceIsAppHome) {
    return [
      args.dailyEntryProjectName || args.primaryRecentProjectName ? "入口已准备好" : "等待首次连接",
      "先确认今天去哪"
    ];
  }

  if (args.failureLoop) {
    return ["失败回路", args.failureLoop.label];
  }

  if (isPausedRecoveryState(args.supervisorState)) {
    return ["自动链路暂停", "先恢复再继续"];
  }

  if (isWaitingForResult(args.supervisorState)) {
    return ["结果回流中", "当前无需操作"];
  }

  if (
    isBootstrapBoundaryState({
      requiresUserDecision: args.requiresUserDecision,
      supervisorState: args.supervisorState
    })
  ) {
    return ["启动边界未齐", "先补边界"];
  }

  if (args.requiresUserDecision) {
    return ["需要用户决策", "当前关键路径"];
  }

  if (isAcceptedHandoffNextSliceState(args.supervisorState)) {
    return ["上一刀已 accepted", "下一刀待定义"];
  }

  if (args.supervisorState?.gateSignal.shouldSurfaceDeck) {
    return ["阻塞后续", "需要交接"];
  }

  return [
    "当前关键路径",
    args.remainingExecutionCount > 0 ? "适合并行拆工" : "可直接执行"
  ];
}

function buildConversationPath(args: {
  currentSourceIsAppHome: boolean;
  failureLoop: HomepageFailureLoop | null;
  requiresUserDecision: boolean;
  supervisorState: SupervisorState | null;
}): string[] {
  if (args.currentSourceIsAppHome) {
    return [
      "先确认今天要继续的真实项目",
      "回到 Conductor 说明本轮目标与边界",
      "进入真实项目后再查看实时 truth 与执行状态"
    ];
  }

  if (args.failureLoop) {
    return [
      "先说明当前异常与影响范围",
      "要求 Conductor 收束一轮最小修复 slice",
      "等结果回写后再决定是否重进 review / verification"
    ];
  }

  if (isPausedRecoveryState(args.supervisorState)) {
    return [
      "先确认暂停原因与恢复条件",
      "回到 Conductor 收束一轮最小恢复动作",
      "满足条件后回到指挥入口 continue，再继续自动链路"
    ];
  }

  if (isWaitingForResult(args.supervisorState)) {
    return [
      "先确认当前无需追加执行",
      "继续观察 committed truth / run result 回流",
      "结果写回后再让 Conductor 判断下一步"
    ];
  }

  if (args.requiresUserDecision) {
    return [
      "先说明当前决策点与边界",
      "要求 Conductor 给出推荐决策和原因",
      "确认后再继续推进当前 phase"
    ];
  }

  if (isAcceptedHandoffNextSliceState(args.supervisorState)) {
    return [
      "先复盘 accepted handoff 的边界",
      "要求 Conductor 收束下一条最小 slice",
      "整理 formal phase reset draft，再切入下一 phase"
    ];
  }

  return [
    "先说明当前目标与完成标志",
    "要求 Conductor 收束下一轮最小 slice",
    "让 Builder / Critic 顺序继续推进"
  ];
}

export function buildHomepageCommandCardModel(
  args: BuildHomepageCommandCardModelArgs
): HomepageCommandCardModel {
  const failureLoop =
    !args.currentSourceIsAppHome && args.supervisorState
      ? buildHomepageFailureLoop(args.supervisorState)
      : null;

  const actionTitle = args.currentSourceIsAppHome
    ? "确认今天要进入的真实项目"
    : args.supervisorState?.nextBestStep.primary.label ?? "对齐首页静态稿";
  const actionSummary = compactText(
    args.currentSourceIsAppHome
      ? args.dailyEntryProjectName
        ? `默认入口 ${args.dailyEntryProjectName} 已经准备好。这里仍是入口快照；进入项目后才会显示它的实时 phase、acceptance 和 evidence。`
        : args.primaryRecentProjectName
          ? `当前还没有默认入口，但最近项目 ${args.primaryRecentProjectName} 可以直接继续。前门不代表项目实时进度；进入项目后再看真实状态。`
          : "这里是 Threadsmith 的产品前门。它只负责选入口；如果是第一次使用，就连接项目根目录并初始化最小 .threadsmith 状态。"
      : isAcceptedHandoffNextSliceState(args.supervisorState)
        ? "上一刀已经 accepted，fresh handoff packet 也已经就绪。当前最佳动作不是重复查看上一刀，而是基于这份边界收束下一条 narrow slice，并准备正式的 phase reset。"
      : args.supervisorState?.nextBestStep.primary.reason
        ?? "先对齐 Figma 的信息骨架、字号层级、间距和块关系，再回接真实数据。",
    118
  );
  const stopCondition = compactText(
    args.currentSourceIsAppHome
      ? "已经进入一个真实项目，或完成首次项目连接与初始化。"
      : args.supervisorState?.nextBestStep.primary.stopCondition
        ?? "当前命令完成后，系统应能推进到下一条可执行协作命令。",
    108
  );
  const frontDoorEntryActions = args.currentSourceIsAppHome
    ? buildFrontDoorEntryActions({
        dailyEntryProjectName: args.dailyEntryProjectName,
        dailyEntryProjectRoot: args.dailyEntryProjectRoot,
        primaryRecentProjectName: args.primaryRecentProjectName,
        primaryRecentProjectRoot: args.primaryRecentProjectRoot
      })
    : [];
  const conversationPath = buildConversationPath({
    currentSourceIsAppHome: args.currentSourceIsAppHome,
    failureLoop,
    requiresUserDecision: args.requiresUserDecision,
    supervisorState: args.supervisorState
  });

  return {
    currentSourceIsAppHome: args.currentSourceIsAppHome,
    commandState: buildCommandState({
      currentSourceIsAppHome: args.currentSourceIsAppHome,
      failureLoop,
      requiresUserDecision: args.requiresUserDecision,
      supervisorState: args.supervisorState
    }),
    collaborationMode: buildCollaborationMode({
      currentSourceIsAppHome: args.currentSourceIsAppHome,
      supervisorState: args.supervisorState
    }),
    actionTitle,
    actionSummary,
    conductorEntry: buildConductorEntry({
      currentSourceIsAppHome: args.currentSourceIsAppHome,
      supervisorState: args.supervisorState
    }),
    actionReasons: buildActionReasons({
      currentSourceIsAppHome: args.currentSourceIsAppHome,
      dailyEntryProjectName: args.dailyEntryProjectName,
      primaryRecentProjectName: args.primaryRecentProjectName,
      failureLoop,
      requiresUserDecision: args.requiresUserDecision,
      supervisorState: args.supervisorState,
      remainingExecutionCount: args.remainingExecutionCount
    }),
    failureLoop,
    conversationPath,
    stopCondition,
    primaryFrontDoorEntryAction: frontDoorEntryActions[0] ?? null,
    secondaryFrontDoorEntryActions: frontDoorEntryActions.slice(1, 3),
    primaryButtonLabel:
      args.homepageCopyState === "copied"
        ? "已复制"
        : args.homepageCopyState === "failed"
          ? "复制失败"
          : "复制建议指令",
    transitionError: args.transitionError,
    workflowTransitionCount: args.workflowTransitionCount,
    conductorPrompt: buildHomepageConductorPrompt({
      title: actionTitle,
      summary: actionSummary,
      stopCondition,
      failureLoop,
      requiresUserDecision: args.requiresUserDecision,
      guidanceMode: isPausedRecoveryState(args.supervisorState)
        ? "pause"
        : isWaitingForResult(args.supervisorState)
          ? "wait"
          : isAcceptedHandoffNextSliceState(args.supervisorState)
            ? "accepted-handoff"
          : "default"
    })
  };
}
