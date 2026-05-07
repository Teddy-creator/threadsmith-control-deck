import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  connectAndInitializeCustomProject,
  readJsonFileWhenReady,
  seedBootstrappableProject
} from "./helpers";

const RUN_COMPLETION_TIMEOUT_MS = 15_000;

test("a custom project can execute the primary deck action and reflect fresh truth", async ({
  page
}) => {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-actions-"));
  const projectBriefPath = join(projectRoot, ".threadsmith", "project-brief.json");
  const activeWorkPath = join(projectRoot, ".threadsmith", "active-work.json");
  const actionHistoryPath = join(projectRoot, ".threadsmith", "action-queue.ndjson");
  const commandBridgePath = join(projectRoot, ".threadsmith", "command-bridge.json");
  const bridgesDir = join(projectRoot, ".threadsmith", "bridges");
  const eventsPath = join(projectRoot, ".threadsmith", "events.ndjson");

  try {
    await seedBootstrappableProject(projectRoot, {
      packageName: "threadsmith-workflow-actions",
      title: "Threadsmith Workflow Actions",
      summary: "Repository used to prove the primary deck action can reach the command bridge."
    });

    await page.goto("/");
    await connectAndInitializeCustomProject(page, projectRoot);

    await expect
      .poll(async () => {
        try {
          await access(projectBriefPath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    await page.getByRole("button", { name: "查看为什么" }).click();
    await expect(page.getByRole("heading", { name: "推进参考" })).toBeVisible();
    await page.getByRole("button", { name: "手动启动桥接" }).click();
    await expect(page.getByText("Command bridge 确认", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "按推荐路由签发" }).click();

    await expect
      .poll(async () => {
        const contents = await readFile(actionHistoryPath, "utf8");
        return contents
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean).length;
      })
      .toBe(1);

    await expect
      .poll(async () => {
        const contents = await readFile(eventsPath, "utf8");
        return contents.includes("\"title\":\"执行流程已启动\"");
      })
      .toBe(true);

    await expect
      .poll(async () => {
        try {
          return (await readdir(join(projectRoot, ".threadsmith", "runs"))).length;
        } catch {
          return 0;
        }
      })
      .toBeGreaterThan(0);

    await expect
      .poll(async () => {
        const contents = await readFile(eventsPath, "utf8");
        return contents.includes("\"kind\":\"agent-run\"");
      })
      .toBe(true);

    await expect
      .poll(async () => {
        const bridgeState = await readJsonFileWhenReady<{
          latestRoute: { status: string | null } | null;
          latestRun: { status: string | null } | null;
        }>(commandBridgePath);
        return {
          routeStatus: bridgeState?.latestRoute?.status ?? null,
          runStatus: bridgeState?.latestRun?.status ?? null
        };
      }, { timeout: RUN_COMPLETION_TIMEOUT_MS })
      .toEqual({
        routeStatus: "succeeded",
        runStatus: "succeeded"
      });

    await expect
      .poll(async () => {
        const contents = await readFile(eventsPath, "utf8");
        return contents.includes("\"title\":\"Codex 完成 executor 执行\"");
      })
      .toBe(true);

    await expect
      .poll(async () => {
        try {
          return (await readdir(bridgesDir)).length;
        } catch {
          return 0;
        }
      })
      .toBeGreaterThan(0);

    await expect(page.getByLabel("动作数 1")).toBeVisible();

    await page.getByRole("button", { name: "证据", exact: true }).click();
    await expect(
      page.locator(".inspector-panel").getByText("证据与事件", { exact: true })
    ).toBeVisible();
    await expect(
      page.locator(".inspector-panel").getByRole("heading", { name: "最新角色运行" })
    ).toBeVisible();
    await expect(page.locator(".inspector-panel")).toContainText(
      "执行结果已写回 truth"
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
