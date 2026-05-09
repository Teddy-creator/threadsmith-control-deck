import type { PhaseOwner, ProjectState } from "@threadsmith/domain";
import type { ContextRecoverySignal, SupervisorState } from "@threadsmith/runtime";
import { formatGateReason, formatRole } from "../../../display/labels";
import {
  buildPhaseParticipantRouteHint,
  buildPhaseRoutingOverviewItems,
  type LatestBridgeModel
} from "../../deckViewModels";
import {
  formatContextRecoveryActionLong,
  formatContextRecoveryStatus,
  formatPacketStatus,
  pickContextTone,
  pickPacketTone
} from "../../view-models/contextRecovery";
import { compactText } from "../shared";
import type { ObjectsInspectorProps } from "./types";

interface BuildObjectsInspectorModelArgs {
  projectState: ProjectState;
  supervisorState: SupervisorState;
  latestBridgeModel: LatestBridgeModel;
  executionPreviewTaskSummary: string | null;
  acceptanceProgressLabel: string;
}

export type ObjectsInspectorModel = Omit<ObjectsInspectorProps, "projectState">;

function buildContextHandling(recovery: ContextRecoverySignal) {
  if (recovery.action === "sync-context") {
    return {
      title:
        recovery.currentPacketStatus === "missing"
          ? "建议先生成 Context Packet"
          : "建议先刷新 Context Packet",
      detail:
        "可以从 committed Threadsmith truth、repo map 和 evidence summary 重新生成 current-packet.json，让 Context Packet 回到当前 phase / acceptance 边界。",
      tone: recovery.currentPacketStatus === "missing" ? "amber" : "red",
      executableActionId: "sync-context" as const,
      executableLabel: "打开 context sync 动作",
      manualHint: "如果你正在指挥官聊天里推进，也可以直接说：使用 $threadsmith sync，只同步 truth 与 context。"
    };
  }

  if (recovery.action === "run-hygiene") {
    return {
      title: "建议运行 context hygiene",
      detail: "角色 packet 或上下文边界已经不可靠，先让 hygiene 重新锚定当前 truth，再继续执行会更稳。",
      tone: "red",
      executableActionId: "run-hygiene" as const,
      executableLabel: "打开 hygiene 处理动作",
      manualHint: null
    };
  }

  if (recovery.action === "create-handoff") {
    return {
      title: "建议创建 handoff",
      detail: "当前 slice 已接受或需要继续点，先创建 handoff 可以避免下一轮从脏上下文继续。",
      tone: "amber",
      executableActionId: "create-handoff" as const,
      executableLabel: "打开 handoff 处理动作",
      manualHint: null
    };
  }

  if (recovery.action === "wait-for-run") {
    return {
      title: "先等待运行结果回流",
      detail: "已有运行中的角色或自动链路，当前最稳妥的是等待结果写回 committed truth。",
      tone: "amber",
      executableActionId: null,
      executableLabel: null,
      manualHint: "不要重复签发 context sync；先等最新运行完成，再刷新页面或回到指挥官继续。"
    };
  }

  if (recovery.action === "resume-phase-run") {
    return {
      title: "先恢复暂停链路",
      detail: "自动链路处于暂停状态，应先处理暂停原因，再显式 continue 当前 phase run。",
      tone: "red",
      executableActionId: null,
      executableLabel: null,
      manualHint: "回到指挥官入口，按暂停提示补齐条件后继续。"
    };
  }

  if (recovery.action === "repair-run") {
    return {
      title: "先修复最新运行失败",
      detail: "最新运行失败时不要直接刷新 packet；先把失败原因、truth 和修复目标对齐。",
      tone: "red",
      executableActionId: null,
      executableLabel: null,
      manualHint: "回到指挥官入口，要求根据最新失败结果进入 repair。"
    };
  }

  return {
    title: "可以继续推进",
    detail: "Context Packet、角色 packet 与 committed truth 当前对齐，不需要额外处理。",
    tone: "green",
    executableActionId: null,
    executableLabel: null,
    manualHint: null
  };
}

function buildContextRecoveryModel(recovery: ContextRecoverySignal) {
  const selectedRoleLabel = recovery.selectedRole
    ? `${formatRole(recovery.selectedRole)} packet`
    : "角色 packet";
  const tone = pickContextTone(recovery.status);

  return {
    statusLabel: `Context ${formatContextRecoveryStatus(recovery.status)}`,
    actionLabel: formatContextRecoveryActionLong(recovery.action),
    tone,
    actionTone: recovery.action === "continue" ? "green" : tone,
    detail: recovery.detail,
    reasons: recovery.reasons.map(formatGateReason),
    handling: buildContextHandling(recovery),
    packetItems: [
      {
        label: "Current Packet",
        value: formatPacketStatus(recovery.currentPacketStatus),
        tone: pickPacketTone(recovery.currentPacketStatus)
      },
      {
        label: selectedRoleLabel,
        value: formatPacketStatus(recovery.rolePacketStatus),
        tone: pickPacketTone(recovery.rolePacketStatus)
      },
      {
        label: "选择角色",
        value: recovery.selectedRole ? formatRole(recovery.selectedRole) : "未指定",
        tone: "purple"
      }
    ]
  };
}

