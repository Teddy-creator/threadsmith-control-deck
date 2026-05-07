import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { ExecutionResult, PhaseOwner } from "@threadsmith/domain";
import {
  STATE_FILES,
  readPhasePause,
  writeStateFragment
} from "../../packages/fs-bridge/src/index.ts";
import {
  resumeAutopilotPhaseRun,
  startAutopilotPhaseRun
} from "../../packages/orchestrator/src/index.ts";
import { connectAndInitializeCustomProject } from "./helpers";

type ScriptedResult = Partial<ExecutionResult> & {
  writeSmokeTarget?: boolean;
};

interface ScriptedStep {
  role: PhaseOwner;
  result: ScriptedResult;
}

const smokeMarker = "THREADSMITH_SMOKE_OK";

async function removeTemporaryProject(projectRoot: string) {
  await rm(projectRoot, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100
  });
}

async function seedRepository(projectRoot: string, args: {
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

async function writeAutopilotPhase(projectRoot: string, phaseName: string, phaseGoal: string) {
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName,
    phaseGoal,
    deliverable: "一条可视化的 autopilot e2e phase run",
    inScope: [
      "只验证 phase-run truth 是否会映射到 deck",
      "使用 fake Codex scripted scenario",
      "不修改前端视觉骨架"
    ],
    outOfScope: ["多 provider 自动执行", "跨 phase 自动继续"],
    stopCondition: "首页与阶段工作台都能显示真实的 autopilot truth。",
    verificationForThisPhase: [
      "页面显示最新 automatic chain 状态",
      "页面显示 paused 时的显式 continue"
    ],
    activeOwners: ["planner", "executor", "reviewer", "verifier", "closeout"],
    blockedBy: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim: `${phaseName} 可以把 autopilot truth 显示到 deck。`,
    doneWhenChecklist: [
      {
        id: "homepage-visible",
        label: "首页能看到最新 automatic chain 状态",
        status: "unknown"
      },
      {
        id: "phase-inspector-visible",
        label: "阶段工作台能看到 phase run 详情",
        status: "unknown"
      }
    ],
    implementationStatus: "implementing",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: [],
    finalState: "not-ready"
  });
}

async function writeScenario(projectRoot: string, steps: ScriptedStep[]) {
  await writeFile(
    join(projectRoot, "threadsmith-fake-codex-scenario.json"),
    `${JSON.stringify({ cursor: 0, steps }, null, 2)}\n`,
    "utf8"
  );
}

function successSteps(): ScriptedStep[] {
  return [
    {
      role: "planner",
      result: {
        decision: "slice-ready",
        summary: "Primary slice selected for the autopilot deck e2e."
      }
    },
    {
      role: "executor",
      result: {
        decision: "ready-for-review",
        summary: "Executor updated smoke-target.txt for the autopilot deck e2e."
      }
    },
    {
      role: "reviewer",
      result: {
        decision: "ready-for-verification",
        summary: "Review passed for the autopilot deck e2e."
      }
    },
    {
      role: "verifier",
      result: {
        decision: "accepted-with-closeout-pending",
        summary: "Verification passed for the autopilot deck e2e."
      }
    },
    {
      role: "closeout",
      result: {
        decision: "accepted",
        summary: "Closeout completed for the autopilot deck e2e."
      }
    }
  ];
}

function riskPauseSteps(): ScriptedStep[] {
  return [
    {
      role: "planner",
      result: {
        decision: "slice-ready",
        summary: "Primary slice selected for the paused autopilot deck e2e."
      }
    },
    {
      role: "executor",
      result: {
        decision: "ready-for-review",
        summary: "Executor completed the first pass for the paused autopilot deck e2e."
      }
    },
    {
      role: "reviewer",
      result: {
        decision: "ready-for-verification",
        summary: "Review passed for the paused autopilot deck e2e."
      }
    },
    {
      role: "verifier",
      result: {
        outcome: "failed",
        summary: "Verification hit a release-blocking risk.",
        riskHits: ["release-risk: missing verification confidence"]
      }
    }
  ];
}

function riskResumeSteps(): ScriptedStep[] {
  return [
    {
      role: "verifier",
      result: {
        decision: "accepted-with-closeout-pending",
        summary: "Verification passed after the risk was cleared."
      }
    },
    {
      role: "closeout",
      result: {
        decision: "accepted",
        summary: "Closeout completed after resuming the paused phase run."
      }
    }
  ];
}

