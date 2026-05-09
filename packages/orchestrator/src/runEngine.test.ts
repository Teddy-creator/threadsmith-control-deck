import { PassThrough } from "node:stream";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STATE_FILES,
  initializeProjectState,
  loadProjectState,
  readRecentEvents,
  readAgentRunRecord,
  readAgentRunResult,
  writeStateFragment
} from "@threadsmith/fs-bridge";
import { startProjectRun } from "./runEngine.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-orchestrator-"));
  createdRoots.push(projectRoot);
  await initializeProjectState(projectRoot);
  return projectRoot;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function setPhaseVerification(projectRoot: string, verification: string[]) {
  const state = await loadProjectState(projectRoot);
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    ...state.currentPhase,
    verificationForThisPhase: verification
  });
}

async function waitForRunEvent(
  projectRoot: string,
  runId: string,
  predicate: (events: Awaited<ReturnType<typeof readRecentEvents>>) => boolean
) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const events = await readRecentEvents(projectRoot, 20);

    if (
      predicate(events) &&
      events.some((event) => event.kind === "agent-run" && event.runId === runId)
    ) {
      return events;
    }

    await sleep(10);
  }

  throw new Error(`等待 run ${runId} 的最终事件落盘超时`);
}

afterEach(async () => {
  delete process.env.THREADSMITH_CODEX_REASONING_EFFORT;
  await Promise.all(
    createdRoots.splice(0).map(async (projectRoot) => {
      await import("node:fs/promises").then(({ rm }) =>
        rm(projectRoot, { recursive: true, force: true })
      );
    })
  );
});

