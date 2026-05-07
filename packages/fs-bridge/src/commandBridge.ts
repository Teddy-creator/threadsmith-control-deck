import { basename, join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type {
  AgentRunRecord,
  CommandBridgeLatestRoute,
  CommandBridgeLatestRun,
  CommandBridgeRouteStatus,
  CommandBridgeState,
  CommandBridgeSurface,
  CommandBridgeTruthWriteback
} from "@threadsmith/domain";
import {
  commandBridgeStateSchema,
  providerIdSchema
} from "@threadsmith/domain";
import { readAgentRunRecord, readAgentRunResult } from "./agentRuns.ts";
import {
  STATE_FILES,
  THREADSMITH_DIR,
  getCommandBridgeArtifactsDir,
  getStatePath,
  getThreadsmithDir
} from "./paths.ts";

function formatJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function slugTimestamp(createdAt: string) {
  return createdAt.replaceAll(":", "-").replaceAll(".", "-");
}

function deriveProjectLabel(projectRoot: string) {
  const trimmedRoot = projectRoot.replace(/[\\/]+$/, "");
  return basename(trimmedRoot) || "当前项目";
}

export function createEmptyCommandBridgeState(): CommandBridgeState {
  return {
    latestRoute: null,
    latestRun: null,
    updatedAt: null
  };
}

function routeSurfaceLabel(surface: CommandBridgeSurface) {
  return surface === "direct-run" ? "Direct run -> Codex CLI" : "Deck 推荐动作 -> Codex CLI";
}

function providerRouteSurfaceLabel(
  surface: CommandBridgeSurface,
  provider: AgentRunRecord["provider"]
) {
  if (provider === "claude") {
    return surface === "direct-run"
      ? "Direct run -> Claude（暂不支持自动执行）"
      : "Deck 推荐动作 -> Claude（暂不支持自动执行）";
  }

  return routeSurfaceLabel(surface);
}

function routeSummary(
  surface: CommandBridgeSurface,
  sourceActionId: string | null,
  provider: AgentRunRecord["provider"]
) {
  if (provider === "claude") {
    return "该角色当前默认路由到 Claude；Threadsmith 的 auto-execution v1 暂不支持自动执行，请回到外部指挥入口继续。";
  }

  if (surface === "direct-run") {
    return "这次桥接跳过 workflow 推荐动作，直接启动 executor run。";
  }

  if (sourceActionId === "advance-phase") {
    return "这次桥接来自 workflow 推荐动作，会先推进当前 slice，再启动 executor run。";
  }

  return "这次桥接来自 deck 推荐动作，并会把结果回流到当前项目 truth。";
}

function routeStatusLabel(status: CommandBridgeRouteStatus) {
  switch (status) {
    case "running":
      return "运行中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return "已签发";
  }
}

function truthWritebackStatus(status: AgentRunRecord["status"]): CommandBridgeTruthWriteback {
  switch (status) {
    case "succeeded":
      return "written";
    case "failed":
      return "failed-written";
    case "cancelled":
      return "cancelled-written";
    default:
      return "pending";
  }
}

function runSummary(record: AgentRunRecord, summaryOverride?: string | null) {
  if (summaryOverride?.trim()) {
    return summaryOverride.trim();
  }

  if (record.statusDetail?.trim()) {
    return record.statusDetail.trim();
  }

  switch (record.status) {
    case "queued":
      return "命令已排队，等待启动。";
    case "running":
      return "命令已发给 Codex CLI，等待结果回流。";
    case "succeeded":
      return "自动执行已完成，结果已经写回。";
    case "failed":
      return "自动执行失败，等待处理失败原因。";
    case "cancelled":
      return "自动执行已取消。";
    default:
      return "当前还没有 bridge run 记录。";
  }
}

function pickRunArtifactPath(record: AgentRunRecord) {
  return (
    record.summaryPath ??
    record.resultPath ??
    record.stderrPath ??
    record.stdoutPath ??
    record.promptPath ??
    record.packetPath
  );
}

async function writeCommandBridgeState(
  projectRoot: string,
  value: CommandBridgeState
) {
  const parsed = commandBridgeStateSchema.parse(value);
  await mkdir(getThreadsmithDir(projectRoot), { recursive: true });
  await writeFile(
    getStatePath(projectRoot, STATE_FILES.commandBridge),
    formatJson(parsed),
    "utf8"
  );
  return parsed;
}

export async function readCommandBridgeState(projectRoot: string) {
  try {
    const raw = await readFile(
      getStatePath(projectRoot, STATE_FILES.commandBridge),
      "utf8"
    );
    return commandBridgeStateSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyCommandBridgeState();
    }
    throw error;
  }
}

