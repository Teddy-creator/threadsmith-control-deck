import { spawn } from "node:child_process";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type {
  AgentRunRecord,
  ExecutionFailureKind,
  ExecutionFailureStage,
  ExecutionPacket,
  ExecutionResult,
  ExecutionTaskOutcome,
  VerificationCommandResult
} from "@threadsmith/domain";
import {
  AGENT_RUN_FILES,
  appendEvent,
  applyAgentRunResult,
  getRunDir,
  getRunFilePath,
  readAgentRunRecord,
  updateAgentRunStatus,
  writeAgentRunPrompt,
  writeAgentRunResult
} from "@threadsmith/fs-bridge";
import type { SpawnProcess } from "./providerTypes.ts";
import { renderRolePrompt } from "./packetBuilder.ts";

const OUTPUT_SCHEMA_FILE_NAME = "output-schema.json";
const DEFAULT_CODEX_COMMAND = "codex";

export interface CodexCliLaunch {
  run: AgentRunRecord;
  completion: Promise<AgentRunRecord>;
  resultAppliedByLauncher?: boolean;
}

function readOptionalConfigOverrideArgs() {
  const reasoningEffort = process.env.THREADSMITH_CODEX_REASONING_EFFORT?.trim();

  if (!reasoningEffort) {
    return [];
  }

  return ["-c", `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`];
}

function toProjectRelativePath(projectRoot: string, absolutePath: string) {
  return relative(projectRoot, absolutePath).replace(/\\/g, "/");
}

function buildExecutionResultSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "runId",
      "role",
      "provider",
      "outcome",
      "decision",
      "sliceRef",
      "pauseRecommendation",
      "riskHits",
      "summary",
      "changedFiles",
      "verification",
      "evidenceRefs",
      "blocker"
    ],
    properties: {
      runId: { type: "string" },
      role: {
        type: "string",
        enum: ["planner", "executor", "reviewer", "verifier", "closeout", "hygiene"]
      },
      provider: {
        type: "string",
        enum: ["codex", "claude"]
      },
      outcome: {
        type: "string",
        enum: ["succeeded", "failed", "cancelled"]
      },
      decision: {
        anyOf: [
          {
            type: "string",
            enum: [
              "slice-ready",
              "pause-recommended",
              "ready-for-review",
              "review-blocked",
              "ready-for-verification",
              "verification-failed",
              "accepted-with-closeout-pending",
              "accepted"
            ]
          },
          { type: "null" }
        ]
      },
      sliceRef: {
        anyOf: [
          { type: "string" },
          { type: "null" }
        ]
      },
      pauseRecommendation: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "summary", "detail", "resumeRequirements"],
            properties: {
              type: {
                type: "string",
                enum: [
                  "risk",
                  "blocked",
                  "missing-info",
                  "loop-limit",
                  "infra-failure"
                ]
              },
              summary: { type: "string" },
              detail: { type: "string" },
              resumeRequirements: {
                type: "array",
                items: { type: "string" }
              }
            }
          },
          {
            type: "null"
          }
        ]
      },
      riskHits: {
        anyOf: [
          {
            type: "array",
            items: { type: "string" }
          },
          {
            type: "null"
          }
        ]
      },
      summary: { type: "string" },
      changedFiles: {
        type: "array",
        items: { type: "string" }
      },
      verification: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["command", "status"],
          properties: {
            command: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "passed", "failed", "skipped"]
            }
          }
        }
      },
      evidenceRefs: {
        type: "array",
        items: { type: "string" }
      },
      blocker: {
        anyOf: [
          { type: "string" },
          { type: "null" }
        ]
      }
    }
  };
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function readOptionalText(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function compactCommandOutput(text: string | null | undefined, maxLength = 120) {
  const normalized = text?.replace(/\s+/g, " ").trim() ?? "";

  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
}

async function runVerificationCommand(
  projectRoot: string,
  command: string
): Promise<VerificationCommandResult> {
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  const shellArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-lc", command];

  return new Promise((resolve) => {
    const child = spawn(shell, shellArgs, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({
        command,
        status: "failed",
        summary: `verification 启动失败：${error.message}`
      });
    });

    child.on("close", (code, signal) => {
      const outputSummary =
        compactCommandOutput(stdout) ?? compactCommandOutput(stderr) ?? null;

      if (code === 0) {
        resolve({
          command,
          status: "passed",
          summary: outputSummary ?? "fallback verification 通过"
        });
        return;
      }

      resolve({
        command,
        status: "failed",
        summary:
          outputSummary ??
          `退出码 ${code ?? "null"}${signal ? `，signal=${signal}` : ""}`
      });
    });
  });
}

async function runFallbackVerification(packet: ExecutionPacket) {
  return Promise.all(
    packet.verification.map((command) =>
      runVerificationCommand(packet.projectRoot, command)
    )
  );
}

