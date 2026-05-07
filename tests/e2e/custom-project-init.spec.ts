import { access, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { connectCustomProject } from "./helpers";

const CUSTOM_PROJECT_ONBOARDING_TITLE = "这个目录已经找到，只差初始化 Threadsmith";

test("a custom project without .threadsmith can be initialized from the deck", async ({
  page
}) => {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-e2e-"));

  try {
    await mkdir(join(projectRoot, "src"), { recursive: true });
    await mkdir(join(projectRoot, "tests"), { recursive: true });
    await writeFile(
      join(projectRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "promptpet-ar",
          version: "0.0.1",
          description: "Interactive AR pet prototype for prompt-driven reactions.",
          scripts: {
            test: "vitest run",
            build: "vite build"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );
    await writeFile(
      join(projectRoot, "README.md"),
      [
        "# PromptPet AR",
        "",
        "PromptPet AR is an interactive AR pet prototype with prompt-driven reactions."
      ].join("\n"),
      "utf8"
    );

    await page.goto("/");
    await connectCustomProject(page, projectRoot);

    const onboardingCard = page
      .locator(".rounded-xl")
      .filter({ has: page.getByText(CUSTOM_PROJECT_ONBOARDING_TITLE, { exact: true }) })
      .first();
    await expect(onboardingCard).toBeVisible();
    await expect(
      onboardingCard.getByRole("button", { name: "初始化 Threadsmith" })
    ).toBeVisible();

    await onboardingCard.getByRole("button", { name: "初始化 Threadsmith" }).click();

    await expect
      .poll(async () => {
        try {
          await access(join(projectRoot, ".threadsmith", "project-brief.json"));
          return true;
        } catch {
          return false;
        }
      })
      .toBe(true);

    await expect(page.getByText("来源：自定义项目")).toBeVisible();
    await expect(page.getByText(`项目根目录：${projectRoot}`)).toBeVisible();
    await expect(page.getByText("当前项目状态")).toBeVisible();
    await expect(
      page
        .locator(".scenario-live-status")
        .getByText("PromptPet AR 已根据仓库信号写入最小 Threadsmith truth")
    ).toBeVisible();
    await expect(
      page
        .locator(".scenario-live-status")
        .getByText("为 PromptPet AR 收紧第一条 autopilot slice")
    ).toBeVisible();
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