async function writeRouteArtifact(route: CommandBridgeLatestRoute) {
  const fileName = `${slugTimestamp(route.createdAt)}-${route.surface}.md`;
  const relativePath = `${THREADSMITH_DIR}/bridges/${fileName}`;
  const contents = [
    "# Threadsmith Command Bridge Route",
    "",
    `- 类型：command-bridge-route`,
    `- Route ID：${route.routeId}`,
    `- 创建时间：${route.createdAt}`,
    `- 项目：${route.projectLabel}`,
    `- 提供方：${providerIdSchema.parse(route.provider)}`,
    `- 目标角色：${route.targetRole}`,
    `- 桥接面：${providerRouteSurfaceLabel(route.surface, route.provider)}`,
    `- 来源动作：${route.sourceActionId ?? "direct-run"}`,
    `- 当前状态：${routeStatusLabel(route.status)}`,
    "",
    "## 摘要",
    "",
    routeSummary(route.surface, route.sourceActionId, route.provider),
    "",
    "## 说明",
    "",
    route.statusDetail ?? "等待 run 启动或结果回流后继续更新 pointer truth。",
    "",
    "## 项目根目录",
    "",
    route.projectRoot
  ].join("\n");

  await mkdir(getCommandBridgeArtifactsDir(route.projectRoot), { recursive: true });
  await writeFile(
    join(getCommandBridgeArtifactsDir(route.projectRoot), fileName),
    `${contents.trim()}\n`,
    "utf8"
  );

  return relativePath;
}

export async function recordCommandBridgeDispatch(
  projectRoot: string,
  input: {
    surface: CommandBridgeSurface;
    sourceActionId: string | null;
    provider?: AgentRunRecord["provider"];
    targetRole?: AgentRunRecord["role"];
    createdAt?: string;
    statusDetail?: string | null;
  }
) {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const nextRoute: CommandBridgeLatestRoute = {
    routeId: crypto.randomUUID(),
    sourceActionId: input.sourceActionId,
    surface: input.surface,
    provider: input.provider ?? "codex",
    targetRole: input.targetRole ?? "executor",
    projectLabel: deriveProjectLabel(projectRoot),
    projectRoot,
    status: "dispatched",
    statusDetail:
      input.statusDetail
      ?? routeSummary(
        input.surface,
        input.sourceActionId,
        input.provider ?? "codex"
      ),
    createdAt,
    updatedAt: createdAt,
    artifactPath: null,
    runId: null
  };

  const artifactPath = await writeRouteArtifact(nextRoute);
  const routeWithArtifact: CommandBridgeLatestRoute = {
    ...nextRoute,
    artifactPath
  };

  const current = await readCommandBridgeState(projectRoot);

  return writeCommandBridgeState(projectRoot, {
    ...current,
    latestRoute: routeWithArtifact,
    updatedAt: createdAt
  });
}

export async function recordCommandBridgeFailure(
  projectRoot: string,
  routeId: string,
  detail: string,
  updatedAt = new Date().toISOString()
) {
  const current = await readCommandBridgeState(projectRoot);

  if (!current.latestRoute || current.latestRoute.routeId !== routeId) {
    return current;
  }

  return writeCommandBridgeState(projectRoot, {
    ...current,
    latestRoute: {
      ...current.latestRoute,
      status: "failed",
      statusDetail: detail,
      updatedAt
    },
    updatedAt
  });
}

export async function recordCommandBridgeRunStarted(
  projectRoot: string,
  routeId: string,
  record: AgentRunRecord
) {
  const current = await readCommandBridgeState(projectRoot);
  const recordedAt = record.startedAt ?? record.createdAt;
  const latestRun: CommandBridgeLatestRun = {
    runId: record.runId,
    routeId,
    provider: record.provider,
    role: record.role,
    status: record.status,
    taskOutcome: record.taskOutcome,
    failureStage: record.failureStage ?? null,
    failureKind: record.failureKind ?? null,
    summary: runSummary(record),
    recordedAt,
    artifactPath: record.promptPath ?? record.packetPath,
    truthWritebackStatus: truthWritebackStatus(record.status)
  };

  const latestRoute =
    current.latestRoute?.routeId === routeId
      ? {
          ...current.latestRoute,
          runId: record.runId,
          status: "running" as const,
          statusDetail: latestRun.summary,
          updatedAt: recordedAt
        }
      : current.latestRoute;

  return writeCommandBridgeState(projectRoot, {
    ...current,
    latestRoute,
    latestRun,
    updatedAt: recordedAt
  });
}

export async function recordCommandBridgeRunFinished(
  projectRoot: string,
  runId: string
) {
  const [current, record, result] = await Promise.all([
    readCommandBridgeState(projectRoot),
    readAgentRunRecord(projectRoot, runId),
    readAgentRunResult(projectRoot, runId)
  ]);
  const recordedAt = record.finishedAt ?? record.startedAt ?? record.createdAt;
  const latestRun: CommandBridgeLatestRun = {
    runId: record.runId,
    routeId:
      current.latestRoute?.runId === runId ? current.latestRoute.routeId : null,
    provider: record.provider,
    role: record.role,
    status: record.status,
    taskOutcome: record.taskOutcome ?? result.taskOutcome,
    failureStage: record.failureStage ?? result.failureStage ?? null,
    failureKind: record.failureKind ?? result.failureKind ?? null,
    summary: runSummary(record, result.summary),
    recordedAt,
    artifactPath: pickRunArtifactPath(record),
    truthWritebackStatus: truthWritebackStatus(record.status)
  };

  const latestRoute =
    current.latestRoute?.runId === runId
      ? {
          ...current.latestRoute,
          status:
            record.status === "succeeded"
              ? ("succeeded" as const)
              : ("failed" as const),
          statusDetail: latestRun.summary,
          updatedAt: recordedAt
        }
      : current.latestRoute;

  return writeCommandBridgeState(projectRoot, {
    ...current,
    latestRoute,
    latestRun,
    updatedAt: recordedAt
  });
}
