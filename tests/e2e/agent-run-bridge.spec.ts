import {
  access,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  initializeProjectState,
  writeStateFragment
} from "../../packages/fs-bridge/src/index.ts";
import { STATE_FILES } from "../../packages/fs-bridge/src/paths.ts";
import { readJsonFileWhenReady } from "./helpers";

const TEST_TIMEOUT_MS = 60_000;
const RUN_COMPLETION_TIMEOUT_MS = 15_000;
const SUCCESS_MARKER = "THREADSMITH_SMOKE_OK";

async function prepareExecutorBridgeProject(mode: "success" | "fail") {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-run-bridge-"));
  const smokeTargetPath = join(projectRoot, "smoke-target.txt");
  const fakeModePath = join(projectRoot, "threadsmith-fake-codex-mode.txt");
  const runsDir = join(projectRoot, ".threadsmith", "runs");
  const bridgesDir = join(projectRoot, ".threadsmith", "bridges");
  const commandBridgePath = join(projectRoot, ".threadsmith", "command-bridge.json");
  const eventsPath = join(projectRoot, ".threadsmith", "events.ndjson");

  await writeFile(smokeTargetPath, "pending\n", "utf8");
  await writeFile(fakeModePath, `${mode}\n`, "utf8");
  await initializeProjectState(projectRoot);
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Codex bridge smoke",
    phaseGoal: `将项目根目录 smoke-target.txt 的内容改成 ${SUCCESS_MARKER}`,
    deliverable:
      mode === "fail"
        ? "故意触发一轮 executor 失败，并确认失败会回流到首页状态"
        : "smoke-target.txt 被更新为精确标记",
    inScope: [
      "只修改项目根目录的 smoke-target.txt",
      "只验证 executor bridge 是否会回写真实结果"
    ],
    outOfScope: [
      "不要修改 .threadsmith 状态文件",
      "不要引入无关功能或界面改动"
    ],
    stopCondition:
      mode === "fail"
        ? "自动执行失败已经回流为 blocker，并驱动首页切到修复态。"
        : `smoke-target.txt 的最终内容是 ${SUCCESS_MARKER}。`,
    verificationForThisPhase: [
      "读取 smoke-target.txt，确认内容与预期一致"
    ],
    activeOwners: ["executor"],
    blockedBy: []
  });
  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim:
      mode === "fail"
        ? "Threadsmith 可以把 executor 失败回流为可见 blocker。"
        : "Threadsmith 可以驱动一条真实 executor run 并接住回流结果。",
    doneWhenChecklist: [
      {
        id: "executor-run-started",
        label: "executor run 已启动",
        status: "unknown"
      },
      {
        id: "smoke-target-updated",
        label:
          mode === "fail"
            ? "失败结果没有误改目标文件"
            : "smoke-target.txt 已被更新",
        status: "unknown"
      },
      {
        id: "result-ingested",
        label:
          mode === "fail"
            ? "失败结果已写回 Threadsmith truth"
            : "结果已写回 Threadsmith truth",
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

  return {
    projectRoot,
    smokeTargetPath,
    runsDir,
    bridgesDir,
    commandBridgePath,
    eventsPath
  };
}

async function launchBridgeFromDeck(page: import("@playwright/test").Page, projectRoot: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "来源：自定义项目" }).click();
  await page.getByRole("textbox", { name: "项目根目录" }).fill(projectRoot);
  await page.getByRole("button", { name: "连接项目" }).click();

  await expect(page.getByText(`项目根目录：${projectRoot}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "当前总命令" })).toBeVisible();
  await page.getByRole("button", { name: "查看为什么" }).click();
  await expect(page.getByRole("heading", { name: "推进参考" })).toBeVisible();
  await page.getByRole("button", { name: "手动启动桥接" }).click();
  await expect(page.getByText("Command bridge 确认", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "按推荐路由签发" }).click();
}

async function waitForSingleRun(runsDir: string) {
  await expect
    .poll(async () => {
      try {
        await access(runsDir);
        const dirents = await readdir(runsDir);
        return dirents.length;
      } catch {
        return 0;
      }
    })
    .toBeGreaterThan(0);

  const [runId] = await readdir(runsDir);
  return {
    runId,
    statusPath: join(runsDir, runId, "status.json"),
    resultPath: join(runsDir, runId, "result.json"),
    promptPath: join(runsDir, runId, "prompt.md")
  };
}

test("the deck can launch an executor run and ingest the result back into Threadsmith truth", async ({
  page
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  const { projectRoot, smokeTargetPath, runsDir, bridgesDir, commandBridgePath, eventsPath } =
    await prepareExecutorBridgeProject("success");

  try {
    await launchBridgeFromDeck(page, projectRoot);
    await expect
      .poll(async () => {
        try {
          const contents = await readFile(smokeTargetPath, "utf8");
          return contents.trim();
        } catch {
          return null;
        }
      })
      .toBe(SUCCESS_MARKER);

    const { statusPath, resultPath, promptPath } = await waitForSingleRun(runsDir);
    await expect
      .poll(async () => {
        const status = await readJsonFileWhenReady<{ status: string }>(statusPath);
        return status?.status ?? null;
      }, { timeout: RUN_COMPLETION_TIMEOUT_MS })
      .toBe("succeeded");

    const result = JSON.parse(await readFile(resultPath, "utf8")) as {
      outcome: string;
      changedFiles: string[];
    };

    expect(result.outcome).toBe("succeeded");
    expect(result.changedFiles).toContain("smoke-target.txt");

    await expect
      .poll(async () => {
        const contents = await readFile(eventsPath, "utf8");
        return contents.includes("\"title\":\"Codex 完成 executor 执行\"");
      })
      .toBe(true);

    await expect
      .poll(async () => {
        const bridgeState = await readJsonFileWhenReady<{
          latestRoute: { status: string; artifactPath: string | null } | null;
          latestRun: { status: string } | null;
        }>(commandBridgePath);
        return {
          routeStatus: bridgeState?.latestRoute?.status ?? null,
          runStatus: bridgeState?.latestRun?.status ?? null
        };
      })
      .toEqual({
        routeStatus: "succeeded",
        runStatus: "succeeded"
      });

    await expect
      .poll(async () => {
        try {
          return (await readdir(bridgesDir)).length;
        } catch {
          return 0;
        }
      })
      .toBeGreaterThan(0);

    await expect(page.getByText("回流：执行结果已写回 truth")).toBeVisible();
    await expect(page.getByRole("heading", { name: "评审进行中" })).toBeVisible();
    await expect(page.getByRole("button", { name: "证据", exact: true })).toBeVisible();

    const promptContents = await readFile(promptPath, "utf8");
    expect(promptContents).toContain(SUCCESS_MARKER);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("the deck can ingest a failed executor run back into repair guidance", async ({
  page
}) => {
  test.setTimeout(TEST_TIMEOUT_MS);
  const { projectRoot, smokeTargetPath, runsDir, bridgesDir, commandBridgePath, eventsPath } =
    await prepareExecutorBridgeProject("fail");

  try {
    await launchBridgeFromDeck(page, projectRoot);
    const { statusPath, resultPath, promptPath } = await waitForSingleRun(runsDir);

    await expect
      .poll(async () => {
        const status = await readJsonFileWhenReady<{ status: string }>(statusPath);
        return status?.status ?? null;
      }, { timeout: RUN_COMPLETION_TIMEOUT_MS })
      .toBe("failed");

    const result = JSON.parse(await readFile(resultPath, "utf8")) as {
      outcome: string;
      changedFiles: string[];
      summary: string;
    };

    expect(result.outcome).toBe("failed");
    expect(result.changedFiles).toEqual([]);
    expect(result.summary).toContain("executor failure");
    expect((await readFile(smokeTargetPath, "utf8")).trim()).toBe("pending");

    await expect
      .poll(async () => {
        const bridgeState = await readJsonFileWhenReady<{
          latestRoute: { status: string; artifactPath: string | null } | null;
          latestRun: { status: string } | null;
        }>(commandBridgePath);
        return {
          routeStatus: bridgeState?.latestRoute?.status ?? null,
          runStatus: bridgeState?.latestRun?.status ?? null
        };
      })
      .toEqual({
        routeStatus: "failed",
        runStatus: "failed"
      });

    await expect
      .poll(async () => {
        try {
          return (await readdir(bridgesDir)).length;
        } catch {
          return 0;
        }
      })
      .toBeGreaterThan(0);

    await expect
      .poll(async () => {
        const contents = await readFile(eventsPath, "utf8");
        return contents.includes("\"title\":\"Codex 的 executor 执行失败\"");
      })
      .toBe(true);

    await expect(page.getByRole("heading", { name: "修复自动执行失败" })).toBeVisible();
    await expect(page.getByText("回流：失败原因已回流为 blocker")).toBeVisible();

    const promptContents = await readFile(promptPath, "utf8");
    expect(promptContents).toContain(SUCCESS_MARKER);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
