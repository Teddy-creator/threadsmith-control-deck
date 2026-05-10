import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readLatestContinuationPacket } from "./continuationPackets.ts";
import { readRecentEvents } from "./events.ts";
import { loadProjectState } from "./fileStore.ts";

const freshFixtureRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../examples/project-state"
);

const staleFixtureRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../examples/project-state-stale-packet"
);

describe("example project fixture", () => {
  it("loads a realistic accepted fresh demo state with packet-aligned events", async () => {
    const state = await loadProjectState(freshFixtureRoot);
    const recentEvents = await readRecentEvents(freshFixtureRoot);
    const latestPacket = await readLatestContinuationPacket(freshFixtureRoot);

    expect(state.projectRoadmap.versionLabel).toBe("Threadsmith Context OS Demo");
    expect(state.projectRoadmap.milestones[3]?.state).toBe("current");
    expect(state.currentPhase.phaseName).toBe("收口 Context OS demo 基线");
    expect(state.acceptanceState.finalState).toBe("accepted");
    expect(state.acceptanceState.doneWhenChecklist.every((item) => item.status === "pass")).toBe(true);
    expect(state.activeWork.items.every((item) => item.status === "done")).toBe(true);
    expect(recentEvents[0]?.actionId).toBe("create-handoff");
    expect(recentEvents[0]?.detail).toContain(".threadsmith/packets/");
    expect(recentEvents[0]?.createdAt).toBe("2026-04-04T08:16:00.000Z");
    expect(latestPacket?.kind).toBe("handoff");
    expect(latestPacket?.createdAt).toBe(recentEvents[0]?.createdAt);
    expect(latestPacket?.relativePath).toBe(
      ".threadsmith/packets/2026-04-04T08-16-00-000Z-handoff.md"
    );
  });

  it("loads a realistic accepted stale demo state whose latest truth is newer than the packet", async () => {
    const state = await loadProjectState(staleFixtureRoot);
    const recentEvents = await readRecentEvents(staleFixtureRoot);
    const latestPacket = await readLatestContinuationPacket(staleFixtureRoot);

    expect(state.projectRoadmap.versionLabel).toBe(
      "Threadsmith Truth Confidence Demo"
    );
    expect(state.projectRoadmap.milestones[2]?.state).toBe("blocked");
    expect(state.currentPhase.phaseName).toBe("刷新过期 demo packet");
    expect(state.acceptanceState.finalState).toBe("accepted");
    expect(state.acceptanceState.closeoutStatus).toBe("done");
    expect(state.acceptanceState.doneWhenChecklist.every((item) => item.status === "pass")).toBe(true);
    expect(latestPacket?.kind).toBe("handoff");
    expect(latestPacket?.relativePath).toBe(
      ".threadsmith/packets/2026-04-04T09-12-00-000Z-handoff.md"
    );
    expect(recentEvents[0]?.transitionId).toBe("closeout-complete");
    expect(recentEvents[0]?.title).toBe("Closeout 在 packet 之后完成");
    expect(
      Date.parse(recentEvents[0]?.createdAt ?? "") > Date.parse(latestPacket?.createdAt ?? "")
    ).toBe(true);
    expect(recentEvents.some((event) => event.actionId === "create-handoff")).toBe(true);
    expect(recentEvents.find((event) => event.actionId === "create-handoff")?.detail).toContain(
      latestPacket?.relativePath ?? ""
    );
  });
});
