import type { ProjectState, WorkflowEvent } from "@threadsmith/domain";

export interface CloseoutRecordSummary {
  status: "not-started" | "pending" | "done";
  headline: string;
  detail: string;
  recordedAt: string | null;
  source: "event" | "state";
  artifactPath: string | null;
}

export function deriveLatestCloseoutRecord(
  state: ProjectState,
  recentEvents: WorkflowEvent[]
): CloseoutRecordSummary {
  const latestCloseoutEvent = recentEvents.find(
    (event) => event.transitionId === "closeout-complete" || event.role === "closeout"
  );

  if (latestCloseoutEvent) {
    return {
      status: "done",
      headline: latestCloseoutEvent.title,
      detail: latestCloseoutEvent.detail,
      recordedAt: latestCloseoutEvent.createdAt,
      source: "event",
      artifactPath: latestCloseoutEvent.artifactPath ?? null
    };
  }

  switch (state.acceptanceState.closeoutStatus) {
    case "done":
      return {
        status: "done",
        headline: "Closeout 已完成",
        detail: "当前 slice 的 closeout 已经完成。",
        recordedAt: null,
        source: "state",
        artifactPath: null
      };
    case "pending":
      return {
        status: "pending",
        headline: "Closeout 待完成",
        detail: "verification 已通过，但在最终接受前仍需完成 closeout。",
        recordedAt: null,
        source: "state",
        artifactPath: null
      };
    default:
      return {
        status: "not-started",
        headline: "Closeout 尚未开始",
        detail: "当前 slice 还没有进入 closeout。",
        recordedAt: null,
        source: "state",
        artifactPath: null
      };
  }
}
