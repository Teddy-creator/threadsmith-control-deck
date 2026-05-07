import { PassThrough } from "node:stream";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STATE_FILES,
  initializeProjectState,
  loadProjectState,
  readActionHistory,
  readCommandBridgeState,
  writeProviderRouting,
  writeStateFragment
} from "@threadsmith/fs-bridge";
import { advancePhaseFromDeck } from "./deckActionBridge.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-deck-bridge-"));
  createdRoots.push(projectRoot);
  await initializeProjectState(projectRoot);
  return projectRoot;
}

function createMockChild() {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const child = {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const current = listeners.get(event) ?? [];
      current.push(handler);
      listeners.set(event, current);
      return child;
    })
  };

  return {
    child,
    emit(event: string, ...args: unknown[]) {
      for (const handler of listeners.get(event) ?? []) {
        handler(...args);
      }
    }
  };
}

async function seedProject(projectRoot: string) {
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Deck bridge smoke",
    phaseGoal: "通过 deck bridge 发起一轮真实 executor run。",
    deliverable: "command bridge 写入 route 与 run truth",
    inScope: ["只验证 deck-action bridge 到 executor run 的链路"],
    outOfScope: ["不进入 multi-provider", "不改 UI 风格"],
    stopCondition: "latestRoute 与 latestRun 已经被 deck bridge 写回。",
    verificationForThisPhase: ["echo smoke"],
    activeOwners: ["executor"],
    blockedBy: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim: "Threadsmith 可以从 deck 签发 executor bridge。",
    doneWhenChecklist: [
      {
        id: "bridge-started",
        label: "deck bridge 已签发",
        status: "unknown"
      }
    ],
    implementationStatus: "not-started",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: [],
    finalState: "not-ready"
  });

  await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
    items: [
      {
        role: "planner",
        status: "done",
        taskSummary: "已收紧 deck bridge smoke slice",
        requiresUserDecision: false
      }
    ],
    blockerSummary: null
  });
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map(async (projectRoot) => {
      await import("node:fs/promises").then(({ rm }) =>
        rm(projectRoot, { recursive: true, force: true })
      );
    })
  );
});

describe("advancePhaseFromDeck", () => {
  it("applies the deck action and records a deck-action route before the run finishes", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);
    const { child } = createMockChild();
    const spawnMock = vi.fn(() => child as any);

    const result = await advancePhaseFromDeck({
      projectRoot,
      continuationBehavior: "smart-continuation",
      startedAt: "2026-04-12T13:00:00.000Z",
      spawnProcess: spawnMock as any
    });

    expect(result.kind).toBe("launched");
    const bridgeState = await readCommandBridgeState(projectRoot);
    const actions = await readActionHistory(projectRoot);
    const state = await loadProjectState(projectRoot);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.actionId).toBe("advance-phase");
    expect(actions[0]?.continuationBehavior).toBe("smart-continuation");
    expect(bridgeState.latestRoute?.surface).toBe("deck-action-bridge");
    expect(bridgeState.latestRoute?.sourceActionId).toBe("advance-phase");
    expect(bridgeState.latestRoute?.status).toBe("running");
    expect(bridgeState.latestRoute?.runId).toBe(bridgeState.latestRun?.runId);
    expect(bridgeState.latestRun?.status).toBe("running");
    expect(bridgeState.latestRun?.role).toBe("executor");
    expect(state.acceptanceState.implementationStatus).toBe("implementing");
    expect(
      state.activeWork.items.find((item) => item.role === "executor")?.status
    ).toBe("running");
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("records an honest failed route when executor is routed to claude", async () => {
    const projectRoot = await createProjectRoot();
    await seedProject(projectRoot);
    await writeProviderRouting(projectRoot, {
      executor: "claude",
      conductorSurface: "claude-cli"
    });

    const result = await advancePhaseFromDeck({
      projectRoot,
      startedAt: "2026-04-12T13:05:00.000Z"
    });

    expect(result.kind).toBe("unsupported-provider");
    if (result.kind !== "unsupported-provider") {
      throw new Error("expected unsupported-provider result");
    }

    const bridgeState = await readCommandBridgeState(projectRoot);
    const actions = await readActionHistory(projectRoot);
    const state = await loadProjectState(projectRoot);

    expect(actions).toHaveLength(0);
    expect(bridgeState.latestRoute?.provider).toBe("claude");
    expect(bridgeState.latestRoute?.status).toBe("failed");
    expect(bridgeState.latestRoute?.surface).toBe("deck-action-bridge");
    expect(bridgeState.latestRun).toBeNull();
    expect(result.detail).toContain("Claude");
    expect(state.acceptanceState.implementationStatus).toBe("not-started");
  });
});
