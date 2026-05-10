import type { AgentRunRecord, ContextPacket } from "@threadsmith/domain";
import type {
  ContextRecoveryAction,
  ContextRecoverySignal
} from "./contextRecovery.ts";
import type { PhaseRunSummary } from "./phaseRun.ts";

export type TruthConfidenceLevel = "trusted" | "watch" | "recover";
export type TruthConfidenceSeverity = "info" | "watch" | "recover";
export type TruthConfidenceSurface =
  | "committed-truth"
  | "context-artifact"
  | "current-packet"
  | "role-packet"
  | "latest-run"
  | "phase-run"
  | "accepted-continuation"
  | "recent-diff";

export interface TruthConfidenceReason {
  id: string;
  label: string;
  detail: string;
  surface: TruthConfidenceSurface;
  severity: TruthConfidenceSeverity;
}

export interface TruthConfidenceSummary {
  level: TruthConfidenceLevel;
  label: string;
  tone: "green" | "amber" | "red";
  headline: string;
  detail: string;
  primaryReason: TruthConfidenceReason;
  reasons: TruthConfidenceReason[];
  safeAction: ContextRecoveryAction;
  safeActionLabel: string;
  safeActionDetail: string;
  canContinue: boolean;
}

export interface DeriveTruthConfidenceOptions {
  currentPacket?: ContextPacket | null;
  latestRun?: AgentRunRecord | null;
  latestPhaseRun?: PhaseRunSummary | null;
}

function actionLabel(action: ContextRecoveryAction) {
  switch (action) {
    case "continue":
      return "继续推进";
    case "sync-context":
      return "同步 Context Packet";
    case "run-hygiene":
      return "运行 context hygiene";
    case "wait-for-run":
      return "等待结果回流";
    case "repair-run":
      return "修复最新运行";
    case "resume-phase-run":
      return "恢复暂停链路";
    case "create-handoff":
      return "创建 handoff";
    case "phase-reset":
      return "重置 phase";
    default:
      return action;
  }
}

function levelForRecovery(status: ContextRecoverySignal["status"]): TruthConfidenceLevel {
  switch (status) {
    case "fresh":
      return "trusted";
    case "watch":
      return "watch";
    case "recover":
      return "recover";
    default:
      return "watch";
  }
}

function toneForLevel(level: TruthConfidenceLevel): TruthConfidenceSummary["tone"] {
  switch (level) {
    case "trusted":
      return "green";
    case "watch":
      return "amber";
    case "recover":
      return "red";
    default:
      return "amber";
  }
}

function labelForLevel(level: TruthConfidenceLevel) {
  switch (level) {
    case "trusted":
      return "可信";
    case "watch":
      return "需观察";
    case "recover":
      return "需恢复";
    default:
      return "需观察";
  }
}

function headlineForLevel(level: TruthConfidenceLevel) {
  switch (level) {
    case "trusted":
      return "当前 truth 可以信任";
    case "watch":
      return "当前 truth 可读，但需要观察";
    case "recover":
      return "当前 truth 需要先恢复";
    default:
      return "当前 truth 需要复核";
  }
}

