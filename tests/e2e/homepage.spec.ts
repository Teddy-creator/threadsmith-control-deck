import { basename, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openSourceWorkbench } from "./helpers";

test("default deck homepage loads the core control-deck regions", async ({
  page
}) => {
  const projectName = basename(resolve(process.cwd()));

  await page.goto("/");

  await expect(page.getByText("工作区来源")).toHaveCount(0);
  await expect(page.getByText("来源：自定义项目")).toBeVisible();
  await expect(
    page.getByText(new RegExp(`^项目根目录：.*${projectName}$`))
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "项目", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "阶段", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "证据", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "验收", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "当前总命令" })).toBeVisible();
  await expect(page.getByRole("button", { name: "复制建议指令" })).toBeVisible();
  await expect(page.getByRole("button", { name: "查看为什么" })).toBeVisible();
  const projectMapCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "项目地图" }).first() })
    .first();
  await expect(projectMapCard.getByRole("heading", { name: "项目地图" })).toBeVisible();
  await expect(projectMapCard.getByText("版本路线", { exact: true })).toBeVisible();
  await expect(projectMapCard.getByText(/里程碑 \d+ \/ \d+/, { exact: true })).toBeVisible();
  await expect(projectMapCard.getByText("里程碑地图", { exact: true })).toBeVisible();
  await expect(projectMapCard.getByText("最终目标", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "推进判断" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "协作现场" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "验收雷达" })).toBeVisible();
});

test("app-home route opens the Threadsmith front door", async ({ page }) => {
  await page.goto("/?appHome=1");

  await expect(page.getByRole("button", { name: "来源：前门入口" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "当前总命令" })).toBeVisible();
  await expect(page.getByText("确认今天要进入的真实项目")).toBeVisible();
  await expect(page.getByRole("button", { name: "连接新项目" })).toBeVisible();
  await expect(page.getByRole("button", { name: "复制建议指令" })).toHaveCount(0);

  await page.getByRole("button", { name: "来源：前门入口" }).click();
  await expect(page.getByText("先把第一个真实项目接进 Threadsmith")).toBeVisible();
  await expect(page.getByRole("button", { name: "填写项目根目录" })).toBeVisible();
});

test("root route can prefer app-home when the saved entry mode requests it", async ({
  page
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("threadsmith.entryModePreference", "app-home");
  });

  await page.goto("/");

  await expect(page.getByRole("button", { name: "来源：前门入口" })).toBeVisible();
  await expect(page.getByText("确认今天要进入的真实项目")).toBeVisible();
  await expect(page.getByRole("button", { name: "连接新项目" })).toBeVisible();
});

test("current Threadsmith repo can be read as a real project from the source and workbenches", async ({
  page
}) => {
  const projectRoot = resolve(process.cwd());
  const projectName = basename(projectRoot);

  await page.goto("/?appHome=1");
  await expect(page.getByRole("button", { name: "来源：前门入口" })).toBeVisible();

  const sourceWorkbench = await openSourceWorkbench(page);
  await sourceWorkbench
    .locator("button")
    .filter({ hasText: "自定义项目" })
    .first()
    .click();
  await page.getByRole("textbox", { name: "项目根目录" }).fill(projectRoot);
  await page.getByRole("button", { name: "连接项目" }).click();

  await expect(page.getByRole("button", { name: "来源：自定义项目" })).toBeVisible();
  await expect(
    page.getByText(new RegExp(`^项目根目录：.*${projectName}$`))
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Threadsmith", exact: true })).toBeVisible();
  await expect(
    page.getByText("v0.3.0 post-merge polish", { exact: true }).first()
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "当前总命令" })).toBeVisible();

  await page.getByRole("button", { name: "项目", exact: true }).click();
  const inspectorPanel = page.locator(".inspector-panel");
  await expect(inspectorPanel.getByText("项目工作台")).toBeVisible();
  await expect(
    inspectorPanel.getByText(
      /Threadsmith v0\.3\.0 Skill Orchestrator 线已经通过 PR #21 合并到 main/
    )
  ).toBeVisible();
  await expect(
    inspectorPanel.getByRole("combobox", { name: "指挥入口" })
  ).toHaveValue("codex-desktop");

  await page.getByRole("button", { name: "阶段", exact: true }).click();
  await expect(inspectorPanel.getByText("阶段工作台", { exact: true })).toBeVisible();
  await expect(inspectorPanel.getByRole("heading", { name: "Context 状态" })).toBeVisible();
  await expect(
    inspectorPanel.getByText("v0.3.0 post-merge user-flow polish").first()
  ).toBeVisible();

  await page.getByRole("button", { name: "验收", exact: true }).click();
  await expect(inspectorPanel.getByText("验收工作台")).toBeVisible();
  await expect(
    inspectorPanel.getByText(
      "PR #21 合并后的 post-merge 用户路径 polish 已完成并通过本地验证；Threadsmith 现在会把 v0.2.1 稳定线、v0.3.0 已合并但未发布候选线、App Home 前门边界和 $threadsmith skill 安装/连续推进路径讲清楚。"
    ).first()
  ).toBeVisible();
});