function inferTaskOutcome(
  verification: VerificationCommandResult[]
): ExecutionTaskOutcome {
  if (verification.some((item) => item.status === "failed")) {
    return "failed";
  }

  const usableEvidence = verification.filter((item) => item.status === "passed");

  if (
    usableEvidence.length > 0 &&
    verification.every((item) => item.status === "passed" || item.status === "skipped")
  ) {
    return "succeeded";
  }

  return "unknown";
}

function inferFailureKind(
  stderrText: string | null,
  code: number | null
): ExecutionFailureKind {
  if (stderrText && /(429\b|too many requests)/i.test(stderrText)) {
    return "rate-limit";
  }

  if (code === 0) {
    return "missing-structured-result";
  }

  return "cli-exit";
}

function fallbackSummary(
  taskOutcome: ExecutionTaskOutcome,
  failureStage: ExecutionFailureStage,
  failureKind: ExecutionFailureKind
) {
  if (failureStage === "cli-startup") {
    return "Codex CLI 启动失败，任务主体还没有得到可验证执行。";
  }

  if (taskOutcome === "succeeded") {
    return failureKind === "rate-limit"
      ? "任务主体已完成，但 Codex CLI 在结果上报阶段触发 rate limit，结构化结果未成功回传。"
      : "任务主体已完成，但 Codex CLI 在结果上报阶段失败，结构化结果未成功回传。";
  }

  if (taskOutcome === "failed") {
    return "Codex CLI 没有产出结构化结果，且 fallback verification 显示任务主体尚未完成。";
  }

  return "Codex CLI 没有产出结构化结果，当前还无法确认任务主体是否真正完成。";
}

function fallbackBlocker(
  taskOutcome: ExecutionTaskOutcome,
  failureStage: ExecutionFailureStage,
  failureKind: ExecutionFailureKind,
  message: string
) {
  if (failureStage === "cli-startup") {
    return message;
  }

  if (taskOutcome === "succeeded") {
    return failureKind === "rate-limit"
      ? "任务主体已完成，但结果上报阶段触发 rate limit；请先处理 CLI / bridge 上报问题。"
      : "任务主体已完成，但结果上报阶段失败；请先处理 CLI / bridge 上报问题。";
  }

  return message;
}

async function fallbackEvidenceRefs(
  packet: ExecutionPacket,
  paths: string[]
) {
  const existing = await Promise.all(
    paths.map(async (absolutePath) =>
      (await fileExists(absolutePath))
        ? toProjectRelativePath(packet.projectRoot, absolutePath)
        : null
    )
  );

  return existing.filter((value): value is string => Boolean(value));
}

async function finishWriteStream(stream: ReturnType<typeof createWriteStream>) {
  if (!stream.writableEnded) {
    stream.end();
  }

  if (stream.writableFinished || stream.destroyed) {
    return;
  }

  await once(stream, "finish");
}

async function writeFallbackFailureResult(
  packet: ExecutionPacket,
  resultPath: string,
  message: string,
  options: {
    verification?: VerificationCommandResult[];
    taskOutcome?: ExecutionTaskOutcome;
    failureStage?: ExecutionFailureStage;
    failureKind?: ExecutionFailureKind;
    blocker?: string;
    evidenceRefs?: string[];
  } = {}
) {
  await writeAgentRunResult(packet.projectRoot, packet.runId, {
    runId: packet.runId,
    role: packet.role,
    provider: packet.provider,
    outcome: "failed",
    taskOutcome: options.taskOutcome,
    failureStage: options.failureStage,
    failureKind: options.failureKind,
    summary: message,
    changedFiles: [],
    verification: options.verification ?? [],
    evidenceRefs:
      options.evidenceRefs ??
      [toProjectRelativePath(packet.projectRoot, resultPath)],
    blocker: options.blocker ?? message
  });
}

async function finalizeRunFromResult(
  packet: ExecutionPacket,
  resultPath: string,
  stdoutPath: string,
  stderrPath: string,
  fallbackMessage: string,
  code: number | null
) {
  if (!(await fileExists(resultPath))) {
    const verification = await runFallbackVerification(packet);
    const taskOutcome = inferTaskOutcome(verification);
    const stderrText = await readOptionalText(stderrPath);
    const failureStage: ExecutionFailureStage = "result-reporting";
    const failureKind = inferFailureKind(stderrText, code);
    const evidenceRefs = await fallbackEvidenceRefs(packet, [stderrPath, stdoutPath]);
    const summary = fallbackSummary(taskOutcome, failureStage, failureKind);

    await writeFallbackFailureResult(packet, resultPath, summary, {
      verification,
      taskOutcome,
      failureStage,
      failureKind,
      blocker: fallbackBlocker(taskOutcome, failureStage, failureKind, fallbackMessage),
      evidenceRefs
    });
    return;
  }

  const raw = await readFile(resultPath, "utf8");
  const parsed = JSON.parse(raw) as ExecutionResult;

  await writeAgentRunResult(packet.projectRoot, packet.runId, {
    ...parsed,
    runId: packet.runId,
    role: packet.role,
    provider: packet.provider
  });
}

