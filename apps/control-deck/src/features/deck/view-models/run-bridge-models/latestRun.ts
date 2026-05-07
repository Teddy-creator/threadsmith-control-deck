import type { AgentRunRecord } from "@threadsmith/domain";
import type { SupervisorState } from "@threadsmith/runtime";
import { formatRole } from "../../../display/labels";
import { formatEventTime } from "../../../events/formatters";
import { formatCollaborationThreadLabel, formatProviderLabel, type Tone } from "../shared";
import { formatRunStatusLabel } from "./status";
import type { LatestRunModel, LatestRunPathItem } from "./types";

function pickRunTone(status: AgentRunRecord["status"] | null | undefined): Tone {
  switch (status) {
    case "queued":
      return "blue";
    case "running":
      return "amber";
    case "succeeded":
      return "green";
    case "failed":
      return "red";
    case "cancelled":
      return "zinc";
    default:
      return "zinc";
  }
}

function buildRunTruthImpact(run: AgentRunRecord | null) {
  if (!run) {
    return "尚未写回 truth";
  }

  switch (run.status) {
    case "queued":
      return "等待开始，尚未写回 truth";
    case "running":
      return "等待结果回流到 truth";
    case "failed":
      return "失败原因已回流为 blocker";
    case "cancelled":
      return "这轮没有继续写回 truth";
    case "succeeded":
      switch (run.role) {
        case "planner":
          return "项目边界已刷新到 truth";
        case "reviewer":
          return "评审结论已写回 truth";
        case "verifier":
          return "验证结论已写回 truth";
        case "closeout":
          return "收尾记录已写回 truth";
        case "hygiene":
          return "continuation packet 已写回 truth";
        default:
          return "执行结果已写回 truth";
      }
    default:
      return "尚未写回 truth";
  }
}

function buildRunSummary(run: AgentRunRecord | null) {
  if (!run) {
    return "当前还没有自动执行记录。";
  }

  if (run.statusDetail?.trim()) {
    return run.statusDetail.trim();
  }

  const roleLabel = formatRole(run.role);

  switch (run.status) {
    case "queued":
      return `${roleLabel}运行已排队，等待启动。`;
    case "running":
      return `${roleLabel}运行进行中，等待结果写回。`;
    case "succeeded":
      return `${roleLabel}运行已完成，结果已经生成。`;
    case "failed":
      return `${roleLabel}运行失败，等待处理失败原因。`;
    case "cancelled":
      return `${roleLabel}运行已取消，可按需重新发起。`;
    default:
      return "当前还没有自动执行记录。";
  }
}

function buildLatestRunPathItems(run: AgentRunRecord | null): LatestRunPathItem[] {
  if (!run) {
    return [];
  }

  const items: LatestRunPathItem[] = [];

  if (run.summaryPath) {
    items.push({ label: "摘要文件", value: run.summaryPath });
  }

  if (run.resultPath) {
    items.push({ label: "结果文件", value: run.resultPath });
  }

  if (run.status === "failed" && run.stderrPath) {
    items.push({ label: "错误日志", value: run.stderrPath });
  }

  if (run.status !== "failed" && run.stdoutPath) {
    items.push({ label: "运行日志", value: run.stdoutPath });
  }

  if (!run.summaryPath && run.promptPath) {
    items.push({ label: "指令文件", value: run.promptPath });
  }

  if (!run.resultPath) {
    items.push({ label: "执行包", value: run.packetPath });
  }

  return items.slice(0, 3);
}

export function buildLatestRunModel(
  supervisorState: SupervisorState | null
): LatestRunModel {
  const run = supervisorState?.latestRun ?? null;

  if (!run) {
    return {
      exists: false,
      headline: "等待第一次自动执行",
      summary: "当前还没有自动执行记录。",
      statusLabel: "未执行",
      tone: "zinc",
      providerLabel: null,
      roleLabel: null,
      threadLabel: null,
      timingLine: "发起一次运行后自动出现",
      truthImpact: "尚未写回 truth",
      runId: null,
      createdAtLabel: "未记录",
      startedAtLabel: "未开始",
      finishedAtLabel: "未结束",
      pathItems: []
    };
  }

  const startedAtLabel = run.startedAt ? formatEventTime(run.startedAt) : "未开始";
  const finishedAtLabel = run.finishedAt
    ? formatEventTime(run.finishedAt)
    : run.status === "running"
      ? "进行中"
      : "未记录";
  const timingParts = [
    run.startedAt
      ? `开始 ${formatEventTime(run.startedAt)}`
      : `创建 ${formatEventTime(run.createdAt)}`
  ];

  if (run.finishedAt) {
    timingParts.push(`结束 ${formatEventTime(run.finishedAt)}`);
  } else if (run.status === "running") {
    timingParts.push("尚未结束");
  }

  return {
    exists: true,
    headline: `${formatCollaborationThreadLabel(run.role)} 最新角色运行`,
    summary: buildRunSummary(run),
    statusLabel: formatRunStatusLabel(run.status),
    tone: pickRunTone(run.status),
    providerLabel: formatProviderLabel(run.provider),
    roleLabel: formatRole(run.role),
    threadLabel: formatCollaborationThreadLabel(run.role),
    timingLine: timingParts.join(" · "),
    truthImpact: buildRunTruthImpact(run),
    runId: run.runId,
    createdAtLabel: formatEventTime(run.createdAt),
    startedAtLabel,
    finishedAtLabel,
    pathItems: buildLatestRunPathItems(run)
  };
}
