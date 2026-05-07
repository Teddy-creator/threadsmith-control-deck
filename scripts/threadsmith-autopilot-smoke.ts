import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionResult, PhaseOwner } from "@threadsmith/domain";
import {
  STATE_FILES,
  loadProjectState,
  readLatestPhaseRun,
  readPhasePause,
  readPhaseSlice,
  readRecentEvents,
  writeStateFragment
} from "@threadsmith/fs-bridge";
import {
  bootstrapProjectState,
  resumeAutopilotPhaseRun,
  startAutopilotPhaseRun
} from "@threadsmith/orchestrator";

type ScriptedResult = Partial<ExecutionResult> & {
  writeSmokeTarget?: boolean;
};

interface ScriptedStep {
  role: PhaseOwner;
  result: ScriptedResult;
}

interface ScenarioOutcome {
  name: string;
  status: "passed";
  phaseRunId: string;
  detail: string;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const fakeCodexPath = resolve(projectRoot, "tests/e2e/fixtures/fake-codex.js");
const smokeMarker = "THREADSMITH_SMOKE_OK";
const createdRoots: string[] = [];

process.env.THREADSMITH_CODEX_BIN ??= fakeCodexPath;
process.env.THREADSMITH_CODEX_REASONING_EFFORT ??= "low";

async function createProjectRoot(prefix: string) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  createdRoots.push(root);
  return root;
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
    deliverable: "一条可验证的 autopilot smoke phase run",
    inScope: [
      "只验证 autopilot 单 phase automatic chain",
      "只使用 fake Codex scripted scenario",
      "把结果落回 committed truth"
    ],
    outOfScope: [
      "多 provider 自动执行",
      "跨 phase 自动继续",
      "前端视觉改动"
    ],
    stopCondition: "phase run 要么 accepted，要么写出 honest pause truth 并可 continue。",
    verificationForThisPhase: [
      "读取 smoke-target.txt",
      "检查 .threadsmith/phase-runs/<id>/ 下的 truth 文件",
      "确认最新事件与 acceptance state 已更新"
    ],
    activeOwners: ["planner", "executor", "reviewer", "verifier", "closeout"],
    blockedBy: []
  });

  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim: `${phaseName} 可以把 autopilot automatic chain 跑成真实 committed truth。`,
    doneWhenChecklist: [
      {
        id: "phase-run-truth-written",
        label: "phase-run truth 已写入 .threadsmith/phase-runs",
        status: "unknown"
      },
      {
        id: "role-chain-completes-or-pauses-honestly",
        label: "角色链路要么 accepted，要么 honest pause",
        status: "unknown"
      },
      {
        id: "resume-path-proven",
        label: "需要时可以从 committed truth continue",
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

  await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
    items: [
      {
        role: "planner",
        status: "running",
        taskSummary: `${phaseName} 正在准备 scripted autopilot smoke。`,
        requiresUserDecision: false
      }
    ],
    blockerSummary: null
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
        summary: "Primary slice selected for the autopilot smoke."
      }
    },
    {
      role: "executor",
      result: {
        decision: "ready-for-review",
        summary: "Executor updated smoke-target.txt for the autopilot smoke."
      }
    },
    {
      role: "reviewer",
      result: {
        decision: "ready-for-verification",
        summary: "Review passed for the autopilot smoke."
      }
    },
    {
      role: "verifier",
      result: {
        decision: "accepted-with-closeout-pending",
        summary: "Verification passed for the autopilot smoke."
      }
    },
    {
      role: "closeout",
      result: {
        decision: "accepted",
        summary: "Closeout completed for the autopilot smoke."
      }
    }
  ];
}

function repairSteps(): ScriptedStep[] {
  return [
    {
      role: "planner",
      result: {
        decision: "slice-ready",
        summary: "Primary slice selected for the repair smoke."
      }
    },
    {
      role: "executor",
      result: {
        decision: "ready-for-review",
        summary: "Executor completed the first pass for the repair smoke."
      }
    },
    {
      role: "reviewer",
      result: {
        decision: "review-blocked",
        summary: "Review found a blocking issue in the first pass.",
        blocker: "A repair slice is required before verification."
      }
    },
    {
      role: "planner",
      result: {
        decision: "slice-ready",
        summary: "Repair slice selected after the blocked review."
      }
    },
    {
      role: "executor",
      result: {
        decision: "ready-for-review",
        summary: "Executor completed the repair slice."
      }
    },
    {
      role: "reviewer",
      result: {
        decision: "ready-for-verification",
        summary: "Review passed after the repair slice."
      }
    },
    {
      role: "verifier",
      result: {
        decision: "accepted-with-closeout-pending",
        summary: "Verification passed after the repair slice."
      }
    },
    {
      role: "closeout",
      result: {
        decision: "accepted",
        summary: "Closeout completed after the repair slice."
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
        summary: "Primary slice selected for the risk pause smoke."
      }
    },
    {
      role: "executor",
      result: {
        decision: "ready-for-review",
        summary: "Executor completed the first pass for the risk pause smoke."
      }
    },
    {
      role: "reviewer",
      result: {
        decision: "ready-for-verification",
        summary: "Review passed for the risk pause smoke."
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
        summary: "Closeout completed after resuming the paused run."
      }
    }
  ];
}

async function assertSmokeTarget(projectRoot: string) {
  const contents = await readFile(join(projectRoot, "smoke-target.txt"), "utf8");
  assert.equal(contents.trim(), smokeMarker);
}

