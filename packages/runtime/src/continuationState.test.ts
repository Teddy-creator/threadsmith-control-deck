import { describe, expect, it } from "vitest";
import type { WorkflowEvent } from "@threadsmith/domain";
import { deriveLatestContinuationState } from "./continuationState.ts";

describe("deriveLatestContinuationState", () => {
  it("returns the newest hygiene or handoff packet event", () => {
    const events: WorkflowEvent[] = [
      {
        id: "handoff-created",
        createdAt: "2026-04-04T00:10:00.000Z",
        kind: "deck-action",
        title: "已创建 handoff packet",
        detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
        role: "hygiene",
        actionId: "create-handoff"
      },
      {
        id: "hygiene-created",
        createdAt: "2026-04-04T00:12:00.000Z",
        kind: "deck-action",
        title: "已创建 hygiene packet",
        detail: "已重新锚定当前 truth。 Packet：.threadsmith/packets/example-hygiene.md",
        role: "hygiene",
        actionId: "run-hygiene"
      }
    ];

    const summary = deriveLatestContinuationState(events);

    expect(summary.status).toBe("available");
    expect(summary.kind).toBe("hygiene");
    expect(summary.freshness).toBe("fresh");
    expect(summary.headline).toBe("已创建 hygiene packet");
    expect(summary.detail).toContain(".threadsmith/packets/example-hygiene.md");
    expect(summary.freshnessDetail).toBe(
      "这个 packet 与最新记录的 workflow truth 一致。"
    );
  });

  it("marks a packet as stale when a newer workflow event lands after it", () => {
    const summary = deriveLatestContinuationState([
      {
        id: "handoff-created",
        createdAt: "2026-04-04T00:10:00.000Z",
        kind: "deck-action",
        title: "已创建 handoff packet",
        detail: "已记录当前 truth。 Packet：.threadsmith/packets/example-handoff.md",
        role: "hygiene",
        actionId: "create-handoff"
      },
      {
        id: "reviewer-ready",
        createdAt: "2026-04-04T00:12:00.000Z",
        kind: "workflow-transition",
        title: "Reviewer 已放行这个 slice",
        detail: "Acceptance 已进入 ready-for-verification。",
        role: "reviewer",
        transitionId: "reviewer-ready-for-verification"
      }
    ]);

    expect(summary.status).toBe("available");
    expect(summary.kind).toBe("handoff");
    expect(summary.freshness).toBe("stale");
    expect(summary.freshnessDetail).toContain("Reviewer 已放行这个 slice");
  });

  it("returns a placeholder when no packet event exists", () => {
    const summary = deriveLatestContinuationState([]);

    expect(summary.status).toBe("missing");
    expect(summary.kind).toBeNull();
    expect(summary.freshness).toBeNull();
    expect(summary.headline).toBe("还没有 handoff 或 hygiene packet");
  });
});
