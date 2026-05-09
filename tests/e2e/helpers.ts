import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";

const CUSTOM_PROJECT_ONBOARDING_TITLE = "这个目录已经找到，只差初始化 Threadsmith";

export async function readJsonFileWhenReady<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      ((error as NodeJS.ErrnoException).code ?? null) === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

export async function openSourceWorkbench(page: Page) {
  await page.getByRole("button", { name: /来源：/ }).click();
  const inspectorPanel = page.locator(".inspector-panel");
  await expect(
    inspectorPanel.getByRole("heading", { name: "项目与来源" })
  ).toBeVisible();
  return inspectorPanel;
}

export async function connectCustomProject(page: Page, projectRoot: string) {
  const inspectorPanel = await openSourceWorkbench(page);
  await inspectorPanel
    .locator("button")
    .filter({ hasText: "自定义项目" })
    .first()
    .click();
  await page.getByRole("textbox", { name: "项目根目录" }).fill(projectRoot);
  await page.getByRole("button", { name: "连接项目" }).click();
}

export async function connectAndInitializeCustomProject(
  page: Page,
  projectRoot: string
) {
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
        await access(join(projectRoot, ".threadsmith", "current-phase.json"));
        await access(join(projectRoot, ".threadsmith", "acceptance-state.json"));
        return true;
      } catch {
        return false;
      }
    })
    .toBe(true);
}

export async function seedBootstrappableProject(projectRoot: string, args: {
  packageName: string;
  title: string;
  summary: string;
}) {
  await mkdir(join(projectRoot, "src"), { recursive: true });
  await mkdir(join(projectRoot, "tests"), { recursive: true });
  await writeFile(join(projectRoot, "smoke-target.txt"), "pending\n", "utf8");
  await writeFile(
    join(projectRoot, "package.json"),
    `${JSON.stringify(
      {
        name: args.packageName,
        version: "0.0.1",
        description: args.summary,
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
    [`# ${args.title}`, "", args.summary].join("\n"),
    "utf8"
  );
}