async function expectAcceptedContinuationGuidance(page: Page) {
  const commandCard = page
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: "当前总命令", exact: true })
    })
    .first();

  await expect(page.getByText("已接受", { exact: true })).toBeVisible();
  await expect(commandCard).toContainText(
    /刷新 continuation packet|起草下一刀并准备 phase reset|打包已接受状态/
  );
  await expect(commandCard).toContainText(/已被接受|上一刀已经 accepted|workflow truth|phase reset/);
}

test("the deck reflects an accepted autopilot chain for a bootstrapped custom project", async ({
  page
}) => {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-autopilot-e2e-"));

  try {
    await seedRepository(projectRoot, {
      packageName: "threadsmith-autopilot-e2e",
      title: "Threadsmith Autopilot E2E",
      summary: "Repository used to show accepted autopilot truth inside the deck."
    });

    await page.goto("/");
    await connectAndInitializeCustomProject(page, projectRoot);
    await writeAutopilotPhase(
      projectRoot,
      "Autopilot e2e / accepted",
      `把 smoke-target.txt 改成 ${smokeMarker}，并让 automatic chain accepted。`
    );
    await writeScenario(projectRoot, successSteps());

    const phaseRun = await startAutopilotPhaseRun({ projectRoot });
    expect(phaseRun.status).toBe("accepted");

    await page.goto(`/?projectRoot=${encodeURIComponent(projectRoot)}`);
    await expectAcceptedContinuationGuidance(page);
    await expect(page.getByText("主 slice 1", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "阶段", exact: true }).click();
    const inspectorPanel = page.locator(".inspector-panel");
    await expect(
      inspectorPanel.getByText("阶段工作台", { exact: true })
    ).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "当前阶段" })).toBeVisible();
    await expect(inspectorPanel.getByText("Locked phase 快照", { exact: true })).toBeVisible();
  } finally {
    await removeTemporaryProject(projectRoot);
  }
});

test("the deck reflects paused autopilot truth and explicit continue guidance", async ({
  page
}) => {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-autopilot-pause-"));

  try {
    await seedRepository(projectRoot, {
      packageName: "threadsmith-autopilot-pause",
      title: "Threadsmith Autopilot Pause",
      summary: "Repository used to show paused autopilot truth and continue guidance."
    });

    await page.goto("/");
    await connectAndInitializeCustomProject(page, projectRoot);
    await writeAutopilotPhase(
      projectRoot,
      "Autopilot e2e / risk pause",
      "先进入 risk pause，再从 committed truth continue。"
    );
    await writeScenario(projectRoot, riskPauseSteps());

    const paused = await startAutopilotPhaseRun({ projectRoot });
    const pauseRecord = await readPhasePause(projectRoot, paused.phaseRunId);

    expect(paused.status).toBe("paused");
    expect(pauseRecord?.type).toBe("risk");

    await page.goto(`/?projectRoot=${encodeURIComponent(projectRoot)}`);
    await expect(
      page.getByRole("heading", { name: "先处理恢复条件", exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("自动链路当前需要你介入：本轮命中了固定风险规则，自动链路已暂停。")
    ).toBeVisible();
    await expect(
      page.getByText("Verification hit a release-blocking risk.", { exact: true }).first()
    ).toBeVisible();

    await page.getByRole("button", { name: "阶段", exact: true }).click();
    const inspectorPanel = page.locator(".inspector-panel");
    await expect(inspectorPanel.getByText("阶段工作台", { exact: true })).toBeVisible();
    await expect(inspectorPanel.getByRole("heading", { name: "当前阶段" })).toBeVisible();
    await expect(inspectorPanel.getByText("Locked phase 快照", { exact: true })).toBeVisible();
    await expect(inspectorPanel.getByText("显式 continue", { exact: true })).toBeVisible();
    await expect(
      inspectorPanel.getByText(`npm run threadsmith:autopilot -- continue ${JSON.stringify(projectRoot)}`)
    ).toBeVisible();

    await writeScenario(projectRoot, riskResumeSteps());
    const resumed = await resumeAutopilotPhaseRun({
      projectRoot,
      phaseRunId: paused.phaseRunId
    });
    expect(resumed.status).toBe("accepted");

    await page.goto(`/?projectRoot=${encodeURIComponent(projectRoot)}`);
    await expectAcceptedContinuationGuidance(page);
  } finally {
    await removeTemporaryProject(projectRoot);
  }
});