async function assertEventIncludes(projectRoot: string, needle: string) {
  const events = await readRecentEvents(projectRoot, 30);
  assert.ok(
    events.some((event) => event.title.includes(needle) || event.detail.includes(needle)),
    `expected recent events to include ${needle}`
  );
}

async function runBootstrapAcceptedScenario(): Promise<ScenarioOutcome> {
  const projectRoot = await createProjectRoot("threadsmith-autopilot-success-");
  await seedRepository(projectRoot, {
    packageName: "threadsmith-autopilot-success",
    title: "Threadsmith Autopilot Success",
    summary: "Repository used to prove bootstrap plus accepted autopilot truth."
  });

  const bootstrap = await bootstrapProjectState(projectRoot);
  assert.equal(bootstrap.kind, "bootstrapped");

  await writeAutopilotPhase(
    projectRoot,
    "Autopilot smoke / bootstrap accepted",
    `把 smoke-target.txt 改成 ${smokeMarker}，并把 automatic chain 跑到 accepted。`
  );
  await writeScenario(projectRoot, successSteps());

  const phaseRun = await startAutopilotPhaseRun({ projectRoot });
  const latestPhaseRun = await readLatestPhaseRun(projectRoot);
  const state = await loadProjectState(projectRoot);

  assert.equal(phaseRun.status, "accepted");
  assert.equal(latestPhaseRun?.status, "accepted");
  assert.equal(latestPhaseRun?.latestSuccessfulRole, "closeout");
  assert.equal(latestPhaseRun?.currentSliceId, "primary-1");
  assert.equal(state.acceptanceState.finalState, "accepted");
  await assertSmokeTarget(projectRoot);
  await assertEventIncludes(projectRoot, "accepted");

  return {
    name: "bootstrap-accepted",
    status: "passed",
    phaseRunId: phaseRun.phaseRunId,
    detail: "bootstrap 成功后，一条完整 automatic chain 已 accepted。"
  };
}

async function runRepairScenario(): Promise<ScenarioOutcome> {
  const projectRoot = await createProjectRoot("threadsmith-autopilot-repair-");
  await seedRepository(projectRoot, {
    packageName: "threadsmith-autopilot-repair",
    title: "Threadsmith Autopilot Repair",
    summary: "Repository used to prove repair slices are committed to truth."
  });

  await bootstrapProjectState(projectRoot);
  await writeAutopilotPhase(
    projectRoot,
    "Autopilot smoke / repair",
    "先触发 review-blocked，再进入 repair-1 并 accepted。"
  );
  await writeScenario(projectRoot, repairSteps());

  const phaseRun = await startAutopilotPhaseRun({ projectRoot });
  const repairSlice = await readPhaseSlice(projectRoot, phaseRun.phaseRunId, "repair-1");

  assert.equal(phaseRun.status, "accepted");
  assert.equal(phaseRun.repairCount, 1);
  assert.equal(repairSlice.kind, "repair");
  await assertSmokeTarget(projectRoot);
  await assertEventIncludes(projectRoot, "entered repair #1");

  return {
    name: "repair-loop",
    status: "passed",
    phaseRunId: phaseRun.phaseRunId,
    detail: "review-blocked 已进入 repair-1，并在修复后 accepted。"
  };
}

async function runPauseResumeScenario(): Promise<ScenarioOutcome> {
  const projectRoot = await createProjectRoot("threadsmith-autopilot-resume-");
  await seedRepository(projectRoot, {
    packageName: "threadsmith-autopilot-resume",
    title: "Threadsmith Autopilot Resume",
    summary: "Repository used to prove risk pause plus explicit continue."
  });

  await bootstrapProjectState(projectRoot);
  await writeAutopilotPhase(
    projectRoot,
    "Autopilot smoke / risk pause and continue",
    "先命中 risk pause，再从 committed truth continue 到 accepted。"
  );
  await writeScenario(projectRoot, riskPauseSteps());

  const paused = await startAutopilotPhaseRun({ projectRoot });
  const pauseRecord = await readPhasePause(projectRoot, paused.phaseRunId);

  assert.equal(paused.status, "paused");
  assert.equal(paused.currentRole, "verifier");
  assert.equal(pauseRecord?.type, "risk");
  assert.ok(paused.resumeHint?.includes("threadsmith:autopilot -- continue"));
  await assertEventIncludes(projectRoot, "paused");

  await writeScenario(projectRoot, riskResumeSteps());
  const resumed = await resumeAutopilotPhaseRun({
    projectRoot,
    phaseRunId: paused.phaseRunId
  });
  const latest = await readLatestPhaseRun(projectRoot);

  assert.equal(resumed.phaseRunId, paused.phaseRunId);
  assert.equal(resumed.status, "accepted");
  assert.equal(latest?.status, "accepted");
  assert.equal(latest?.latestSuccessfulRole, "closeout");

  return {
    name: "risk-pause-resume",
    status: "passed",
    phaseRunId: resumed.phaseRunId,
    detail: "risk pause 已写入 committed truth，并且成功 continue 到 accepted。"
  };
}

async function main() {
  const outcomes = await Promise.all([
    runBootstrapAcceptedScenario(),
    runRepairScenario(),
    runPauseResumeScenario()
  ]);

  console.log(
    JSON.stringify(
      {
        status: "passed",
        fakeCodexPath,
        scenarios: outcomes
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.THREADSMITH_SMOKE_KEEP === "1") {
      return;
    }

    await Promise.all(
      createdRoots.splice(0).map((projectRoot) =>
        rm(projectRoot, { recursive: true, force: true })
      )
    );
  });
