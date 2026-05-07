import type { AgentRunRecord, ProjectState, WorkflowEvent } from "@threadsmith/domain";
import type { GateSignal } from "./gates.ts";

export interface SupervisionTimelineEntry {
  id: string;
  title: string;
  detail: string;
  badge: string;
  tone: "neutral" | "warning" | "success";
  recordedAt: string | null;
  source: "active-gate" | "decision";
}

function gateEntry(
  id: string,
  title: string,
  detail: string,
  tone: SupervisionTimelineEntry["tone"]
): SupervisionTimelineEntry {
  return {
    id,
    title,
    detail,
    badge: "当前门控",
    tone,
    recordedAt: null,
    source: "active-gate"
  };
}

function decisionTone(event: WorkflowEvent): SupervisionTimelineEntry["tone"] {
  if (event.kind === "agent-run") {
    if (event.outcome === "failed" || event.outcome === "cancelled") {
      return "warning";
    }

    if (event.outcome === "succeeded") {
      return "success";
    }
  }

  if (
    event.transitionId === "reviewer-blocked" ||
    event.transitionId === "verifier-failed"
  ) {
    return "warning";
  }

  if (
    event.transitionId === "executor-ready-for-review" ||
    event.transitionId === "reviewer-ready-for-verification" ||
    event.transitionId === "verifier-accepted" ||
    event.transitionId === "closeout-complete"
  ) {
    return "success";
  }

  return "neutral";
}

function decisionBadge(event: WorkflowEvent) {
  if (event.role) {
    return event.role;
  }

  return event.kind === "workflow-transition" ? "transition" : "decision";
}

function buildGateEntries(
  state: ProjectState,
  gateSignal: GateSignal,
  latestRun: AgentRunRecord | null
): SupervisionTimelineEntry[] {
  return gateSignal.reasons.map((reason) => {
    switch (reason) {
      case "phase-blocked":
        return gateEntry(
          reason,
          "Phase 被阻塞",
          state.activeWork.blockerSummary ??
            state.currentPhase.blockedBy[0] ??
            "当前 phase 存在一个活跃阻塞。",
          "warning"
        );
      case "blocking-review-findings":
        return gateEntry(
          reason,
          "存在阻塞性评审发现",
          state.activeWork.blockerSummary ??
            "评审发现了阻塞问题，需要再来一个修复 slice。",
          "warning"
        );
      case "verification-failed":
        return gateEntry(
          reason,
          "Verification 失败",
          "当前 claim 还没有被新的证据支持。",
          "warning"
        );
      case "closeout-pending":
        return gateEntry(
          reason,
          "Closeout 待完成",
          "verification 已通过，但在最终接受前仍需完成 closeout。",
          "neutral"
        );
      case "latest-run-failed":
        if (
          latestRun?.status === "failed" &&
          latestRun.taskOutcome === "succeeded" &&
          latestRun.failureStage === "result-reporting"
        ) {
          return gateEntry(
            reason,
            "最新结果上报失败",
            latestRun.statusDetail?.trim() ??
              "最近一轮自动执行的任务体已完成，但结果在上报阶段失败，先处理 bridge / CLI 问题更稳。",
            "warning"
          );
        }

        return gateEntry(
          reason,
          "最新自动执行失败",
          state.activeWork.blockerSummary ??
            "最近一轮自动执行没有完成，先处理失败原因再继续推进更稳。",
          "warning"
        );
      case "handoff-recommended":
        return gateEntry(
          reason,
          "建议创建 handoff",
          "当前线程或状态表明，一个更干净的 continuation 路径会更稳妥。",
          "neutral"
        );
      case "stale-continuation-packet":
        return gateEntry(
          reason,
          "建议刷新 packet",
          "最新 continuation packet 之后又发生了新的 workflow 事件，因此应该刷新这个 packet。",
          "warning"
        );
      default:
        return gateEntry(
          reason,
          reason,
          "Threadsmith 检测到一个活动中的门控信号。",
          "neutral"
        );
    }
  });
}

function buildDecisionEntries(
  recentEvents: WorkflowEvent[]
): SupervisionTimelineEntry[] {
  return recentEvents.map((event) => ({
    id: event.id,
    title: event.title,
    detail: event.detail,
    badge: decisionBadge(event),
    tone: decisionTone(event),
    recordedAt: event.createdAt,
    source: "decision"
  }));
}

export function deriveSupervisionTimeline(
  state: ProjectState,
  gateSignal: GateSignal,
  recentEvents: WorkflowEvent[],
  latestRun: AgentRunRecord | null = null
) {
  return [
    ...buildGateEntries(state, gateSignal, latestRun),
    ...buildDecisionEntries(recentEvents)
  ];
}
