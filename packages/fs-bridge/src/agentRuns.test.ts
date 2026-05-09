import { mkdtemp, readFile, readdir, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAgentRun,
  readAgentRunPacket,
  readAgentRunRecord,
  readAgentRunResult,
  readLatestAgentRuns,
  updateAgentRunStatus,
  writeAgentRunPrompt,
  writeAgentRunResult
} from "./agentRuns.ts";
import { AGENT_RUN_FILES, getRunFilePath } from "./paths.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-runs-"));
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

describe("agentRuns", () => {
  it("creates a run record and writes the packet to disk", async () => {
    const projectRoot = await createProjectRoot();

    const created = await createAgentRun(
      projectRoot,
      {
        runId: "run-1",
        projectRoot,
        role: "executor",
        provider: "codex",
        objective: "实现当前 slice",
        scope: ["修改 workflow.ts"],
        doneWhen: ["相关测试通过"],
        verification: ["npm run test"],
        contextRefs: [
          { kind: "state", path: ".threadsmith/current-phase.json" }
        ],
        output: {
          resultPath: ".threadsmith/runs/run-1/result.json",
          summaryPath: ".threadsmith/runs/run-1/result.md"
        }
      },
      "2026-04-08T10:00:00.000Z"
    );

    const packet = await readAgentRunPacket(projectRoot, "run-1");
    const record = await readAgentRunRecord(projectRoot, "run-1");

    expect(created.record.status).toBe("queued");
    expect(packet.objective).toBe("实现当前 slice");
    expect(record.packetPath).toBe(".threadsmith/runs/run-1/packet.json");
  });

  it("updates status metadata and stores a prompt artifact", async () => {
    const projectRoot = await createProjectRoot();
    await createAgentRun(projectRoot, {
      runId: "run-1",
      projectRoot,
      role: "executor",
      provider: "codex",
      objective: "实现当前 slice",
      scope: ["修改 workflow.ts"],
      doneWhen: ["相关测试通过"],
      verification: ["npm run test"],
      contextRefs: [
        { kind: "state", path: ".threadsmith/current-phase.json" }
      ],
      output: {
        resultPath: ".threadsmith/runs/run-1/result.json",
        summaryPath: ".threadsmith/runs/run-1/result.md"
      }
    });

    await updateAgentRunStatus(projectRoot, "run-1", {
      status: "running",
      startedAt: "2026-04-08T10:05:00.000Z"
    });
    const updated = await writeAgentRunPrompt(
      projectRoot,
      "run-1",
      "# Prompt\n\n只推进当前 slice。\n"
    );
    const promptContents = await readFile(
      getRunFilePath(projectRoot, "run-1", AGENT_RUN_FILES.prompt),
      "utf8"
    );

    expect(updated.status).toBe("running");
    expect(updated.promptPath).toBe(".threadsmith/runs/run-1/prompt.md");
    expect(promptContents).toContain("当前 slice");
  });

  it("replaces status records atomically without leaving temporary files", async () => {
    const projectRoot = await createProjectRoot();
    await createAgentRun(projectRoot, {
      runId: "run-atomic",
      projectRoot,
      role: "executor",
      provider: "codex",
      objective: "原子写 status",
      scope: ["更新 run metadata"],
      doneWhen: ["status.json 始终可解析"],
      verification: [],
      contextRefs: [
        { kind: "state", path: ".threadsmith/current-phase.json" }
      ],
      output: {
        resultPath: ".threadsmith/runs/run-atomic/result.json",
        summaryPath: ".threadsmith/runs/run-atomic/result.md"
      }
    });

    await updateAgentRunStatus(projectRoot, "run-atomic", {
      status: "running",
      statusDetail: "正在执行"
    });
    await updateAgentRunStatus(projectRoot, "run-atomic", {
      status: "failed",
      outcome: "failed",
      statusDetail: "执行失败"
    });

    const runDirEntries = await readdir(join(projectRoot, ".threadsmith", "runs", "run-atomic"));
    const record = await readAgentRunRecord(projectRoot, "run-atomic");

    expect(record.status).toBe("failed");
    expect(record.statusDetail).toBe("执行失败");
    expect(runDirEntries.filter((entry) => entry.endsWith(".tmp"))).toEqual([]);
  });

  it("writes a structured result and marks the run complete", async () => {
    const projectRoot = await createProjectRoot();
    await createAgentRun(projectRoot, {
      runId: "run-1",
      projectRoot,
      role: "executor",
      provider: "codex",
      objective: "实现当前 slice",
      scope: ["修改 workflow.ts"],
      doneWhen: ["相关测试通过"],
      verification: ["npm run test"],
      contextRefs: [
        { kind: "state", path: ".threadsmith/current-phase.json" }
      ],
      output: {
        resultPath: ".threadsmith/runs/run-1/result.json",
        summaryPath: ".threadsmith/runs/run-1/result.md"
      }
    });

    const written = await writeAgentRunResult(
      projectRoot,
      "run-1",
      {
        runId: "run-1",
        role: "executor",
        provider: "codex",
        outcome: "succeeded",
        summary: "当前 slice 已完成，可进入 review。",
        changedFiles: ["packages/fs-bridge/src/workflow.ts"],
        verification: [{ command: "npm test", status: "passed" }],
        evidenceRefs: [".threadsmith/runs/run-1/result.md"]
      },
      "2026-04-08T10:15:00.000Z"
    );
    const result = await readAgentRunResult(projectRoot, "run-1");
    const record = await readAgentRunRecord(projectRoot, "run-1");

    expect(written.record.status).toBe("succeeded");
    expect(result.outcome).toBe("succeeded");
    expect(record.finishedAt).toBe("2026-04-08T10:15:00.000Z");
    expect(record.summaryPath).toBe(".threadsmith/runs/run-1/result.md");
  });

  it("reads the newest runs first", async () => {
    const projectRoot = await createProjectRoot();

    await createAgentRun(
      projectRoot,
      {
        runId: "run-1",
        projectRoot,
        role: "executor",
        provider: "codex",
        objective: "第一轮",
        scope: ["修改 workflow.ts"],
        doneWhen: ["测试通过"],
        verification: [],
        contextRefs: [],
        output: {
          resultPath: ".threadsmith/runs/run-1/result.json",
          summaryPath: ".threadsmith/runs/run-1/result.md"
        }
      },
      "2026-04-08T09:00:00.000Z"
    );

    await createAgentRun(
      projectRoot,
      {
        runId: "run-2",
        projectRoot,
        role: "planner",
        provider: "claude",
        objective: "第二轮",
        scope: ["刷新 phase contract"],
        doneWhen: ["phase contract 更新"],
        verification: [],
        contextRefs: [],
        output: {
          resultPath: ".threadsmith/runs/run-2/result.json",
          summaryPath: ".threadsmith/runs/run-2/result.md"
        }
      },
      "2026-04-08T10:00:00.000Z"
    );

    const runs = await readLatestAgentRuns(projectRoot);

    expect(runs).toHaveLength(2);
    expect(runs[0]?.runId).toBe("run-2");
    expect(runs[1]?.runId).toBe("run-1");
  });

  it("prefers the latest status file write time over embedded createdAt timestamps", async () => {
    const projectRoot = await createProjectRoot();

    await createAgentRun(
      projectRoot,
      {
        runId: "run-future-old",
        projectRoot,
        role: "closeout",
        provider: "codex",
        objective: "旧 run 但时间戳偏未来",
        scope: ["写回 closeout"],
        doneWhen: ["closeout 完成"],
        verification: [],
        contextRefs: [],
        output: {
          resultPath: ".threadsmith/runs/run-future-old/result.json",
          summaryPath: ".threadsmith/runs/run-future-old/result.md"
        }
      },
      "2026-04-12T16:05:02.000Z"
    );

    await createAgentRun(
      projectRoot,
      {
        runId: "run-local-new",
        projectRoot,
        role: "executor",
        provider: "codex",
        objective: "本地刚跑完的新 run",
        scope: ["跑 smoke"],
        doneWhen: ["marker 写入"],
        verification: [],
        contextRefs: [],
        output: {
          resultPath: ".threadsmith/runs/run-local-new/result.json",
          summaryPath: ".threadsmith/runs/run-local-new/result.md"
        }
      },
      "2026-04-12T12:24:27.700Z"
    );

    const olderStatusPath = getRunFilePath(
      projectRoot,
      "run-future-old",
      AGENT_RUN_FILES.status
    );
    const newerStatusPath = getRunFilePath(
      projectRoot,
      "run-local-new",
      AGENT_RUN_FILES.status
    );

    await utimes(olderStatusPath, new Date("2026-04-12T12:00:00.000Z"), new Date("2026-04-12T12:00:00.000Z"));
    await utimes(newerStatusPath, new Date("2026-04-12T12:30:00.000Z"), new Date("2026-04-12T12:30:00.000Z"));

    const runs = await readLatestAgentRuns(projectRoot);

    expect(runs[0]?.runId).toBe("run-local-new");
    expect(runs[1]?.runId).toBe("run-future-old");
  });
});
