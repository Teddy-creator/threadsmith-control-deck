import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { connectAndInitializeCustomProject } from "./helpers";

test("a custom project can inspect acceptance state from the deck", async ({
  page
}) => {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-acceptance-"));
  const acceptanceStatePath = join(
    projectRoot,
    ".threadsmith",
    "acceptance-state.json"
  );
  const initialClaim =
    "Bootstrap 已建立最小 Threadsmith truth，但当前仓库信号不足，必须先补充信息后再进入 automatic chain。";

  try {
    await page.goto("/");
    await connectAndInitializeCustomProject(page, projectRoot);

    await expect
      .poll(async () => {
        try {
          await access(acceptanceStatePath);
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    await page.getByRole("button", { name: "验收", exact: true }).click();
    const inspectorPanel = page.locator(".inspector-panel");
    await expect(inspectorPanel.getByText("验收工作台")).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "验收状态" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "当前判定" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "当前推进方式" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "缺什么才算过" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "四道门" })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "签字与记录" })).toBeVisible();
    await expect(inspectorPanel.getByText(initialClaim).first()).toBeVisible();
    await expect(inspectorPanel.getByText("规划 · Conductor")).toBeVisible();
    await expect(inspectorPanel.getByText("Codex Desktop", { exact: true })).toBeVisible();
    await expect(inspectorPanel.getByText("指挥官流程", { exact: true })).toBeVisible();
    await expect(
      inspectorPanel.getByText(
        "当前还在为进入评审收束边界，先回到 Codex Desktop 由 Conductor 组织下一步。"
      )
    ).toBeVisible();
    await expect(
      inspectorPanel.getByText("当前检查项都已经通过。").first()
    ).toBeVisible();
    await expect(
      inspectorPanel.getByText(
        "仓库里还没有可识别的 README 摘要或 manifest description。"
      ).first()
    ).toBeVisible();
    await expect(
      inspectorPanel.getByText("缺少 Critic / Reviewer 的放行结论。").first()
    ).toBeVisible();
    await expect(inspectorPanel.getByText("尚未记录评审放行")).toBeVisible();
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
