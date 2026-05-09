import type { ProjectOnboardingStep } from "../projectOnboarding";
import type { RuntimeActionId, SupervisorState, WorkflowTransitionAction } from "@threadsmith/runtime";

export function statusBadgeClass(kind: string) {
  switch (kind) {
    case "green":
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    case "amber":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case "red":
      return "bg-red-500/10 text-red-400 border border-red-500/20";
    case "blue":
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    case "purple":
      return "bg-purple-500/10 text-purple-300 border border-purple-500/20";
    default:
      return "bg-zinc-800/80 text-zinc-400 border border-zinc-700/80";
  }
}

export function pill(kind: string, text: string) {
  return (
    <span
      className={`inline-flex min-h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs leading-none ${statusBadgeClass(kind)}`}
    >
      {text}
    </span>
  );
}

export const purpleMetaTagClass =
  "inline-flex min-h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-purple-500/10 px-2.5 py-1 text-xs leading-none text-purple-300";

export const cyanMetaTagClass =
  "inline-flex min-h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-cyan-500/10 px-2.5 py-1 text-xs leading-none text-cyan-300";

export const amberMetaTagClass =
  "inline-flex min-h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-amber-500/10 px-2.5 py-1 text-xs leading-none text-amber-300";

function trimSecondaryDetail(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+(?:Packet|packet|Evidence|evidence|Artifact|artifact)\s*[：:].*$/u, "")
    .trim();
}

export function compactText(
  text: string | null | undefined,
  maxLength = 96
) {
  if (!text) {
    return "";
  }

  const normalized = trimSecondaryDetail(text);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
}

export function toneTextClass(kind: string) {
  switch (kind) {
    case "green":
      return "text-emerald-400";
    case "amber":
      return "text-amber-400";
    case "red":
      return "text-red-400";
    case "blue":
      return "text-blue-400";
    case "purple":
      return "text-purple-300";
    default:
      return "text-zinc-300";
  }
}

export function onboardingStepBadgeClass(state: ProjectOnboardingStep["state"]) {
  switch (state) {
    case "done":
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "current":
      return "border border-amber-500/20 bg-amber-500/10 text-amber-300";
    default:
      return "border border-zinc-700/80 bg-zinc-900/80 text-zinc-400";
  }
}

export function formatOnboardingStepState(state: ProjectOnboardingStep["state"]) {
  switch (state) {
    case "done":
      return "已完成";
    case "current":
      return "当前";
    default:
      return "下一步";
  }
}

export function pickProjectTone(
  state: string | null
): "green" | "amber" | "red" | "blue" | "zinc" {
  switch (state) {
    case "stable":
      return "green";
    case "at-risk":
      return "amber";
    case "blocked":
      return "red";
    case "in-progress":
      return "blue";
    case "planning":
      return "zinc";
    default:
      return "zinc";
  }
}

export function pickAcceptanceTone(
  status: string
): "green" | "amber" | "red" | "blue" | "zinc" {
  switch (status) {
    case "accepted":
    case "passed":
    case "done":
    case "pass":
    case "ready":
      return "green";
    case "implementing":
    case "in-review":
    case "running":
    case "pending":
    case "ready-for-review":
    case "ready-for-verification":
      return "amber";
    case "failed":
    case "verification-failed":
    case "review-blocked":
    case "fail":
      return "red";
    case "not-ready":
    case "not-started":
    case "unknown":
      return "zinc";
    default:
      return "blue";
  }
}

export function pickLatestTaskOutcomeTone(
  taskOutcome: SupervisorState["commandBridge"]["latestResult"]["taskOutcome"]
): "green" | "amber" | "red" | "zinc" {
  switch (taskOutcome) {
    case "succeeded":
      return "green";
    case "failed":
      return "red";
    case "unknown":
      return "zinc";
    default:
      return "zinc";
  }
}

export function pickLatestFailureStageTone(
  failureStage: SupervisorState["commandBridge"]["latestResult"]["failureStage"]
): "green" | "amber" | "red" | "zinc" {
  switch (failureStage) {
    case "result-reporting":
      return "amber";
    case "task":
    case "cli-startup":
      return "red";
    case "unknown":
      return "zinc";
    default:
      return "zinc";
  }
}

export function pickWorkflowTransitionTone(
  tone: WorkflowTransitionAction["tone"]
): "green" | "amber" | "red" | "blue" | "zinc" {
  switch (tone) {
    case "success":
      return "green";
    case "warning":
      return "red";
    default:
      return "blue";
  }
}

export function workflowTransitionButtonClass(
  tone: WorkflowTransitionAction["tone"],
  active: boolean
) {
  if (active) {
    switch (tone) {
      case "success":
        return "cursor-wait bg-emerald-300 text-zinc-950";
      case "warning":
        return "cursor-wait bg-red-300 text-zinc-950";
      default:
        return "cursor-wait bg-zinc-300 text-zinc-950";
    }
  }

  switch (tone) {
    case "success":
      return "bg-emerald-500 text-zinc-950 hover:bg-emerald-400";
    case "warning":
      return "bg-red-500 text-zinc-950 hover:bg-red-400";
    default:
      return "bg-zinc-200 text-zinc-950 hover:bg-zinc-100";
  }
}

export function formatRuntimeAction(actionId: RuntimeActionId) {
  switch (actionId) {
    case "advance-phase":
      return "推进当前任务";
    case "open-current-phase":
      return "查看当前阶段";
    case "run-verification":
      return "执行验证";
    case "sync-context":
      return "刷新 Context Packet";
    case "run-hygiene":
      return "整理当前线程";
    case "create-handoff":
      return "生成交接点";
    default:
      return actionId;
  }
}

export function formatContinuationStatus(
  freshness: SupervisorState["latestContinuationState"]["freshness"],
  status: SupervisorState["latestContinuationState"]["status"]
) {
  if (status === "missing") {
    return "未保存继续点";
  }

  if (freshness === "stale") {
    return "继续点已过时";
  }

  return "继续点最新";
}

export function formatEvidenceSource(source: "event" | "state") {
  return source === "event" ? "来自事件" : "来自状态";
}

export function pickContinuationTone(
  freshness: SupervisorState["latestContinuationState"]["freshness"],
  status: SupervisorState["latestContinuationState"]["status"]
): "green" | "amber" | "zinc" {
  if (status === "missing") {
    return "zinc";
  }

  if (freshness === "stale") {
    return "amber";
  }

  return "green";
}

export function formatContinuationKind(
  kind: SupervisorState["latestContinuationState"]["kind"]
) {
  switch (kind) {
    case "handoff":
      return "handoff packet";
    case "hygiene":
      return "hygiene packet";
    default:
      return "未记录 packet";
  }
}

export function formatWorkflowEventKind(
  kind: "deck-action" | "workflow-transition" | "agent-run"
) {
  switch (kind) {
    case "workflow-transition":
      return "流转事件";
    case "agent-run":
      return "自动执行";
    default:
      return "动作事件";
  }
}

export function routingSupportSummary(allCodex: boolean) {
  return allCodex
    ? "当前默认执行角色都路由到 Codex，执行桥可以完整覆盖默认执行线。"
    : "当前为混合 provider 路由；非 Codex 角色已配置但暂不支持自动执行。";
}
