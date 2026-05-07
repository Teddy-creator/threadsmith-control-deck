import type { SupervisorState } from "@threadsmith/runtime";
import type { Tone } from "../../shared";

export type HomepageDecisionState = {
  label: string;
  tone: Tone;
};

export type HomepageDecisionSignal = {
  label: string;
  value: string;
  tone: Tone;
};

export function hasPendingUserDecision(supervisorState: SupervisorState) {
  return supervisorState.projectState.activeWork.items.some(
    (item) => item.requiresUserDecision
  );
}

export function isWaitingForResult(supervisorState: SupervisorState) {
  return (
    supervisorState.latestPhaseRunSummary.status === "running" ||
    supervisorState.latestRun?.status === "running"
  );
}

export function isPausedRecovery(supervisorState: SupervisorState) {
  return supervisorState.latestPhaseRunSummary.status === "paused";
}

export function isBootstrapBoundary(supervisorState: SupervisorState) {
  return (
    hasPendingUserDecision(supervisorState) &&
    supervisorState.nextBestStep.primary.label === "补齐启动边界"
  );
}

export function isAcceptedHandoffNextSlice(supervisorState: SupervisorState) {
  return (
    supervisorState.projectState.acceptanceState.finalState === "accepted" &&
    supervisorState.latestContinuationState.status === "available" &&
    supervisorState.latestContinuationState.kind === "handoff" &&
    supervisorState.latestContinuationState.freshness === "fresh"
  );
}

function hasBlockingGateReason(supervisorState: SupervisorState) {
  return (
    supervisorState.gateSignal.reasons.includes("phase-blocked") ||
    supervisorState.gateSignal.reasons.includes("blocking-review-findings") ||
    supervisorState.gateSignal.reasons.includes("verification-failed") ||
    supervisorState.gateSignal.reasons.includes("latest-run-failed")
  );
}

export function buildHomepageDecisionState(
  supervisorState: SupervisorState,
  topProjectRisks: string[]
): HomepageDecisionState {
  if (isPausedRecovery(supervisorState)) {
    return { label: "需要介入", tone: "red" };
  }

  if (supervisorState.health.currentBlocker || hasBlockingGateReason(supervisorState)) {
    return { label: "存在阻塞", tone: "red" };
  }

  if (isWaitingForResult(supervisorState)) {
    return { label: "等待回流", tone: "amber" };
  }

  if (isBootstrapBoundary(supervisorState)) {
    return { label: "待补边界", tone: "amber" };
  }

  if (hasPendingUserDecision(supervisorState)) {
    return { label: "等待决策", tone: "amber" };
  }

  if (
    supervisorState.gateSignal.shouldSurfaceDeck ||
    supervisorState.health.verificationDebtCount > 0 ||
    topProjectRisks.length > 0 ||
    supervisorState.latestVerificationEvidence.status === "running" ||
    supervisorState.latestVerificationEvidence.status === "ready" ||
    supervisorState.latestVerificationEvidence.status === "not-started"
  ) {
    return { label: "需先处理", tone: "amber" };
  }

  return { label: "可继续推进", tone: "green" };
}

function formatDecisionRiskValue(level: SupervisorState["health"]["level"]) {
  switch (level) {
    case "blocked":
      return "阻塞中";
    case "risky":
      return "高";
    case "watch":
      return "中";
    default:
      return "低";
  }
}

function pickHealthTone(level: SupervisorState["health"]["level"]): Tone {
  switch (level) {
    case "blocked":
    case "risky":
      return "red";
    case "watch":
      return "amber";
    default:
      return "green";
  }
}

function pickEvidenceTone(
  status: SupervisorState["latestVerificationEvidence"]["status"]
): Tone {
  switch (status) {
    case "passed":
      return "green";
    case "failed":
      return "red";
    case "running":
    case "ready":
    case "not-started":
      return "amber";
    default:
      return "zinc";
  }
}

function pickGateSignalTone(
  supervisorState: SupervisorState
): "green" | "amber" | "red" {
  if (isPausedRecovery(supervisorState)) {
    return "red";
  }

  if (hasBlockingGateReason(supervisorState)) {
    return "red";
  }

  if (isWaitingForResult(supervisorState) || isBootstrapBoundary(supervisorState)) {
    return "amber";
  }

  if (supervisorState.gateSignal.shouldSurfaceDeck) {
    return "amber";
  }

  return "green";
}

function formatHomepageDecisionGateValue(supervisorState: SupervisorState) {
  if (isPausedRecovery(supervisorState)) {
    return "需要恢复";
  }

  if (isWaitingForResult(supervisorState)) {
    return "等待回流";
  }

  if (isBootstrapBoundary(supervisorState)) {
    return "待补边界";
  }

  if (hasPendingUserDecision(supervisorState)) {
    return "等待决策";
  }

  if (supervisorState.health.currentBlocker || hasBlockingGateReason(supervisorState)) {
    return "阻塞中";
  }

  if (supervisorState.gateSignal.shouldSurfaceDeck) {
    return `需处理 ${supervisorState.gateSignal.reasons.length}`;
  }

  return "已开启";
}

function formatHomepageDecisionEvidenceValue(
  status: SupervisorState["latestVerificationEvidence"]["status"]
) {
  switch (status) {
    case "passed":
      return "通过";
    case "failed":
      return "失败";
    case "running":
      return "进行中";
    case "ready":
    case "not-started":
      return "待补齐";
    default:
      return "未知";
  }
}

export function buildHomepageDecisionSignals(
  supervisorState: SupervisorState | null
): HomepageDecisionSignal[] {
  if (!supervisorState) {
    return [
      {
        label: "当前 gate",
        value: "未连接",
        tone: "zinc"
      },
      {
        label: "最新证据",
        value: "未连接",
        tone: "zinc"
      },
      {
        label: "阻塞风险",
        value: "未知",
        tone: "zinc"
      }
    ];
  }

  return [
    {
      label: "当前 gate",
      value: formatHomepageDecisionGateValue(supervisorState),
      tone: pickGateSignalTone(supervisorState)
    },
    {
      label: "最新证据",
      value: formatHomepageDecisionEvidenceValue(
        supervisorState.latestVerificationEvidence.status
      ),
      tone: pickEvidenceTone(supervisorState.latestVerificationEvidence.status)
    },
    {
      label: "阻塞风险",
      value: formatDecisionRiskValue(supervisorState.health.level),
      tone: pickHealthTone(supervisorState.health.level)
    }
  ];
}
