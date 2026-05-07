import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAgentRun,
  readAgentRunRecord,
  updateAgentRunStatus,
  writeAgentRunResult
} from "./agentRuns.ts";
import {
  readCommandBridgeState,
  recordCommandBridgeDispatch,
  recordCommandBridgeRunFinished,
  recordCommandBridgeRunStarted
} from "./commandBridge.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-command-bridge-"));
  createdRoots.push(projectRoot);
  return projectRoot;
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

describe("commandBridge", () => {
  it("persists latest route truth and writes a route artifact", async () => {
    const projectRoot = await createProjectRoot();
    const createdAt = "2026-04-09T02:00:00.000Z";

    const bridgeState = await recordCommandBridgeDispatch(projectRoot, {
      surface: "deck-action-bridge",
      sourceActionId: "advance-phase",
      createdAt
    });

    expect(bridgeState.latestRoute?.status).toBe("dispatched");
    expect(bridgeState.latestRoute?.artifactPath).toBe(
      ".threadsmith/bridges/2026-04-09T02-00-00-000Z-deck-action-bridge.md"
    );

    const routeArtifact = await readFile(
      join(
        projectRoot,
        ".threadsmith",
        "bridges",
        "2026-04-09T02-00-00-000Z-deck-action-bridge.md"
      ),
      "utf8"
    );

    expect(routeArtifact).toContain("Threadsmith Command Bridge Route");
    expect(routeArtifact).toContain("advance-phase");
  });

  it("updates command-bridge pointer truth when a run starts and finishes", async () => {
    const projectRoot = await createProjectRoot();
    const createdAt = "2026-04-09T02:00:00.000Z";
    const routeState = await recordCommandBridgeDispatch(projectRoot, {
      surface: "deck-action-bridge",
      sourceActionId: "advance-phase",
      createdAt
    });
    const routeId = routeState.latestRoute?.routeId;

    expect(routeId).toBeTruthy();

    await createAgentRun(
      projectRoot,
      {
        runId: "run-1",
        projectRoot,
        role: "executor",
        provider: "codex",
        objective: "推进当前 slice",
        scope: ["packages/runtime/src/commandBridge.ts"],
        doneWhen: ["结果写回 truth"],
        verification: ["npm run test"],
        contextRefs: [
          { kind: "state", path: ".threadsmith/current-phase.json" }
        ],
        output: {
          resultPath: ".threadsmith/runs/run-1/result.json",
          summaryPath: ".threadsmith/runs/run-1/result.md"
        }
      },
      createdAt
    );

    await updateAgentRunStatus(projectRoot, "run-1", {
      status: "running",
      startedAt: "2026-04-09T02:01:00.000Z"
    });

    const runningRecord = await readAgentRunRecord(projectRoot, "run-1");
    await recordCommandBridgeRunStarted(projectRoot, routeId!, runningRecord);

    await writeAgentRunResult(
      projectRoot,
      "run-1",
      {
        runId: "run-1",
        role: "executor",
        provider: "codex",
        outcome: "succeeded",
        summary: "command bridge 已完成并写回结果。",
        changedFiles: ["packages/runtime/src/commandBridge.ts"],
        verification: [{ command: "npm run test", status: "passed" }],
        evidenceRefs: [".threadsmith/runs/run-1/result.md"]
      },
      "2026-04-09T02:05:00.000Z"
    );

    await recordCommandBridgeRunFinished(projectRoot, "run-1");

    const commandBridgeState = await readCommandBridgeState(projectRoot);

    expect(commandBridgeState.latestRoute?.status).toBe("succeeded");
    expect(commandBridgeState.latestRoute?.runId).toBe("run-1");
    expect(commandBridgeState.latestRun?.status).toBe("succeeded");
    expect(commandBridgeState.latestRun?.truthWritebackStatus).toBe("written");
    expect(commandBridgeState.latestRun?.artifactPath).toBe(
      ".threadsmith/runs/run-1/result.md"
    );
    expect(commandBridgeState.latestRun?.summary).toBe(
      "command bridge 已完成并写回结果。"
    );
  });

  it("writes provider-aware route artifacts for unsupported claude routes", async () => {
    const projectRoot = await createProjectRoot();
    const createdAt = "2026-04-09T03:00:00.000Z";

    const bridgeState = await recordCommandBridgeDispatch(projectRoot, {
      surface: "deck-action-bridge",
      sourceActionId: "advance-phase",
      provider: "claude",
      createdAt
    });

    const routeArtifact = await readFile(
      join(
        projectRoot,
        ".threadsmith",
        "bridges",
        "2026-04-09T03-00-00-000Z-deck-action-bridge.md"
      ),
      "utf8"
    );

    expect(bridgeState.latestRoute?.provider).toBe("claude");
    expect(routeArtifact).toContain("Claude");
    expect(routeArtifact).toContain("暂不支持自动执行");
  });

  it("preserves classified reporting failures in latest run truth", async () => {
    const projectRoot = await createProjectRoot();
    const createdAt = "2026-04-09T04:00:00.000Z";
    const routeState = await recordCommandBridgeDispatch(projectRoot, {
      surface: "deck-action-bridge",
      sourceActionId: "advance-phase",
      createdAt
    });
    const routeId = routeState.latestRoute?.routeId;

    await createAgentRun(
      projectRoot,
      {
        runId: "run-reporting-failure",
        projectRoot,
        role: "executor",
        provider: "codex",
        objective: "推进当前 slice",
        scope: ["scripts/self-host-smoke.ts"],
        doneWhen: ["结果写回 truth"],
        verification: ["printf smoke-ok"],
        contextRefs: [
          { kind: "state", path: ".threadsmith/current-phase.json" }
        ],
        output: {
          resultPath: ".threadsmith/runs/run-reporting-failure/result.json",
          summaryPath: ".threadsmith/runs/run-reporting-failure/result.md"
        }
      },
      createdAt
    );

    await updateAgentRunStatus(projectRoot, "run-reporting-failure", {
      status: "running",
      startedAt: "2026-04-09T04:01:00.000Z"
    });

    const runningRecord = await readAgentRunRecord(projectRoot, "run-reporting-failure");
    await recordCommandBridgeRunStarted(projectRoot, routeId!, runningRecord);

    await writeAgentRunResult(
      projectRoot,
      "run-reporting-failure",
      {
        runId: "run-reporting-failure",
        role: "executor",
        provider: "codex",
        outcome: "failed",
        taskOutcome: "succeeded",
        failureStage: "result-reporting",
        failureKind: "rate-limit",
        summary: "任务主体已完成，但 Codex CLI 在结果上报阶段触发 rate limit。",
        changedFiles: [],
        verification: [{ command: "printf smoke-ok", status: "passed", summary: "smoke-ok" }],
        evidenceRefs: [".threadsmith/runs/run-reporting-failure/stderr.log"],
        blocker: "任务主体已完成，但结果上报阶段触发 rate limit。"
      },
      "2026-04-09T04:05:00.000Z"
    );

    await recordCommandBridgeRunFinished(projectRoot, "run-reporting-failure");

    const commandBridgeState = await readCommandBridgeState(projectRoot);

    expect(commandBridgeState.latestRun?.status).toBe("failed");
    expect(commandBridgeState.latestRun?.taskOutcome).toBe("succeeded");
    expect(commandBridgeState.latestRun?.failureStage).toBe("result-reporting");
    expect(commandBridgeState.latestRun?.failureKind).toBe("rate-limit");
    expect(commandBridgeState.latestRun?.summary).toContain("任务主体已完成");
    expect(commandBridgeState.latestRun?.truthWritebackStatus).toBe("failed-written");
  });
});
