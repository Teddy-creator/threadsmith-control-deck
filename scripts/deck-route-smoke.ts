import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  readAgentRunResult,
  readCommandBridgeState
} from "@threadsmith/fs-bridge";
import { advancePhaseFromDeck } from "../packages/orchestrator/src/deckActionBridge.ts";

const defaultSmokeTimeoutMs = 10 * 60 * 1000;

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
  const projectRootArg = process.argv[2];
  if (!projectRootArg) {
    throw new Error("用法：npm run smoke:deck-route -- <project-root>");
  }

  const projectRoot = resolve(projectRootArg);
  const smokeTimeoutMs = resolveSmokeTimeoutMs();

  process.env.THREADSMITH_CODEX_REASONING_EFFORT ??= "low";
  await ensureNoNestedDeckRouteRun(projectRoot);

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

  const runResult = await readAgentRunResult(projectRoot, finalRecord.runId);

  console.log(
    JSON.stringify(
      {
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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
