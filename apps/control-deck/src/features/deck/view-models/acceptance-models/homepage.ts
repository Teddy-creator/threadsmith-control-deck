import type { AcceptanceState } from "@threadsmith/domain";
import type { SupervisorState } from "@threadsmith/runtime";
import { compactText } from "../shared";
import {
  deriveHomepageCloseoutStatus,
  deriveHomepageFinalAcceptanceStatus,
  deriveHomepageReviewStatus,
  deriveHomepageVerificationStatus
} from "./status";

export function buildHomepageAcceptanceItems(acceptanceState: AcceptanceState) {
  return [
    { label: "评审", status: deriveHomepageReviewStatus(acceptanceState) },
    { label: "验证", status: deriveHomepageVerificationStatus(acceptanceState) },
    { label: "收尾", status: deriveHomepageCloseoutStatus(acceptanceState) },
    { label: "最终接受", status: deriveHomepageFinalAcceptanceStatus(acceptanceState) }
  ];
}

export function buildHomepageAcceptanceAlert(supervisorState: SupervisorState) {
  const { acceptanceState } = supervisorState.projectState;
  const incompleteChecks = Math.max(
    supervisorState.acceptanceSummary.totalCount
      - supervisorState.acceptanceSummary.completedCount,
    0
  );

  if (acceptanceState.reviewStatus === "review-blocked") {
    return compactText(acceptanceState.knownGaps[0] ?? "当前评审存在阻塞项。", 88);
  }

  if (
    acceptanceState.verificationStatus === "failed" ||
    acceptanceState.finalState === "verification-failed"
  ) {
    return compactText(supervisorState.latestVerificationEvidence.detail, 88);
  }

  if (acceptanceState.finalState === "accepted") {
    return "当前 slice 验收已完成。";
  }

  if (
    acceptanceState.closeoutStatus === "pending" ||
    acceptanceState.finalState === "accepted-with-closeout-pending"
  ) {
    return compactText(supervisorState.latestCloseoutRecord.detail, 88);
  }

  if (incompleteChecks > 0) {
    return `还有 ${incompleteChecks} 项验收检查未通过。`;
  }

  if (
    acceptanceState.verificationStatus === "running" ||
    acceptanceState.verificationStatus === "ready"
  ) {
    return compactText(supervisorState.latestVerificationEvidence.detail, 88);
  }

  return compactText(acceptanceState.currentClaim, 88);
}
