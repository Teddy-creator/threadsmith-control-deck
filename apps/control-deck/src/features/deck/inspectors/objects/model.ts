import type { PhaseOwner, ProjectState } from "@threadsmith/domain";
import type { SupervisorState } from "@threadsmith/runtime";
import {
  buildPhaseParticipantRouteHint,
  buildPhaseRoutingOverviewItems,
  type LatestBridgeModel
} from "../../deckViewModels";
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
