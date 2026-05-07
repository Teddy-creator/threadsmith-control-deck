import type { WorkflowEvent } from "@threadsmith/domain";

export interface LatestContinuationState {
  status: "available" | "missing";
  kind: "handoff" | "hygiene" | null;
  freshness: "fresh" | "stale" | null;
  headline: string;
  detail: string;
  freshnessDetail: string | null;
  recordedAt: string | null;
}

function parseKind(actionId: string | undefined) {
  if (actionId === "create-handoff") {
    return "handoff";
  }

  if (actionId === "run-hygiene") {
    return "hygiene";
  }

  return null;
}

function isPacketEvent(event: WorkflowEvent) {
  return event.actionId === "create-handoff" || event.actionId === "run-hygiene";
}

export function deriveLatestContinuationState(
  recentEvents: WorkflowEvent[]
): LatestContinuationState {
  const event = [...recentEvents]
    .filter((item) => isPacketEvent(item))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )[0];

  if (!event) {
    return {
      status: "missing",
      kind: null,
      freshness: null,
      headline: "还没有 handoff 或 hygiene packet",
      detail:
        "运行 hygiene 或创建 handoff，把当前 Threadsmith truth 收进可复用的 packet。",
      freshnessDetail: null,
      recordedAt: null
    };
  }

  const newerTruthEvent = [...recentEvents]
    .filter(
      (item) =>
        !isPacketEvent(item) &&
        new Date(item.createdAt).getTime() > new Date(event.createdAt).getTime()
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )[0];

  return {
    status: "available",
    kind: parseKind(event.actionId),
    freshness: newerTruthEvent ? "stale" : "fresh",
    headline: event.title,
    detail: event.detail,
    freshnessDetail: newerTruthEvent
      ? `这个 packet 之后又出现了更新的 workflow 事件“${newerTruthEvent.title}”。`
      : "这个 packet 与最新记录的 workflow truth 一致。",
    recordedAt: event.createdAt
  };
}