export function buildObjectsInspectorModel(
  args: BuildObjectsInspectorModelArgs
): ObjectsInspectorModel {
  const phaseDecisionItems = args.projectState.activeWork.items.filter(
    (item) => item.requiresUserDecision
  );
  const hasPhaseRun = args.supervisorState.latestPhaseRunSummary.exists;
  const phaseOperatorValue = hasPhaseRun
    ? args.supervisorState.latestPhaseRunSummary.operatorStateLabel
    : args.supervisorState.nextBestStep.primary.label;
  const phaseOperatorDetail = hasPhaseRun
    ? args.supervisorState.latestPhaseRunSummary.operatorDetail
    : args.supervisorState.nextBestStep.primary.reason;
  const phaseOperatorTone = hasPhaseRun
    ? args.supervisorState.latestPhaseRunSummary.operatorState === "needs-intervention"
      ? ("red" as const)
      : args.supervisorState.latestPhaseRunSummary.operatorState === "waiting"
        ? ("amber" as const)
        : ("zinc" as const)
    : phaseDecisionItems.length > 0
      ? ("amber" as const)
      : ("zinc" as const);

  return {
    contextRecovery: buildContextRecoveryModel(args.supervisorState.contextRecovery),
    phaseCurrentSlice: compactText(
      args.supervisorState.latestPhaseRunSummary.currentSliceLabel
        ?? args.executionPreviewTaskSummary
        ?? args.projectState.acceptanceState.currentClaim
        ?? "当前还没有明确的执行切口。",
      88
    ),
    phaseBoundarySections: [
      {
        label: "In scope",
        items: args.projectState.currentPhase.inScope,
        empty: "当前没有记录 in scope。"
      },
      {
        label: "Out of scope",
        items: args.projectState.currentPhase.outOfScope,
        empty: "当前没有记录 out of scope。"
      },
      {
        label: "阻塞 / 待决策",
        items: [
          ...args.projectState.currentPhase.blockedBy,
          ...phaseDecisionItems.map((item) => `待决策：${item.taskSummary}`)
        ],
        empty: "当前没有阻塞或待决策项。"
      }
    ],
    phaseRoutingOverviewItems: buildPhaseRoutingOverviewItems({
      activeOwners: args.projectState.currentPhase.activeOwners,
      routing: args.supervisorState.providerRouting,
      latestBridgeModel: args.latestBridgeModel,
      latestRun: args.supervisorState.latestRun
    }).concat(
      hasPhaseRun || phaseDecisionItems.length > 0
        ? [
            {
              label: "自动链路",
              value: hasPhaseRun
                ? args.supervisorState.latestPhaseRunSummary.statusLabel
                : "尚未启动",
              detail: [
                hasPhaseRun ? args.supervisorState.latestPhaseRunSummary.headline : null,
                hasPhaseRun
                  ? args.supervisorState.latestPhaseRunSummary.currentSliceLabel
                  : args.supervisorState.nextBestStep.primary.label,
                hasPhaseRun ? args.supervisorState.latestPhaseRunSummary.repairLabel : null
              ]
                .filter(Boolean)
                .join(" · "),
              tone:
                hasPhaseRun && args.supervisorState.latestPhaseRunSummary.status === "accepted"
                  ? "green"
                  : hasPhaseRun && args.supervisorState.latestPhaseRunSummary.status === "running"
                    ? "amber"
                    : hasPhaseRun &&
                        (args.supervisorState.latestPhaseRunSummary.status === "paused" ||
                          args.supervisorState.latestPhaseRunSummary.status === "failed")
                      ? "red"
                      : "zinc"
            },
            {
              label: "锁定快照状态",
              value: args.supervisorState.latestPhaseRun?.lockedPhaseSnapshotRef ? "已锁定" : "未记录",
              detail: args.supervisorState.latestPhaseRun?.lockedPhaseSnapshotRef
                ? "locked phase 快照已写入 committed truth，可在阶段合同查看具体路径。"
                : "当前还没有 locked phase 快照。",
              tone: "blue" as const
            },
            {
              label: "当前处理",
              value: phaseOperatorValue,
              detail: args.supervisorState.latestPhaseRunSummary.resumeHint
                ? `${phaseOperatorDetail} 处理完后回到指挥入口显式 continue 当前自动链路。`
                : phaseOperatorDetail,
              tone: phaseOperatorTone
            }
          ]
        : []
    ),
    phaseParticipants: args.supervisorState.phaseParticipants.map((item) => ({
      roleLabel: item.roleLabel,
      threadLabel: item.threadLabel,
      providerLabel: item.providerLabel,
      assignmentLabel: item.assignmentLabel,
      statusLabel: item.statusLabel,
      taskSummary: item.taskSummary,
      latestEvidenceLabel: item.latestEvidenceLabel,
      routeHint: buildPhaseParticipantRouteHint({
        role: item.role as PhaseOwner,
        routing: args.supervisorState.providerRouting,
        latestBridgeModel: args.latestBridgeModel,
        latestRun: args.supervisorState.latestRun,
        conductorSurface: args.supervisorState.providerRouting.conductorSurface
      })
    })),
    acceptanceProgressLabel: args.acceptanceProgressLabel,
    lockedPhasePath: args.supervisorState.latestPhaseRun?.lockedPhaseSnapshotRef ?? null,
    resumeHint:
      args.supervisorState.latestPhasePauseSummary.recommendedPrompt
      ?? args.supervisorState.latestPhaseRunSummary.resumeHint
  };
}
