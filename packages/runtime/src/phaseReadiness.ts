import type { ProjectState, WorkflowEvent } from "@threadsmith/domain";

export interface PhaseReadinessCheck {
  id: string;
  label: string;
  status: "ready" | "pending";
  detail: string;
}

export interface PhaseReadinessSummary {
  overall: "ready" | "not-ready";
  headline: string;
  detail: string;
  checks: PhaseReadinessCheck[];
  latestCloseoutMoment: string | null;
}

function check(
  id: string,
  label: string,
  status: PhaseReadinessCheck["status"],
  detail: string
): PhaseReadinessCheck {
  return {
    id,
    label,
    status,
    detail
  };
}

function latestCloseoutMoment(recentEvents: WorkflowEvent[]) {
  const event = recentEvents.find(
    (item) =>
      item.role === "closeout" || item.transitionId === "closeout-complete"
  );
  return event?.createdAt ?? null;
}

export function derivePhaseReadiness(
  state: ProjectState,
  recentEvents: WorkflowEvent[]
): PhaseReadinessSummary {
  const checks: PhaseReadinessCheck[] = [
    check(
      "acceptance-finalized",
      "验收已完成",
      state.acceptanceState.finalState === "accepted" ? "ready" : "pending",
      state.acceptanceState.finalState === "accepted"
        ? "当前切片已经被正式接受。"
        : "当前切片还没有被接受。"
    ),
    check(
      "closeout-complete",
      "收尾已完成",
      state.acceptanceState.closeoutStatus === "done" ? "ready" : "pending",
      state.acceptanceState.closeoutStatus === "done"
        ? "这个切片的收尾已经完成。"
        : "收尾还没有完成。"
    ),
    check(
      "blockers-cleared",
      "阻塞已清除",
      state.currentPhase.blockedBy.length === 0 &&
        state.activeWork.blockerSummary === null &&
        state.acceptanceState.reviewStatus !== "review-blocked" &&
        state.acceptanceState.verificationStatus !== "failed"
        ? "ready"
        : "pending",
      state.currentPhase.blockedBy.length === 0 &&
      state.activeWork.blockerSummary === null &&
      state.acceptanceState.reviewStatus !== "review-blocked" &&
      state.acceptanceState.verificationStatus !== "failed"
        ? "当前没有活跃阻塞把当前阶段卡住。"
        : "继续之前仍然有阻塞需要解决。"
    ),
    check(
      "decision-debt-cleared",
      "决策债务已清理",
      state.activeWork.items.some((item) => item.requiresUserDecision)
        ? "pending"
        : "ready",
      state.activeWork.items.some((item) => item.requiresUserDecision)
        ? "仍然有角色在等待人工决策。"
        : "当前没有角色在等待未解决的人工决策。"
    )
  ];

  const overall = checks.every((item) => item.status === "ready")
    ? "ready"
    : "not-ready";

  return {
    overall,
    headline:
      overall === "ready"
        ? "可以进入下一阶段"
        : "当前阶段还不能收口",
    detail:
      overall === "ready"
        ? "这个切片已经干净收口，可以交接到下一阶段。"
        : "在验收、收尾、阻塞和决策全部清空前，先保持当前阶段打开。",
    checks,
    latestCloseoutMoment: latestCloseoutMoment(recentEvents)
  };
}