describe("startProjectRun", () => {
  it("creates a Codex executor run and launches codex exec with stdin prompt", async () => {
    const projectRoot = await createProjectRoot();
    const { child } = createMockChild();
    const spawnMock = vi.fn(() => child as any);

    const result = await startProjectRun({
      projectRoot,
      role: "executor",
      provider: "codex",
      runId: "run-1",
      startedAt: "2026-04-08T10:00:00.000Z",
      spawnProcess: spawnMock as any
    });
    const persisted = await readAgentRunRecord(projectRoot, "run-1");
    const outputSchema = JSON.parse(
      await readFile(
        join(
          projectRoot,
          ".threadsmith",
          "runs",
          "run-1",
          "output-schema.json"
        ),
        "utf8"
      )
    ) as {
      required: string[];
      properties: {
        verification: {
          items: {
            required: string[];
            properties: Record<string, unknown>;
          };
        };
        blocker?: unknown;
        decision?: unknown;
        sliceRef?: unknown;
        pauseRecommendation?: unknown;
        riskHits?: unknown;
        taskOutcome?: unknown;
        failureStage?: unknown;
        failureKind?: unknown;
      };
    };

    expect(spawnMock).toHaveBeenCalledWith(
      "codex",
      expect.arrayContaining([
        "exec",
        "--cd",
        projectRoot,
        "--skip-git-repo-check",
        "--full-auto",
        "-"
      ]),
      expect.objectContaining({
        cwd: projectRoot
      })
    );
    expect(result.run.provider).toBe("codex");
    expect(result.run.status).toBe("running");
    expect(persisted.status).toBe("running");
    expect(result.packet.role).toBe("executor");
    expect(outputSchema.required).toEqual([
      "runId",
      "role",
      "provider",
      "outcome",
      "decision",
      "sliceRef",
      "pauseRecommendation",
      "riskHits",
      "summary",
      "changedFiles",
      "verification",
      "evidenceRefs",
      "blocker"
    ]);
    expect(outputSchema.properties.verification.items.required).toEqual([
      "command",
      "status"
    ]);
    expect(outputSchema.properties.verification.items.properties.summary).toBe(
      undefined
    );
    expect(outputSchema.properties.blocker).toEqual({
      anyOf: [{ type: "string" }, { type: "null" }]
    });
    expect(outputSchema.properties.decision).toEqual({
      anyOf: [
        {
          type: "string",
          enum: [
            "slice-ready",
            "pause-recommended",
            "ready-for-review",
            "review-blocked",
            "ready-for-verification",
            "verification-failed",
            "accepted-with-closeout-pending",
            "accepted"
          ]
        },
        { type: "null" }
      ]
    });
    expect(outputSchema.properties.sliceRef).toEqual({
      anyOf: [{ type: "string" }, { type: "null" }]
    });
    expect(outputSchema.properties.pauseRecommendation).toEqual({
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["type", "summary", "detail", "resumeRequirements"],
          properties: {
            type: {
              type: "string",
              enum: [
                "risk",
                "blocked",
                "missing-info",
                "loop-limit",
                "infra-failure"
              ]
            },
            summary: { type: "string" },
            detail: { type: "string" },
            resumeRequirements: {
              type: "array",
              items: { type: "string" }
            }
          }
        },
        { type: "null" }
      ]
    });
    expect(outputSchema.properties.riskHits).toEqual({
      anyOf: [
        {
          type: "array",
          items: { type: "string" }
        },
        { type: "null" }
      ]
    });
    expect(outputSchema.properties.taskOutcome).toBe(undefined);
    expect(outputSchema.properties.failureStage).toBe(undefined);
    expect(outputSchema.properties.failureKind).toBe(undefined);
  });

  it("passes a reasoning override through to codex exec when configured", async () => {
    const projectRoot = await createProjectRoot();
    const { child } = createMockChild();
    const spawnMock = vi.fn(() => child as any);
    process.env.THREADSMITH_CODEX_REASONING_EFFORT = "low";

    const launched = await startProjectRun({
      projectRoot,
      role: "executor",
      provider: "codex",
      runId: "run-low-effort",
      startedAt: "2026-04-09T00:00:00.000Z",
      spawnProcess: spawnMock as any
    });

    expect(spawnMock).toHaveBeenCalledWith(
      "codex",
      expect.arrayContaining([
        "exec",
        "-c",
        'model_reasoning_effort="low"'
      ]),
      expect.objectContaining({
        cwd: projectRoot
      })
    );
  });

  it("classifies fallback verification success as reporting-stage failure when codex closes without JSON", async () => {
    const projectRoot = await createProjectRoot();
    await setPhaseVerification(projectRoot, ["printf smoke-ok"]);
    const { child, emit } = createMockChild();
    const spawnMock = vi.fn(() => child as any);

    const launched = await startProjectRun({
      projectRoot,
      role: "executor",
      provider: "codex",
      runId: "run-reporting-failure",
      startedAt: "2026-04-09T10:00:00.000Z",
      spawnProcess: spawnMock as any
    });

    child.stdout.end("");
    child.stderr.end("429 Too Many Requests");
    emit("close", 1, null);

    const record = await launched.completion;

    expect(record.status).toBe("failed");
    expect(record.taskOutcome).toBe("succeeded");
    expect(record.failureStage).toBe("result-reporting");
    expect(record.failureKind).toBe("rate-limit");

    const result = await readAgentRunResult(projectRoot, "run-reporting-failure");
    expect(result.outcome).toBe("failed");
    expect(result.taskOutcome).toBe("succeeded");
    expect(result.failureStage).toBe("result-reporting");
    expect(result.failureKind).toBe("rate-limit");
    expect(result.summary).toContain("任务主体已完成");
    expect(result.verification).toEqual([
      {
        command: "printf smoke-ok",
        status: "passed",
        summary: "smoke-ok"
      }
    ]);

    await waitForRunEvent(
      projectRoot,
      "run-reporting-failure",
      (events) =>
        events.some(
          (event) =>
            event.kind === "agent-run" &&
            event.runId === "run-reporting-failure" &&
            event.outcome === "failed"
        )
    );
  });

  it("classifies startup errors before task execution begins", async () => {
    const projectRoot = await createProjectRoot();
    const { child, emit } = createMockChild();
    const spawnMock = vi.fn(() => child as any);

    const launched = await startProjectRun({
      projectRoot,
      role: "executor",
      provider: "codex",
      runId: "run-startup-failure",
      startedAt: "2026-04-09T10:10:00.000Z",
      spawnProcess: spawnMock as any
    });

    emit("error", new Error("spawn failed"));

    const record = await launched.completion;

    expect(record.status).toBe("failed");
    expect(record.taskOutcome).toBe("unknown");
    expect(record.failureStage).toBe("cli-startup");
    expect(record.failureKind).toBe("cli-startup");

    const result = await readAgentRunResult(projectRoot, "run-startup-failure");
    expect(result.failureStage).toBe("cli-startup");
    expect(result.failureKind).toBe("cli-startup");
    expect(result.summary).toContain("Codex CLI 启动失败");

    await waitForRunEvent(
      projectRoot,
      "run-startup-failure",
      (events) =>
        events.some(
          (event) =>
            event.kind === "agent-run" &&
            event.runId === "run-startup-failure" &&
            event.outcome === "failed"
        )
    );
  });
});