export async function launchCodexCliExecutor(
  packet: ExecutionPacket,
  options: {
    spawnProcess?: SpawnProcess;
    startedAt?: string;
  } = {}
): Promise<CodexCliLaunch> {
  const spawnProcess = options.spawnProcess ?? spawn;
  const startedAt = options.startedAt ?? new Date().toISOString();
  const runDir = getRunDir(packet.projectRoot, packet.runId);
  const prompt = renderRolePrompt(packet);
  const codexCommand =
    process.env.THREADSMITH_CODEX_BIN?.trim() || DEFAULT_CODEX_COMMAND;
  const configOverrideArgs = readOptionalConfigOverrideArgs();
  const schemaPath = join(runDir, OUTPUT_SCHEMA_FILE_NAME);
  const resultPath = getRunFilePath(packet.projectRoot, packet.runId, AGENT_RUN_FILES.result);
  const stdoutPath = getRunFilePath(packet.projectRoot, packet.runId, AGENT_RUN_FILES.stdout);
  const stderrPath = getRunFilePath(packet.projectRoot, packet.runId, AGENT_RUN_FILES.stderr);

  await mkdir(runDir, { recursive: true });
  await writeAgentRunPrompt(packet.projectRoot, packet.runId, `${prompt}\n`);
  await writeFile(
    schemaPath,
    `${JSON.stringify(buildExecutionResultSchema(), null, 2)}\n`,
    "utf8"
  );

  const stdoutStream = createWriteStream(stdoutPath, { flags: "a" });
  const stderrStream = createWriteStream(stderrPath, { flags: "a" });
  let finalized = false;
  let settleCompletion: ((record: AgentRunRecord) => void) | null = null;
  let rejectCompletion: ((error: unknown) => void) | null = null;
  const completion = new Promise<AgentRunRecord>((resolve, reject) => {
    settleCompletion = resolve;
    rejectCompletion = reject;
  });

  const child = spawnProcess(
    codexCommand,
    [
      "exec",
      ...configOverrideArgs,
      "--cd",
      packet.projectRoot,
      // Threadsmith can launch executor runs against connected project roots
      // that are outside Codex's trusted repo list, including disposable smoke
      // projects, so the bridge must opt into this explicitly.
      "--skip-git-repo-check",
      "--full-auto",
      "--output-schema",
      schemaPath,
      "--output-last-message",
      resultPath,
      "-"
    ],
    {
      cwd: packet.projectRoot,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
    }
  );

  child.stdout?.pipe(stdoutStream);
  child.stderr?.pipe(stderrStream);
  child.stdin?.end(`${prompt}\n`);

  const runningRecord = await updateAgentRunStatus(packet.projectRoot, packet.runId, {
    status: "running",
    startedAt,
    stdoutPath: toProjectRelativePath(packet.projectRoot, stdoutPath),
    stderrPath: toProjectRelativePath(packet.projectRoot, stderrPath)
  });
  await appendEvent(packet.projectRoot, {
    id: crypto.randomUUID(),
    createdAt: startedAt,
    kind: "agent-run",
    title: `${packet.provider === "codex" ? "Codex" : packet.provider} 已启动 ${packet.role} 执行`,
    detail: `当前自动执行已开始，结果会回写到 ${packet.output.resultPath}。`,
    role: packet.role,
    runId: packet.runId,
    provider: packet.provider
  });

  async function finalizeRun(work: () => Promise<void>) {
    if (finalized) {
      return;
    }

    finalized = true;
    await Promise.all([
      finishWriteStream(stdoutStream),
      finishWriteStream(stderrStream)
    ]);
    await work();
  }

  async function resolveCompletion() {
    const record = await readAgentRunRecord(packet.projectRoot, packet.runId);
    settleCompletion?.(record);
  }

  child.on("error", (error) => {
    void (async () => {
      await finalizeRun(async () => {
        await writeFallbackFailureResult(
          packet,
          resultPath,
          `Codex CLI 启动失败：${error.message}`,
          {
            taskOutcome: "unknown",
            failureStage: "cli-startup",
            failureKind: "cli-startup",
            blocker: `Codex CLI 启动失败：${error.message}`,
            evidenceRefs: []
          }
        );
        await applyAgentRunResult(packet.projectRoot, packet.runId);
        await resolveCompletion();
      });
    })().catch((completionError) => {
      rejectCompletion?.(completionError);
    });
  });

  child.on("close", (code, signal) => {
    void (async () => {
      await finalizeRun(async () => {
        await finalizeRunFromResult(
          packet,
          resultPath,
          stdoutPath,
          stderrPath,
          code === 0
            ? "Codex CLI 已退出，但没有生成结构化结果。"
            : `Codex CLI 退出失败（code=${code ?? "null"}, signal=${signal ?? "none"}）。`,
          code
        );
        await applyAgentRunResult(packet.projectRoot, packet.runId);
        await resolveCompletion();
      });
    })().catch((completionError) => {
      rejectCompletion?.(completionError);
    });
  });

  return {
    run: runningRecord,
    completion,
    resultAppliedByLauncher: true
  };
}
