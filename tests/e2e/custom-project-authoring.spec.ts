import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { expect, test } from "@playwright/test";
import { connectAndInitializeCustomProject } from "./helpers";

test("a custom project can inspect project and phase workbenches from the deck", async ({
  page
}) => {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-authoring-"));
  const projectName = basename(projectRoot);
  const projectBriefPath = join(projectRoot, ".threadsmith", "project-brief.json");
  const currentPhasePath = join(projectRoot, ".threadsmith", "current-phase.json");
  const initialProjectGoal = `为 ${projectName} 补齐足够的仓库信息，再进入第一条 autopilot slice。`;
  const initialPhaseName = "补齐 bootstrap 缺口";
  const initialPhaseGoal = `为 ${projectName} 补齐足够的仓库信号，再定义第一条 autopilot slice。`;

  try {
    await page.goto("/");
    await connectAndInitializeCustomProject(page, projectRoot);

    await expect
      .poll(async () => {
        try {
          await access(projectBriefPath);
          await access(currentPhasePath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    await page.getByRole("button", { name: "项目", exact: true }).click();
    const inspectorPanel = page.locator(".inspector-panel");
    await expect(inspectorPanel.getByText("项目工作台")).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "项目总况" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "项目定义" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "项目路线" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "指挥与路由" })).toBeVisible();
    await expect(inspectorPanel.getByText(initialProjectGoal).first()).toBeVisible();
    await expect(
      inspectorPanel.getByText("当前先停在 bootstrap 澄清阶段。当前还没有识别到主要源码目录。").first()
    ).toBeVisible();
    await expect(
      inspectorPanel.getByText(
        "这个项目当前最重要的目标是什么，是否有 README 或任务说明可以作为 bootstrap 输入"
      ).first()
    ).toBeVisible();
    await expect(
      inspectorPanel.getByRole("combobox", { name: "指挥入口" })
    ).toHaveValue("codex-desktop");

    await page.getByRole("button", { name: "阶段", exact: true }).click();
    await expect(inspectorPanel.getByText("阶段工作台")).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "当前阶段" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "阶段合同" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "当前推进方式" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "当前 slice" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "阶段出口" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "角色归属" })).toBeVisible();
    await expect(inspectorPanel.getByText(initialPhaseName).first()).toBeVisible();
    await expect(inspectorPanel.getByText(initialPhaseGoal).first()).toBeVisible();
    await expect(
      inspectorPanel.getByText(
        "仓库里还没有可识别的 README 摘要或 manifest description。"
      ).first()
    ).toBeVisible();
    await expect(inspectorPanel.getByText("指挥官流程", { exact: true })).toBeVisible();
    await expect(
      inspectorPanel.getByText(
        "当前 phase 暂时不依赖 executor 自动执行，默认继续在 Codex Desktop 收束判断与下一步。"
      )
    ).toBeVisible();
    await expect(
      inspectorPanel.getByText(
        "项目目标、主要目录和至少一条验证路径足够清晰，可以安全起草第一条 slice。"
      )
    ).toBeVisible();
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
