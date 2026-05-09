import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile
} from "node:fs/promises";
import { join, relative } from "node:path";
import {
  agentRunRecordSchema,
  agentRunStatusSchema,
  executionPacketSchema,
  executionFailureKindSchema,
  executionFailureStageSchema,
  executionResultOutcomeSchema,
  executionResultSchema,
  executionTaskOutcomeSchema,
  type AgentRunRecord,
  type AgentRunStatus,
  type ExecutionFailureKind,
  type ExecutionFailureStage,
  type ExecutionPacket,
  type ExecutionResult,
  type ExecutionResultOutcome,
  type ExecutionTaskOutcome
} from "@threadsmith/domain";
import {
  AGENT_RUN_FILES,
  getRunDir,
  getRunFilePath
} from "./paths.ts";

function formatJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function runRelativePath(runId: string, fileName: string) {
  return `.threadsmith/runs/${runId}/${fileName}`;
}

function inferStatusFromOutcome(outcome: ExecutionResultOutcome): AgentRunStatus {
  switch (outcome) {
    case "succeeded":
      return "succeeded";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
  }
}

function formatResultSummary(result: ExecutionResult) {
  const changedFiles =
    result.changedFiles.length > 0
      ? result.changedFiles.map((filePath) => `- ${filePath}`).join("\n")
      : "- 无代码改动";
  const verification =
    result.verification.length > 0
      ? result.verification
          .map(
            (item) =>
              `- [${item.status}] ${item.command}${item.summary ? `: ${item.summary}` : ""}`
          )
          .join("\n")
      : "- 无验证记录";
  const evidence =
    result.evidenceRefs.length > 0
      ? result.evidenceRefs.map((ref) => `- ${ref}`).join("\n")
      : "- 无证据引用";

  return [
    "# Threadsmith Run Result",
    "",
    `- Run ID: ${result.runId}`,
    `- Role: ${result.role}`,
    `- Provider: ${result.provider}`,
    `- Outcome: ${result.outcome}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Changed Files",
    "",
    changedFiles,
    "",
    "## Verification",
    "",
    verification,
    "",
    "## Evidence",
    "",
    evidence
  ].join("\n");
}

async function writeRunRecord(projectRoot: string, record: AgentRunRecord) {
  const parsed = agentRunRecordSchema.parse(record);
  const statusPath = getRunFilePath(
    projectRoot,
    parsed.runId,
    AGENT_RUN_FILES.status
  );
  const temporaryStatusPath = `${statusPath}.${process.pid}.${Date.now()}.tmp`;

  await mkdir(getRunDir(projectRoot, parsed.runId), { recursive: true });
  await writeFile(temporaryStatusPath, formatJson(parsed), "utf8");
  await rename(temporaryStatusPath, statusPath);

  return parsed;
}

export interface AgentRunRecordUpdate {
  status?: AgentRunStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  promptPath?: string | null;
  resultPath?: string | null;
  summaryPath?: string | null;
  stdoutPath?: string | null;
  stderrPath?: string | null;
  outcome?: ExecutionResultOutcome | null;
  taskOutcome?: ExecutionTaskOutcome;
  failureStage?: ExecutionFailureStage | null;
  failureKind?: ExecutionFailureKind | null;
  statusDetail?: string | null;
}

export async function createAgentRun(
  projectRoot: string,
  packet: ExecutionPacket,
  createdAt = new Date().toISOString()
) {
  const parsedPacket = executionPacketSchema.parse(packet);
  await mkdir(getRunDir(projectRoot, parsedPacket.runId), { recursive: true });

  await writeFile(
    getRunFilePath(projectRoot, parsedPacket.runId, AGENT_RUN_FILES.packet),
    formatJson(parsedPacket),
    "utf8"
  );

  const record = await writeRunRecord(projectRoot, {
    runId: parsedPacket.runId,
    projectRoot,
    role: parsedPacket.role,
    provider: parsedPacket.provider,
    status: "queued",
    createdAt,
    startedAt: null,
    finishedAt: null,
    packetPath: runRelativePath(parsedPacket.runId, AGENT_RUN_FILES.packet),
    promptPath: null,
    resultPath: null,
    summaryPath: null,
    stdoutPath: null,
    stderrPath: null,
    outcome: null,
    statusDetail: null
  });

  return { packet: parsedPacket, record };
}

export async function readAgentRunRecord(projectRoot: string, runId: string) {
  const raw = await readFile(
    getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.status),
    "utf8"
  );
  return agentRunRecordSchema.parse(JSON.parse(raw));
}

export async function readAgentRunPacket(projectRoot: string, runId: string) {
  const raw = await readFile(
    getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.packet),
    "utf8"
  );
  return executionPacketSchema.parse(JSON.parse(raw));
}

export async function readAgentRunResult(projectRoot: string, runId: string) {
  const raw = await readFile(
    getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.result),
    "utf8"
  );
  return executionResultSchema.parse(JSON.parse(raw));
}

export async function updateAgentRunStatus(
  projectRoot: string,
  runId: string,
  update: AgentRunRecordUpdate
) {
  const current = await readAgentRunRecord(projectRoot, runId);
  const next = agentRunRecordSchema.parse({
    ...current,
    ...update,
    status:
      update.status === undefined
        ? current.status
        : agentRunStatusSchema.parse(update.status),
    outcome:
      update.outcome === undefined
        ? current.outcome
        : update.outcome === null
          ? null
          : executionResultOutcomeSchema.parse(update.outcome),
    taskOutcome:
      update.taskOutcome === undefined
        ? current.taskOutcome
        : executionTaskOutcomeSchema.parse(update.taskOutcome),
    failureStage:
      update.failureStage === undefined
        ? current.failureStage
        : update.failureStage === null
          ? null
          : executionFailureStageSchema.parse(update.failureStage),
    failureKind:
      update.failureKind === undefined
        ? current.failureKind
        : update.failureKind === null
          ? null
          : executionFailureKindSchema.parse(update.failureKind)
  });

  return writeRunRecord(projectRoot, next);
}

export async function writeAgentRunResult(
  projectRoot: string,
  runId: string,
  result: ExecutionResult,
  finishedAt = new Date().toISOString()
) {
  const parsedResult = executionResultSchema.parse(result);
  const runDir = getRunDir(projectRoot, runId);
  await mkdir(runDir, { recursive: true });

  const resultPath = getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.result);
  const summaryPath = getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.summary);

  await writeFile(resultPath, formatJson(parsedResult), "utf8");
  await writeFile(summaryPath, `${formatResultSummary(parsedResult)}\n`, "utf8");

  const record = await updateAgentRunStatus(projectRoot, runId, {
    status: inferStatusFromOutcome(parsedResult.outcome),
    finishedAt,
    resultPath: runRelativePath(runId, AGENT_RUN_FILES.result),
    summaryPath: runRelativePath(runId, AGENT_RUN_FILES.summary),
    outcome: parsedResult.outcome,
    taskOutcome: parsedResult.taskOutcome,
    failureStage: parsedResult.failureStage ?? null,
    failureKind: parsedResult.failureKind ?? null,
    statusDetail: parsedResult.summary
  });

  return {
    result: parsedResult,
    record
  };
}

export async function readLatestAgentRuns(projectRoot: string, limit = 10) {
  try {
    const runDirNames = await readdir(join(projectRoot, ".threadsmith", "runs"));
    const records = await Promise.all(
      runDirNames.map(async (runId) => {
        try {
          const record = await readAgentRunRecord(projectRoot, runId);
          const statusStat = await stat(
            getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.status)
          );

          return {
            record,
            sortTime: statusStat.mtimeMs
          };
        } catch {
          return null;
        }
      })
    );

    return records
      .filter(
        (entry): entry is { record: AgentRunRecord; sortTime: number } => entry !== null
      )
      .sort(
        (left, right) =>
          right.sortTime - left.sortTime
          || Date.parse(right.record.finishedAt ?? right.record.startedAt ?? right.record.createdAt)
            - Date.parse(left.record.finishedAt ?? left.record.startedAt ?? left.record.createdAt)
      )
      .map((entry) => entry.record)
      .slice(0, limit);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function writeAgentRunPrompt(
  projectRoot: string,
  runId: string,
  contents: string
) {
  const filePath = getRunFilePath(projectRoot, runId, AGENT_RUN_FILES.prompt);
  await mkdir(getRunDir(projectRoot, runId), { recursive: true });
  await writeFile(filePath, contents, "utf8");

  const relativePath = relative(projectRoot, filePath).replace(/\\/g, "/");
  return updateAgentRunStatus(projectRoot, runId, {
    promptPath: relativePath
  });
}
