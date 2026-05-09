import type {
  AgentRunRecord,
  ProviderRouting,
  ProjectState,
  ProjectSupervisionState
} from "@threadsmith/domain";
import {
  formatProviderLabel,
  resolveRoleProvider
} from "./providerRouting.ts";

export interface SupervisionLineSummary {
  id: string;
  role: string;
  roleLabel: string;
  threadLabel: string;
  provider: string | null;
  providerLabel: string | null;
  assignmentLabel: string;
  presence: "logical" | "live";
  status: string;
  statusLabel: string;
  taskSummary: string;
  requiresUserDecision: boolean;
  blockerSummary: string | null;
  latestEvidenceLabel: string | null;
  updatedAt: string | null;
}

export interface ProjectSupervisionSummary {
  mode: "single-thread" | "multi-thread";
  modeLabel: string;
  summary: string;
  status: "idle" | "running" | "waiting" | "blocked";
  statusLabel: string;
  runningCount: number;
  waitingCount: number;
  blockedCount: number;
  liveCount: number;
  logicalCount: number;
  lines: SupervisionLineSummary[];
  alert: string;
}

export interface PhaseParticipantSummary {
  role: string;
  roleLabel: string;
  threadLabel: string;
  providerLabel: string;
  assignmentLabel: string;
  statusLabel: string;
  taskSummary: string;
  latestEvidenceLabel: string | null;
}

function formatRole(role: string) {
  switch (role) {
    case "planner":
      return "规划";
    case "executor":
      return "执行";
    case "reviewer":
      return "评审";
    case "verifier":
      return "验证";
    case "closeout":
      return "收尾";
    default:
      return "整理";
  }
}

function formatRoleStatus(status: string, requiresUserDecision: boolean) {
  if (requiresUserDecision) {
    return "等待决策";
  }

  switch (status) {
    case "idle":
      return "空闲";
    case "running":
      return "进行中";
    case "waiting":
      return "等待中";
    case "blocked":
      return "阻塞";
    case "done":
      return "完成";
    default:
      return status;
  }
}

function defaultThreadLabel(role: string) {
  switch (role) {
    case "planner":
      return "Conductor";
    case "executor":
      return "Builder";
    case "reviewer":
      return "Critic";
    case "verifier":
      return "Verifier";
    case "closeout":
      return "Closeout";
    default:
      return "Hygiene";
  }
}

function defaultRoleTaskSummary(projectLabel: string, role: string) {
  switch (role) {
    case "planner":
      return `负责为 ${projectLabel} 收束当前阶段目标与下一条最小 slice。`;
    case "executor":
      return "负责推进当前实现并把结果回写到 committed truth。";
    case "reviewer":
      return "负责复核当前输出并判断是否可以进入 verification。";
    case "verifier":
      return "负责独立验证当前结果并补齐证据。";
    case "closeout":
      return "负责清理临时痕迹并补齐 closeout artifact。";
    default:
      return "负责帮助当前线程重新对齐最新真相。";
  }
}

function deriveFallbackProjectSupervision(
  state: ProjectState
): ProjectSupervisionState {
  const roleIds = [
    ...new Set([
      ...state.currentPhase.activeOwners,
      ...state.activeWork.items.map((item) => item.role)
    ])
  ];
  const lines = roleIds.map((role) => {
    const workItem = state.activeWork.items.find((item) => item.role === role);

    return {
      id: role,
      role,
      threadLabel: defaultThreadLabel(role),
      provider: null,
      presence: "logical" as const,
      status: workItem?.status ?? "idle",
      taskSummary:
        workItem?.taskSummary
        ?? defaultRoleTaskSummary(state.projectStatus.projectLabel, role),
      requiresUserDecision: workItem?.requiresUserDecision ?? false,
      blockerSummary:
        workItem?.status === "blocked"
          ? state.activeWork.blockerSummary ?? workItem.taskSummary
          : null,
      latestEvidenceLabel: null,
      updatedAt: null
    };
  });

  return {
    mode: lines.length <= 1 ? "single-thread" : "multi-thread",
    modeLabel: lines.length <= 1 ? "单线推进" : "多角色协作",
    summary:
      lines.length <= 1
        ? "当前先按一条逻辑监督线推进；是否已有真实线程归属以 committed supervision truth 为准。"
        : `当前先按 ${lines.length} 条角色监督线推进；是否已有真实线程归属以 committed supervision truth 为准。`,
    lines,
    updatedAt: null
  };
}

