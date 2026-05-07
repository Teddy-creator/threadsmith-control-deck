import type { AcceptanceState } from "@threadsmith/domain";
import type { Tone } from "../shared";
import type { HomepageAcceptanceItemStatus } from "./types";

export function deriveHomepageReviewStatus(
  acceptanceState: AcceptanceState
): HomepageAcceptanceItemStatus {
  if (acceptanceState.reviewStatus === "review-blocked") {
    return "failed";
  }

  if (
    acceptanceState.reviewStatus === "ready-for-verification" ||
    acceptanceState.verificationStatus !== "not-started" ||
    acceptanceState.closeoutStatus !== "not-started" ||
    acceptanceState.finalState === "accepted-with-closeout-pending" ||
    acceptanceState.finalState === "accepted"
  ) {
    return "pass";
  }

  if (
    acceptanceState.reviewStatus === "in-review" ||
    acceptanceState.implementationStatus === "implementing" ||
    acceptanceState.implementationStatus === "ready-for-review" ||
    acceptanceState.finalState === "ready-for-review"
  ) {
    return "running";
  }

  return "pending";
}

export function deriveHomepageVerificationStatus(
  acceptanceState: AcceptanceState
): HomepageAcceptanceItemStatus {
  if (
    acceptanceState.verificationStatus === "failed" ||
    acceptanceState.finalState === "verification-failed"
  ) {
    return "failed";
  }

  if (
    acceptanceState.verificationStatus === "passed" ||
    acceptanceState.closeoutStatus !== "not-started" ||
    acceptanceState.finalState === "accepted-with-closeout-pending" ||
    acceptanceState.finalState === "accepted"
  ) {
    return "pass";
  }

  if (
    acceptanceState.verificationStatus === "running" ||
    acceptanceState.verificationStatus === "ready" ||
    acceptanceState.reviewStatus === "ready-for-verification" ||
    acceptanceState.finalState === "ready-for-verification"
  ) {
    return "running";
  }

  return "pending";
}

export function deriveHomepageCloseoutStatus(
  acceptanceState: AcceptanceState
): HomepageAcceptanceItemStatus {
  if (acceptanceState.closeoutStatus === "done" || acceptanceState.finalState === "accepted") {
    return "pass";
  }

  if (
    acceptanceState.closeoutStatus === "pending" ||
    acceptanceState.finalState === "accepted-with-closeout-pending"
  ) {
    return "running";
  }

  return "pending";
}

export function deriveHomepageFinalAcceptanceStatus(
  acceptanceState: AcceptanceState
): HomepageAcceptanceItemStatus {
  if (acceptanceState.finalState === "accepted") {
    return "pass";
  }

  if (
    acceptanceState.finalState === "accepted-with-closeout-pending" ||
    acceptanceState.closeoutStatus === "done"
  ) {
    return "running";
  }

  return "pending";
}

export function formatHomepageAcceptanceItemStatus(
  status: HomepageAcceptanceItemStatus
) {
  switch (status) {
    case "pass":
      return "已验收";
    case "running":
      return "进行中";
    case "failed":
      return "未通过";
    default:
      return "待开始";
  }
}

export function pickHomepageAcceptanceItemTone(
  status: HomepageAcceptanceItemStatus
): Tone {
  switch (status) {
    case "pass":
      return "green";
    case "running":
      return "amber";
    case "failed":
      return "red";
    default:
      return "zinc";
  }
}

export function isAcceptanceChecklistComplete(status: string) {
  return ["accepted", "passed", "done", "pass"].includes(status);
}
