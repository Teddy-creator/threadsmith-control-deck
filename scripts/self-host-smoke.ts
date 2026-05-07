import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionPacket } from "@threadsmith/domain";
import {
  AGENT_RUN_FILES,
  createAgentRun,
  getRunDir,
  getRunFilePath
} from "@threadsmith/fs-bridge";
import { launchCodexCliExecutor } from "../packages/orchestrator/src/codexCliExecutor.ts";

const appDir = dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = resolve(appDir, "..");
const defaultSmokeWorkspaceRoot = resolve(
  defaultProjectRoot,
  ".threadsmith-runtime/self-host-smoke-workspace"
);
const targetPath = ".threadsmith-runtime/self-host-smoke.txt";
const marker = `THREADSMITH_SELF_HOST_SMOKE_OK ${new Date().toISOString()}`;
const defaultSmokeTimeoutMs = 10 * 60 * 1000;
const committedTruthPaths = [
  ".gitignore",
  ".threadsmith/acceptance-state.json",
  ".threadsmith/active-work.json",
  ".threadsmith/command-bridge.json",
  ".threadsmith/current-phase.json",
  ".threadsmith/preferences.json",
  ".threadsmith/project-brief.json",
  ".threadsmith/project-roadmap.json",
  ".threadsmith/project-status.json",
  ".threadsmith/project-supervision.json",
  ".threadsmith/provider-routing.json"
] as const;

function sleep(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function resolveSmokeTimeoutMs() {
  const raw = process.env.THREADSMITH_SMOKE_TIMEOUT_MS?.trim();
  if (!raw) {
    return defaultSmokeTimeoutMs;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultSmokeTimeoutMs;
}

function buildMarkerVerificationCommand(targetFilePath: string, markerValue: string) {
  return `grep -Fqx -- ${JSON.stringify(markerValue)} ${JSON.stringify(targetFilePath)}`;
}

async function waitForRunCompletion<T>(
  completion: Promise<T>,
  runId: string,
  timeoutMs: number
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`等待 run ${runId} 进入终态超时（>${timeoutMs}ms）`));
    }, timeoutMs);

    void completion.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function prepareSmokeWorkspace(sourceProjectRoot: string, workspaceRoot: string) {
  await rm(workspaceRoot, { recursive: true, force: true });
  await mkdir(workspaceRoot, { recursive: true });

  for (const relativePath of committedTruthPaths) {
    const sourcePath = resolve(sourceProjectRoot, relativePath);
    const destinationPath = resolve(workspaceRoot, relativePath);
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
  }

  return workspaceRoot;
}

async function main() {
  const explicitProjectRoot = process.argv[2] ? resolve(process.argv[2]) : null;
  const usingIsolatedWorkspace = explicitProjectRoot === null;
  const sourceProjectRoot = explicitProjectRoot ?? defaultProjectRoot;
  const projectRoot = usingIsolatedWorkspace
    ? await prepareSmokeWorkspace(defaultProjectRoot, defaultSmokeWorkspaceRoot)
    : sourceProjectRoot;
  const runId = crypto.randomUUID();
  const smokeTimeoutMs = resolveSmokeTimeoutMs();

  process.env.THREADSMITH_CODEX_REASONING_EFFORT ??= "low";

  await mkdir(resolve(projectRoot, ".threadsmith-runtime"), { recursive: true });

  const packet: ExecutionPacket = {
    runId,
    projectRoot,
    role: "executor",
    provider: "codex",
    workflowEffect: "artifact-only",
    objective:
      "完成一轮 Threadsmith self-host smoke，只验证真实 executor bridge 能安全运行并回流 truth。",
    scope: [
      `只修改 ${targetPath}`,
      `必须把这条精确 marker 写入文件：${marker}`,
      "不要修改任何已跟踪的产品代码或 .threadsmith committed truth",
      "这轮 run 只作为 smoke evidence，不推进当前 slice 到 review / verification / closeout",
      "保持最终结构化结果诚实，明确 changedFiles / verification / evidenceRefs"
    ],
    doneWhen: [
      `${targetPath} 被创建或覆盖，并包含精确 marker：${marker}`,
      "result.json 记录这次 smoke 的 changedFiles 与 verification",
      "run 状态进入 succeeded"
    ],
    verification: [
      buildMarkerVerificationCommand(targetPath, marker)
    ],
    contextRefs: [
      {
        kind: "state",
        path: ".threadsmith/project-brief.json",
        title: "项目简报"
      },
      {
        kind: "state",
        path: ".threadsmith/current-phase.json",
        title: "当前 committed phase"
      },
      {
        kind: "file",
        path: ".gitignore",
        title: "忽略路径约束"
      }
    ],
    output: {
      resultPath: `.threadsmith/runs/${runId}/result.json`,
      summaryPath: `.threadsmith/runs/${runId}/result.md`
    }
  };

  const created = await createAgentRun(projectRoot, packet);
  const launched = await launchCodexCliExecutor(created.packet);
  const finalRecord = await waitForRunCompletion(
    launched.completion,
    runId,
    smokeTimeoutMs
  );
  const resultPath = getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.result);
  const summaryPath = getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.summary);

  console.log(
    JSON.stringify(
      {
        sourceProjectRoot,
        projectRoot,
        truthBoundaryMode: usingIsolatedWorkspace
          ? "runtime-workspace"
          : "explicit-project-root",
        runId,
        status: finalRecord.status,
        outcome: finalRecord.outcome,
        taskOutcome: finalRecord.taskOutcome ?? null,
        failureStage: finalRecord.failureStage ?? null,
        failureKind: finalRecord.failureKind ?? null,
        resultPath,
        summaryPath,
        runDir: getRunDir(projectRoot, runId)
      },
      null,
      2
    )
  );

  const reportingFailureAfterSuccessfulTask =
    finalRecord.status === "failed" &&
    finalRecord.taskOutcome === "succeeded" &&
    finalRecord.failureStage === "result-reporting";

  if (finalRecord.status !== "succeeded" && !reportingFailureAfterSuccessfulTask) {
    throw new Error(`self-host smoke 失败：${finalRecord.statusDetail ?? finalRecord.status}`);
  }

  const targetContents = await readFile(resolve(projectRoot, targetPath), "utf8");
  if (targetContents.trim() !== marker) {
    throw new Error(`smoke target 未写入 marker：${targetPath}`);
  }

  if (reportingFailureAfterSuccessfulTask) {
    console.log(
      `classified partial success: ${finalRecord.statusDetail ?? "任务主体已完成，但结果上报失败。"}`
    );
  }

  if (usingIsolatedWorkspace) {
    console.log(`smoke workspace: ${projectRoot}`);
  }

  console.log(targetContents.trim());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
