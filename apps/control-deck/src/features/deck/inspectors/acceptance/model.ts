import type { ProjectState } from "@threadsmith/domain";
import type { SupervisorState } from "@threadsmith/runtime";
import {
  buildAcceptanceRoutingOverviewItems,
  buildHomepageAcceptanceAlert,
  deriveHomepageCloseoutStatus,
  deriveHomepageFinalAcceptanceStatus,
  deriveHomepageReviewStatus,
  deriveHomepageVerificationStatus,
  formatHomepageAcceptanceItemStatus,
  isAcceptanceChecklistComplete,
  type LatestBridgeModel
} from "../../deckViewModels";
import {
  formatAcceptanceStatus,
  formatVerificationEvidenceStatus
} from "../../../display/labels";
import { formatEventTime } from "../../../events/formatters";
import { compactText } from "../shared";
import type { AcceptanceInspectorProps } from "./types";

interface BuildAcceptanceInspectorModelArgs {
  projectState: ProjectState;
  supervisorState: SupervisorState;
  latestBridgeModel: LatestBridgeModel;
}

export type AcceptanceInspectorModel = Omit<
  AcceptanceInspectorProps,
  | "projectState"
  | "acceptanceState"
  | "workflowTransitions"
  | "applyingTransitionId"
  | "transitionError"
  | "onApplyWorkflowTransition"
>;

