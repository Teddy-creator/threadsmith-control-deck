import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  initializeProjectState,
  readAgentRunResult,
  readCommandBridgeState,
  STATE_FILES,
  writeStateFragment
} from "@threadsmith/fs-bridge";
import { advancePhaseFromDeck } from "../packages/orchestrator/src/deckActionBridge.ts";

const defaultSmokeTimeoutMs = 10 * 60 * 1000;
const smokeMarker = "THREADSMITH_SMOKE_OK";

function resolveSmokeTimeoutMs() {
  const raw = process.env.THREADSMITH_SMOKE_TIMEOUT_MS?.trim();
  if (!raw) {
    return defaultSmokeTimeoutMs;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultSmokeTimeoutMs;
}

async function waitForRunCompletion<T>(
  completion: Promise<T>,
  routeId: string | null,
  timeoutMs: number
) {
  return new Promise<T>((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `等待 deck route ${routeId ?? "unknown"} 完成超时（>${timeoutMs}ms）`
        )
      );
    }, timeoutMs);

    void completion.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function assertArtifactExists(projectRoot: string, relativePath: string | null) {
  if (!relativePath) {
    throw new Error("缺少 artifact 路径。");
  }

  await access(resolve(projectRoot, relativePath));
}

async function seedRepository(projectRoot: string) {
  await mkdir(join(projectRoot, "src"), { recursive: true });
  await writeFile(join(projectRoot, "smoke-target.txt"), "pending\n", "utf8");
  await writeFile(
    join(projectRoot, "package.json"),
    `${JSON.stringify(
      {
        name: "threadsmith-deck-route-smoke",
        version: "0.0.1",
        private: true,
        scripts: {
          test: "node -e \"process.exit(0)\""
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
      "# Threadsmith deck route smoke",
      "",
      "Disposable project used to verify deck-action bridge routing."
    ].join("\n"),
    "utf8"
  );
}

async function seedThreadsmithTruth(projectRoot: string) {
  await initializeProjectState(projectRoot, { overwriteCoreState: true });
  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
    phaseName: "Deck route deterministic smoke",
    phaseGoal: `Use the deck-action bridge to update smoke-target.txt to ${smokeMarker}.`,
    deliverable: "A single executor run result written back through command-bridge truth.",
    inScope: [
      "Launch one executor run through advance-phase",
      "Use the fake Codex CLI fixture",
      "Write command-bridge route and latest run truth"
    ],
    outOfScope: [
      "Real Codex CLI execution",
      "Mutating the Threadsmith repository",
      "Release publishing"
    ],
    stopCondition:
      "The isolated smoke project has a succeeded latestRoute/latestRun and smoke-target.txt contains the expected marker.",
    verificationForThisPhase: [
      "sed -n '1,40p' smoke-target.txt"
    ],
    activeOwners: ["executor"],
    blockedBy: []
  });
  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, {
    currentClaim:
      "Threadsmith can launch an executor run from the deck route and ingest the result into committed truth.",
    doneWhenChecklist: [
      {
        id: "deck-route-launched",
        label: "deck route launched an executor run",
        status: "unknown"
      },
      {
        id: "smoke-target-updated",
        label: "smoke-target.txt contains the smoke marker",
        status: "unknown"
      },
      {
        id: "bridge-truth-written",
        label: "latestRoute and latestRun are written back as succeeded",
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
        role: "executor",
        status: "running",
        taskSummary: "Run the deterministic deck-action bridge smoke.",
        requiresUserDecision: false
      }
    ],
    blockerSummary: null
  });
}

function parseArguments() {
  const [first, second] = process.argv.slice(2);

  if (first === "--real") {
    if (!second) {
      throw new Error("用法：npm run smoke:deck-route -- --real <project-root>");
    }

    return {
      mode: "real" as const,
      projectRoot: resolve(second)
    };
  }

  if (first) {
    throw new Error(
      "默认 smoke 会创建隔离临时项目。若要运行真实 Codex CLI，请使用：npm run smoke:deck-route -- --real <project-root>"
    );
  }

  return {
    mode: "isolated" as const,
    projectRoot: null
  };
}

async function createIsolatedSmokeProject() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-deck-route-smoke-"));
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, "..");
  const fakeCodexPath = resolve(repoRoot, "tests/e2e/fixtures/fake-codex.js");

  await seedRepository(projectRoot);
  await seedThreadsmithTruth(projectRoot);
  process.env.THREADSMITH_CODEX_BIN = fakeCodexPath;

  return projectRoot;
}

async function ensureNoNestedDeckRouteRun(projectRoot: string) {
  const bridgeState = await readCommandBridgeState(projectRoot);
  const latestRoute = bridgeState.latestRoute;
  const latestRun = bridgeState.latestRun;

  if (
    latestRoute?.surface === "deck-action-bridge" &&
    latestRun?.status === "running"
  ) {
    throw new Error(
      "检测到已有 deck-action-bridge run 正在运行。不要把 `npm run smoke:deck-route -- .` 作为当前 phase 的内部 verification 命令递归调用。"
    );
  }
}

function isReportingFailureAfterSuccessfulTask(
  status: string | null | undefined,
  taskOutcome: string | null | undefined,
  failureStage: string | null | undefined
) {
  return (
    status === "failed"
    && taskOutcome === "succeeded"
    && failureStage === "result-reporting"
  );
}

async function main() {
  const args = parseArguments();
  const projectRoot =
    args.mode === "isolated"
      ? await createIsolatedSmokeProject()
      : args.projectRoot;
  const smokeTimeoutMs = resolveSmokeTimeoutMs();

  process.env.THREADSMITH_CODEX_REASONING_EFFORT ??= "low";
  await ensureNoNestedDeckRouteRun(projectRoot);

  try {
    const result = await advancePhaseFromDeck({
      projectRoot
    });

    if (result.kind !== "launched") {
      throw new Error(result.detail);
    }

    const finalRecord = await waitForRunCompletion(
      result.launch.completion,
      result.routeId,
      smokeTimeoutMs
    );
    const bridgeState = await readCommandBridgeState(projectRoot);
    const persistedRun = bridgeState.latestRun;
    const persistedRoute = bridgeState.latestRoute;
    const reportingFailureAfterSuccessfulTask = isReportingFailureAfterSuccessfulTask(
      persistedRun?.status ?? finalRecord.status,
      persistedRun?.taskOutcome ?? finalRecord.taskOutcome ?? null,
      persistedRun?.failureStage ?? finalRecord.failureStage ?? null
    );

    if (!persistedRoute) {
      throw new Error("deck route 已执行，但 committed truth 里仍然缺少 latestRoute。");
    }

    if (persistedRoute.surface !== "deck-action-bridge") {
      throw new Error(`latestRoute surface 不正确：${persistedRoute.surface}`);
    }

    if (persistedRoute.status !== "succeeded" && !reportingFailureAfterSuccessfulTask) {
      throw new Error(`latestRoute 未成功写回：${persistedRoute.status}`);
    }

    if (!persistedRun) {
      throw new Error("deck route 已执行，但 committed truth 里仍然缺少 latestRun。");
    }

    if (persistedRun.status !== "succeeded" && !reportingFailureAfterSuccessfulTask) {
      throw new Error(`latestRun 未成功写回：${persistedRun.status}`);
    }

    if (persistedRun.runId !== finalRecord.runId) {
      throw new Error("latestRun.runId 与真实完成的 run 不一致。");
    }

    if (persistedRoute.runId !== finalRecord.runId) {
      throw new Error("latestRoute.runId 没有指向这次真实完成的 run。");
    }

    if (persistedRun.routeId !== persistedRoute.routeId) {
      throw new Error("latestRun.routeId 与 latestRoute.routeId 没有对齐。");
    }

    await assertArtifactExists(projectRoot, persistedRoute.artifactPath);
    await assertArtifactExists(projectRoot, persistedRun.artifactPath);

    if (args.mode === "isolated") {
      const marker = (await readFile(join(projectRoot, "smoke-target.txt"), "utf8")).trim();

      if (marker !== smokeMarker) {
        throw new Error(`smoke-target.txt 未被 fake Codex 更新：${marker}`);
      }
    }

    const runResult = await readAgentRunResult(projectRoot, finalRecord.runId);

    console.log(
      JSON.stringify(
        {
          mode: args.mode,
          projectRoot,
          routeId: persistedRoute.routeId,
          runId: finalRecord.runId,
          routeStatus: persistedRoute.status,
          runStatus: persistedRun.status,
          taskOutcome: persistedRun.taskOutcome ?? finalRecord.taskOutcome ?? null,
          failureStage: persistedRun.failureStage ?? finalRecord.failureStage ?? null,
          failureKind: persistedRun.failureKind ?? finalRecord.failureKind ?? null,
          truthWritebackStatus: persistedRun.truthWritebackStatus ?? null,
          routeArtifactPath: persistedRoute.artifactPath,
          runArtifactPath: persistedRun.artifactPath,
          resultSummary: runResult.summary,
          changedFiles: runResult.changedFiles,
          verification: runResult.verification
        },
        null,
        2
      )
    );

    if (reportingFailureAfterSuccessfulTask) {
      console.log(
        `classified partial success: ${persistedRun.summary ?? finalRecord.statusDetail ?? "任务主体已完成，但结果上报失败。"}`
      );
    }
  } finally {
    if (args.mode === "isolated") {
      await rm(projectRoot, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
