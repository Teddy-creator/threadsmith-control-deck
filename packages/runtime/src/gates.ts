import type { AgentRunRecord, ProjectState } from "@threadsmith/domain";
import type { LatestContinuationState } from "./continuationState.ts";
import {
  createMissingPhasePauseSummary,
  createMissingPhaseRunSummary,
  type PhasePauseSummary,
  type PhaseRunSummary
} from "./phaseRun.ts";

export interface GateSignal {
  shouldSurfaceDeck: boolean;
  reasons: string[];
}

export function deriveGateSignal(
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
  latestRun: AgentRunRecord | null = null,
  latestPhaseRun: PhaseRunSummary = createMissingPhaseRunSummary(),
  latestPhasePause: PhasePauseSummary = createMissingPhasePauseSummary()
): GateSignal {
  const reasons: string[] = [];

  if (state.currentPhase.blockedBy.length > 0) {
    reasons.push("phase-blocked");
  }
  if (state.acceptanceState.reviewStatus === "review-blocked") {
    reasons.push("blocking-review-findings");
  }
  if (state.acceptanceState.verificationStatus === "failed") {
    reasons.push("verification-failed");
  }
  if (state.acceptanceState.finalState === "accepted-with-closeout-pending") {
    reasons.push("closeout-pending");
  }
  if (latestRun?.status === "failed") {
    reasons.push("latest-run-failed");
  }
  if (latestPhaseRun.status === "paused") {
    reasons.push("phase-run-paused");
  } else if (latestPhaseRun.status === "failed") {
    reasons.push("phase-run-failed");
  } else if (latestPhaseRun.status === "running" && latestPhaseRun.repairCount > 0) {
    reasons.push("phase-run-repairing");
  }
  if (latestPhasePause.type === "infra-failure") {
    reasons.push("phase-run-infra-failure");
  }
  if (latestContinuationState.freshness === "stale") {
    reasons.push("stale-continuation-packet");
  } else if (
    state.acceptanceState.finalState === "accepted" &&
    latestContinuationState.kind !== "handoff"
  ) {
    reasons.push("handoff-recommended");
  }

  return {
    shouldSurfaceDeck: reasons.length > 0,
    reasons
  };
}