export function buildAcceptanceInspectorModel(
  args: BuildAcceptanceInspectorModelArgs
): AcceptanceInspectorModel {
  const acceptanceState = args.projectState.acceptanceState;
  const reviewGateStatus = deriveHomepageReviewStatus(acceptanceState);
  const verificationGateStatus = deriveHomepageVerificationStatus(acceptanceState);
  const closeoutGateStatus = deriveHomepageCloseoutStatus(acceptanceState);
  const finalAcceptanceGateStatus = deriveHomepageFinalAcceptanceStatus(acceptanceState);
  const acceptanceAlert = buildHomepageAcceptanceAlert(args.supervisorState);
  const unresolvedChecklistItems = acceptanceState.doneWhenChecklist.filter(
    (item) => !isAcceptanceChecklistComplete(item.status)
  );
  const latestReviewerEvent = args.supervisorState.recentEvents.find(
    (event) => event.role === "reviewer"
  );

  const acceptanceGateCards = [
    {
      label: "评审",
      status: reviewGateStatus,
      blocker:
        acceptanceState.reviewStatus === "review-blocked"
          ? compactText(acceptanceState.knownGaps[0] ?? "当前 review 有阻塞项。", 88)
          : reviewGateStatus === "pass"
            ? "当前没有评审阻塞。"
            : acceptanceState.reviewStatus === "in-review"
              ? "评审还在进行中。"
              : "还没有形成评审结论。",
      missingEvidence:
        reviewGateStatus === "pass"
          ? "评审放行结论已具备。"
          : "缺少 Critic / Reviewer 的放行结论。",
      nextAction:
        reviewGateStatus === "pass"
          ? "进入验证。"
          : acceptanceState.reviewStatus === "review-blocked"
            ? "先处理 review 阻塞，再重新复核。"
            : acceptanceState.reviewStatus === "in-review"
              ? "等待评审结论回流。"
              : "先完成 review 并记录结论。"
    },
    {
      label: "验证",
      status: verificationGateStatus,
      blocker:
        verificationGateStatus === "failed"
          ? compactText(args.supervisorState.latestVerificationEvidence.detail, 88)
          : verificationGateStatus === "pass"
            ? "当前没有验证阻塞。"
            : acceptanceState.verificationStatus === "running"
              ? "验证还在执行中。"
              : "还没有把验证结果写回验收流。",
      missingEvidence:
        verificationGateStatus === "pass"
          ? "验证 evidence 已具备。"
          : compactText(
              args.supervisorState.latestVerificationEvidence.status === "not-started"
                ? "缺少独立验证 evidence。"
                : args.supervisorState.latestVerificationEvidence.headline,
              88
            ),
      nextAction:
        verificationGateStatus === "pass"
          ? "进入收尾。"
          : verificationGateStatus === "failed"
            ? "修复失败原因后重跑验证。"
            : acceptanceState.verificationStatus === "running"
              ? "等待 Verifier 回流结果。"
              : "在评审放行后执行 verification。"
    },
    {
      label: "收尾",
      status: closeoutGateStatus,
      blocker:
        closeoutGateStatus === "pass"
          ? "当前没有收尾阻塞。"
          : acceptanceState.closeoutStatus === "pending"
            ? compactText(args.supervisorState.latestCloseoutRecord.detail, 88)
            : "closeout 还没有开始。",
      missingEvidence:
        closeoutGateStatus === "pass"
          ? "closeout 记录已具备。"
          : "缺少 closeout 记录。",
      nextAction:
        closeoutGateStatus === "pass"
          ? "准备最终接受。"
          : acceptanceState.closeoutStatus === "pending"
            ? "完成当前 closeout 清单。"
            : "在验证通过后整理收尾。"
    },
    {
      label: "最终接受",
      status: finalAcceptanceGateStatus,
      blocker:
        finalAcceptanceGateStatus === "pass"
          ? "当前已经 accepted。"
          : acceptanceState.finalState === "accepted-with-closeout-pending"
            ? "还差最后的 closeout 收口。"
            : "前置 gate 还没全部完成。",
      missingEvidence:
        finalAcceptanceGateStatus === "pass"
          ? "最终 sign-off 已具备。"
          : "缺少最终 accepted sign-off。",
      nextAction:
        finalAcceptanceGateStatus === "pass"
          ? "当前无需追加动作。"
          : acceptanceState.finalState === "accepted-with-closeout-pending"
            ? "先补齐收尾，再给出最终接受。"
            : "等前三门完成后给出最终接受。"
    }
  ] as const;

  const remainingGateCount = acceptanceGateCards.filter((gate) => gate.status !== "pass").length;
  const currentGate = acceptanceGateCards.find((gate) => gate.status !== "pass");

  return {
    acceptanceAlert,
    finalAcceptanceGateStatus,
    currentGateLabel: currentGate?.label ?? null,
    remainingGateCount,
    unresolvedChecklistLabels: unresolvedChecklistItems.map((item) => item.label),
    evidenceGapItems: [
      currentGate?.missingEvidence ?? null,
      acceptanceAlert
    ].filter((item, index, array): item is string => Boolean(item) && array.indexOf(item) === index),
    acceptanceRoutingOverviewItems: buildAcceptanceRoutingOverviewItems({
      acceptanceState,
      activeWork: args.projectState.activeWork,
      projectSupervision: args.supervisorState.projectSupervision,
      routing: args.supervisorState.providerRouting,
      latestBridgeModel: args.latestBridgeModel,
      latestRun: args.supervisorState.latestRun
    }),
    acceptanceGateCards,
    signoffItems: [
      {
        label: "评审放行",
        summary:
          latestReviewerEvent?.title
          ?? (reviewGateStatus === "pass" ? "评审已放行" : "尚未记录评审放行"),
        meta: latestReviewerEvent?.createdAt
          ? formatEventTime(latestReviewerEvent.createdAt)
          : formatHomepageAcceptanceItemStatus(reviewGateStatus)
      },
      {
        label: "验证结论",
        summary: args.supervisorState.latestVerificationEvidence.headline,
        meta: formatEventTime(args.supervisorState.latestVerificationEvidence.recordedAt)
      },
      {
        label: "收尾记录",
        summary: args.supervisorState.latestCloseoutRecord.headline,
        meta: formatEventTime(args.supervisorState.latestCloseoutRecord.recordedAt)
      },
      {
        label: "最终接受",
        summary:
          finalAcceptanceGateStatus === "pass"
            ? "最终 accepted 已记录"
            : "尚未最终接受",
        meta: formatAcceptanceStatus(acceptanceState.finalState)
      }
    ]
  };
}
