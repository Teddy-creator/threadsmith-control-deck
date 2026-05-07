import type { ProjectState } from "@threadsmith/domain";
import type { LatestContinuationState } from "./continuationState.ts";
import {
  createMissingPhasePauseSummary,
  createMissingPhaseRunSummary,
  type PhasePauseSummary,
  type PhaseRunSummary
} from "./phaseRun.ts";

export type HealthLevel = "healthy" | "watch" | "risky" | "blocked";
export type ThreadHealth = "healthy" | "watch" | "handoff-recommended";

export interface ProjectHealth {
  level: HealthLevel;
  topRisks: string[];
  currentBlocker: string | null;
  threadHealth: ThreadHealth;
  verificationDebtCount: number;
}

export function deriveHealth(
  state: ProjectState,
  latestContinuationState: LatestContinuationState = {
    status: "missing",
    kind: null,
    freshness: null,
    headline: "还没有 handoff 或 hygiene packet",
    detail:
      "运行 hygiene 或创建 handoff，把当前 Threadsmith truth 收进可复用的 packet。",
    freshnessDetail: null,
    recordedAt: null
  },
  latestPhaseRun: PhaseRunSummary = createMissingPhaseRunSummary(),
  latestPhasePause: PhasePauseSummary = createMissingPhasePauseSummary()
): ProjectHealth {
  const phaseRunBlocker =
    latestPhaseRun.status === "paused" &&
    (latestPhasePause.type === "blocked" ||
      latestPhasePause.type === "missing-info" ||
      latestPhasePause.type === "infra-failure")
      ? latestPhasePause.summary ?? latestPhaseRun.pauseReason
      : null;
  const currentBlocker =
    state.activeWork.blockerSummary ??
    state.currentPhase.blockedBy[0] ??
    phaseRunBlocker ??
    null;
  const verificationDebtCount = state.acceptanceState.doneWhenChecklist.filter(
    (item) => item.status !== "pass"
  ).length;
  const continuationRisk =
    latestContinuationState.freshness === "stale"
      ? latestContinuationState.freshnessDetail ??
        "最新 continuation packet 已经过期。"
      : state.acceptanceState.finalState === "accepted" &&
          latestContinuationState.kind !== "handoff"
        ? "这个已接受的 slice 仍然需要一个专用的 handoff packet。"
        : null;
  const phaseRunRisk =
    latestPhaseRun.status === "paused"
      ? latestPhasePause.summary ?? latestPhaseRun.pauseReason
      : latestPhaseRun.status === "running" && latestPhaseRun.repairCount > 0
        ? `自动链路正在 ${latestPhaseRun.repairLabel}`
        : null;
  const topRisks = [
    ...state.currentPhase.blockedBy,
    ...state.acceptanceState.knownGaps,
    ...(phaseRunRisk ? [phaseRunRisk] : []),
    ...(continuationRisk ? [continuationRisk] : [])
  ].slice(0, 3);

  let level: HealthLevel = "healthy";
  if (currentBlocker) {
    level = "blocked";
  } else if (latestPhaseRun.status === "paused") {
    level = "risky";
  } else if (
    state.acceptanceState.verificationStatus === "failed" ||
    state.acceptanceState.reviewStatus === "review-blocked"
  ) {
    level = "risky";
  } else if (
    verificationDebtCount > 0 ||
    topRisks.length > 0 ||
    latestContinuationState.freshness === "stale"
  ) {
    level = "watch";
  }

  const combinedText = topRisks.join(" ").toLowerCase();
  const threadHealth: ThreadHealth =
    latestContinuationState.freshness === "stale" ||
    (state.acceptanceState.finalState === "accepted" &&
      latestContinuationState.kind !== "handoff") ||
    latestPhaseRun.status === "paused" ||
    combinedText.includes("thread") ||
    combinedText.includes("handoff") ||
    combinedText.includes("packet")
    ? "handoff-recommended"
    : level === "watch"
      ? "watch"
      : "healthy";

  return {
    level,
    topRisks,
    currentBlocker,
    threadHealth,
    verificationDebtCount
  };
}