function buildAlert(lines: SupervisionLineSummary[], projectSummary: string) {
  const blockedLine = lines.find(
    (line) => line.status === "blocked" || line.blockerSummary
  );

  if (blockedLine) {
    return `阻塞：${blockedLine.blockerSummary ?? blockedLine.taskSummary}`;
  }

  const decisionLine = lines.find((line) => line.requiresUserDecision);

  if (decisionLine) {
    return `待决策：${decisionLine.taskSummary}`;
  }

  const waitingLine = lines.find((line) => line.status === "waiting");

  if (waitingLine) {
    return `等待：${waitingLine.taskSummary}`;
  }

  const runningLine = lines.find((line) => line.status === "running");

  if (runningLine) {
    return `主工作：${runningLine.taskSummary}`;
  }

  const doneLine = lines.find((line) => line.status === "done");

  if (doneLine) {
    return `最近完成：${doneLine.taskSummary}`;
  }

  return projectSummary;
}

export function deriveProjectSupervisionSummary(
  state: ProjectState,
  projectSupervisionState: ProjectSupervisionState | null = null,
  latestRun: AgentRunRecord | null = null,
  providerRouting: ProviderRouting | null = null
): ProjectSupervisionSummary {
  const source = projectSupervisionState ?? deriveFallbackProjectSupervision(state);
  const lines = source.lines.map((line) => {
    const resolvedProvider = resolveRoleProvider({
      role: line.role,
      line,
      routing: providerRouting
    });
    const latestEvidenceLabel =
      line.latestEvidenceLabel
      ?? (latestRun && latestRun.role === line.role
        ? `最近运行 ${latestRun.status}`
        : null);

    return {
      id: line.id,
      role: line.role,
      roleLabel: formatRole(line.role),
      threadLabel: line.threadLabel,
      provider: resolvedProvider.provider,
      providerLabel: formatProviderLabel(resolvedProvider.provider),
      assignmentLabel: line.presence === "live" ? "真实线程" : "逻辑角色",
      presence: line.presence,
      status: line.status,
      statusLabel: formatRoleStatus(line.status, line.requiresUserDecision),
      taskSummary: line.taskSummary,
      requiresUserDecision: line.requiresUserDecision,
      blockerSummary: line.blockerSummary,
      latestEvidenceLabel,
      updatedAt: line.updatedAt
    };
  });

  const blockedCount = lines.filter(
    (line) => line.status === "blocked" || line.blockerSummary
  ).length;
  const waitingCount = lines.filter(
    (line) => line.status === "waiting" || line.requiresUserDecision
  ).length;
  const runningCount = lines.filter((line) => line.status === "running").length;
  const liveCount = lines.filter((line) => line.presence === "live").length;
  const logicalCount = lines.length - liveCount;
  const status: ProjectSupervisionSummary["status"] =
    blockedCount > 0
      ? "blocked"
      : waitingCount > 0
        ? "waiting"
        : runningCount > 0
          ? "running"
          : "idle";
  const statusLabel =
    status === "blocked"
      ? "存在阻塞"
      : status === "waiting"
        ? "等待协作"
        : status === "running"
          ? "进行中"
          : "现场空闲";

  return {
    mode: source.mode,
    modeLabel: source.modeLabel,
    summary: source.summary,
    status,
    statusLabel,
    runningCount,
    waitingCount,
    blockedCount,
    liveCount,
    logicalCount,
    lines,
    alert: buildAlert(lines, source.summary)
  };
}

export function derivePhaseParticipantSummary(
  state: ProjectState,
  projectSupervisionState: ProjectSupervisionState | null = null,
  providerRouting: ProviderRouting | null = null
): PhaseParticipantSummary[] {
  const source = projectSupervisionState ?? deriveFallbackProjectSupervision(state);

  return state.currentPhase.activeOwners.map((role) => {
    const line = source.lines.find((item) => item.role === role);
    const resolvedProvider = resolveRoleProvider({
      role,
      line,
      routing: providerRouting
    });

    return {
      role,
      roleLabel: formatRole(role),
      threadLabel: line?.threadLabel ?? defaultThreadLabel(role),
      providerLabel: resolvedProvider.providerLabel,
      assignmentLabel: line?.presence === "live" ? "真实线程" : "逻辑角色",
      statusLabel: formatRoleStatus(
        line?.status ?? "idle",
        line?.requiresUserDecision ?? false
      ),
      taskSummary:
        line?.taskSummary ?? defaultRoleTaskSummary(state.projectStatus.projectLabel, role),
      latestEvidenceLabel: line?.latestEvidenceLabel ?? null
    };
  });
}