function reasonFromId(
  id: string,
  recovery: ContextRecoverySignal,
  options: DeriveTruthConfidenceOptions
): TruthConfidenceReason {
  switch (id) {
    case "context-artifact-invalid":
      return {
        id,
        label: "Context artifact 不兼容",
        detail: recovery.detail,
        surface: "context-artifact",
        severity: "recover"
      };
    case "context-packet-missing":
      return {
        id,
        label: "缺少 current-packet.json",
        detail: "当前没有可用的 Context Packet。继续前应先从 committed truth 重新生成 packet。",
        surface: "current-packet",
        severity: "recover"
      };
    case "context-packet-stale":
      return {
        id,
        label: "current-packet.json 已过期",
        detail: "current-packet.json 与当前 phase 或 acceptance claim 不一致，继续前需要同步。",
        surface: "current-packet",
        severity: "recover"
      };
    case "role-packet-missing":
      return {
        id,
        label: "当前角色 packet 缺失",
        detail:
          "可以临时用主 Context Packet 继续，但该角色缺少专属工作上下文，建议刷新后再推进关键动作。",
        surface: "role-packet",
        severity: "watch"
      };
    case "role-packet-stale":
      return {
        id,
        label: "当前角色 packet 已过期",
        detail: "角色 packet 与主 packet 或 committed truth 不一致，继续前应先运行 hygiene。",
        surface: "role-packet",
        severity: "recover"
      };
    case "latest-run-failed":
      return {
        id,
        label: "最新运行失败",
        detail: options.latestRun?.statusDetail ?? recovery.detail,
        surface: "latest-run",
        severity: "recover"
      };
    case "run-in-progress":
      return {
        id,
        label: "运行结果尚未回流",
        detail:
          options.latestPhaseRun?.status === "running"
            ? options.latestPhaseRun.operatorDetail
            : (options.latestRun?.statusDetail ?? recovery.detail),
        surface: options.latestPhaseRun?.status === "running" ? "phase-run" : "latest-run",
        severity: "watch"
      };
    case "phase-run-paused":
      return {
        id,
        label: "自动链路已暂停",
        detail: recovery.detail,
        surface: "phase-run",
        severity: "recover"
      };
    case "accepted-needs-continuation":
      return {
        id,
        label: "已 accepted，需要继续点",
        detail: "当前 slice 已接受。进入下一刀前应创建 handoff 或执行 phase reset，避免从脏上下文继续。",
        surface: "accepted-continuation",
        severity: "watch"
      };
    default:
      return {
        id,
        label: id,
        detail: recovery.detail,
        surface: "committed-truth",
        severity: recovery.status === "recover" ? "recover" : "watch"
      };
  }
}

function freshReason(): TruthConfidenceReason {
  return {
    id: "truth-aligned",
    label: "truth 与 packet 对齐",
    detail: "committed truth、current packet 与当前角色 packet 已对齐，可以继续使用。",
    surface: "committed-truth",
    severity: "info"
  };
}

function dirtyDiffReason(packet: ContextPacket): TruthConfidenceReason | null {
  if (packet.recentDiff.status !== "dirty") {
    return null;
  }

  return {
    id: "recent-diff-dirty",
    label: "工作区存在未收口 diff",
    detail: packet.recentDiff.summary,
    surface: "recent-diff",
    severity: "watch"
  };
}

function strongestLevel(
  currentLevel: TruthConfidenceLevel,
  reasons: TruthConfidenceReason[]
) {
  if (reasons.some((reason) => reason.severity === "recover")) {
    return "recover";
  }

  if (
    currentLevel === "recover" ||
    currentLevel === "watch" ||
    reasons.some((reason) => reason.severity === "watch")
  ) {
    return currentLevel === "recover" ? "recover" : "watch";
  }

  return "trusted";
}

function pickPrimaryReason(reasons: TruthConfidenceReason[]) {
  return (
    reasons.find((reason) => reason.severity === "recover") ??
    reasons.find((reason) => reason.severity === "watch") ??
    reasons[0] ??
    freshReason()
  );
}

export function deriveTruthConfidence(
  recovery: ContextRecoverySignal,
  options: DeriveTruthConfidenceOptions = {}
): TruthConfidenceSummary {
  const mappedReasons = recovery.reasons.map((reason) =>
    reasonFromId(reason, recovery, options)
  );
  const dirtyReason = options.currentPacket ? dirtyDiffReason(options.currentPacket) : null;
  const reasons = [...mappedReasons, ...(dirtyReason ? [dirtyReason] : [])];
  const visibleReasons = reasons.length > 0 ? reasons : [freshReason()];
  const level = strongestLevel(levelForRecovery(recovery.status), visibleReasons);
  const primaryReason = pickPrimaryReason(visibleReasons);
  const safeActionLabel = actionLabel(recovery.action);

  return {
    level,
    label: labelForLevel(level),
    tone: toneForLevel(level),
    headline: headlineForLevel(level),
    detail: primaryReason.detail,
    primaryReason,
    reasons: visibleReasons,
    safeAction: recovery.action,
    safeActionLabel,
    safeActionDetail:
      recovery.action === "continue" && level === "watch"
        ? "可以继续，但先确认上面的观察项不会影响本轮验收或提交范围。"
        : recovery.detail,
    canContinue: recovery.action === "continue" && level !== "recover"
  };
}
