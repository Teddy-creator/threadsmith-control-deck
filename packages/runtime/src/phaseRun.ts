import type { PhaseOwner, PhaseRunPause, PhaseRunRecord } from "@threadsmith/domain";

export interface PhasePauseSummary {
  exists: boolean;
  status: "missing" | "recorded";
  type: PhaseRunPause["type"] | null;
  typeLabel: string | null;
  role: PhaseOwner | null;
  roleLabel: string | null;
  summary: string | null;
  detail: string;
  resumeRequirements: string[];
  recommendedPrompt: string | null;
  createdAt: string | null;
}

export interface PhaseRunSummary {
  exists: boolean;
  status: PhaseRunRecord["status"] | "missing";
  statusLabel: string;
  operatorState: "idle" | "waiting" | "needs-intervention";
  operatorStateLabel: string;
  operatorHeadline: string;
  operatorDetail: string;
  phaseRunId: string | null;
  headline: string;
  detail: string;
  currentRole: PhaseOwner | null;
  currentRoleLabel: string | null;
  currentSliceId: string | null;
  currentSliceLabel: string | null;
  repairCount: number;
  repairLabel: string;
  latestSuccessfulRole: PhaseOwner | null;
  latestSuccessfulRoleLabel: string | null;
  pauseReason: string | null;
  resumeHint: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  latestRunRef: string | null;
  workspacePath: string | null;
}

function formatRoleLabel(role: PhaseOwner | null) {
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
    case "hygiene":
      return "整理";
    default:
      return null;
  }
}

function formatPauseTypeLabel(type: PhaseRunPause["type"] | null) {
  switch (type) {
    case "risk":
      return "风险命中";
    case "blocked":
      return "被阻塞";
    case "missing-info":
      return "缺少信息";
    case "loop-limit":
      return "达到修复上限";
    case "infra-failure":
      return "基础设施失败";
    default:
      return null;
  }
}

function formatPhaseRunStatusLabel(status: PhaseRunSummary["status"]) {
  switch (status) {
    case "running":
      return "自动推进中";
    case "paused":
      return "已暂停";
    case "failed":
      return "失败";
    case "accepted":
      return "已接受";
    case "cancelled":
      return "已取消";
    default:
      return "暂无记录";
  }
}

function formatOperatorStateLabel(
  state: PhaseRunSummary["operatorState"]
) {
  switch (state) {
    case "waiting":
      return "等待结果回流";
    case "needs-intervention":
      return "需要介入";
    default:
      return "当前无需介入";
  }
}

function formatSliceLabel(sliceId: string | null) {
  if (!sliceId) {
    return null;
  }

  const primaryMatch = /^primary-(\d+)$/.exec(sliceId);
  if (primaryMatch) {
    return `主 slice ${primaryMatch[1]}`;
  }

  const repairMatch = /^repair-(\d+)$/.exec(sliceId);
  if (repairMatch) {
    return `修复 slice ${repairMatch[1]}`;
  }

  return sliceId;
}

function formatRepairLabel(repairCount: number) {
  return repairCount > 0 ? `repair 第 ${repairCount} 轮` : "主线推进";
}

export function createMissingPhasePauseSummary(): PhasePauseSummary {
  return {
    exists: false,
    status: "missing",
    type: null,
    typeLabel: null,
    role: null,
    roleLabel: null,
    summary: null,
    detail: "当前还没有 phase-run pause 记录。",
    resumeRequirements: [],
    recommendedPrompt: null,
    createdAt: null
  };
}

export function createMissingPhaseRunSummary(): PhaseRunSummary {
  return {
    exists: false,
    status: "missing",
    statusLabel: formatPhaseRunStatusLabel("missing"),
    operatorState: "idle",
    operatorStateLabel: formatOperatorStateLabel("idle"),
    operatorHeadline: "等待第一次自动链路",
    operatorDetail: "Autopilot 还没有为这个项目写入 automatic chain 的 committed truth。",
    phaseRunId: null,
    headline: "当前还没有 phase run",
    detail: "Autopilot 还没有为这个项目写入 automatic chain 的 committed truth。",
    currentRole: null,
    currentRoleLabel: null,
    currentSliceId: null,
    currentSliceLabel: null,
    repairCount: 0,
    repairLabel: formatRepairLabel(0),
    latestSuccessfulRole: null,
    latestSuccessfulRoleLabel: null,
    pauseReason: null,
    resumeHint: null,
    startedAt: null,
    finishedAt: null,
    latestRunRef: null,
    workspacePath: null
  };
}

export function deriveLatestPhasePauseSummary(
  latestPhasePause: PhaseRunPause | null = null
): PhasePauseSummary {
  if (!latestPhasePause) {
    return createMissingPhasePauseSummary();
  }

  return {
    exists: true,
    status: "recorded",
    type: latestPhasePause.type,
    typeLabel: formatPauseTypeLabel(latestPhasePause.type),
    role: latestPhasePause.role,
    roleLabel: formatRoleLabel(latestPhasePause.role),
    summary: latestPhasePause.summary,
    detail: latestPhasePause.detail,
    resumeRequirements: [...latestPhasePause.resumeRequirements],
    recommendedPrompt: latestPhasePause.recommendedPrompt,
    createdAt: latestPhasePause.createdAt
  };
}

export function deriveLatestPhaseRunSummary(
  latestPhaseRun: PhaseRunRecord | null = null,
  latestPhasePauseSummary: PhasePauseSummary = createMissingPhasePauseSummary()
): PhaseRunSummary {
  if (!latestPhaseRun) {
    return createMissingPhaseRunSummary();
  }

  const currentRoleLabel = formatRoleLabel(latestPhaseRun.currentRole);
  const currentSliceLabel = formatSliceLabel(latestPhaseRun.currentSliceId);
  const latestSuccessfulRoleLabel = formatRoleLabel(
    latestPhaseRun.latestSuccessfulRole
  );
  const repairLabel = formatRepairLabel(latestPhaseRun.repairCount);
  const sliceDetail = currentSliceLabel
    ? `当前停在 ${currentSliceLabel}`
    : "当前还没有写出 slice";
  const successDetail = latestSuccessfulRoleLabel
    ? `最近成功角色：${latestSuccessfulRoleLabel}`
    : "还没有成功角色";
  const repairDetail =
    latestPhaseRun.repairCount > 0 ? `当前处于 ${repairLabel}` : "当前尚未进入 repair";

  let headline = "当前还没有 phase run";
  let detail = [sliceDetail, successDetail, repairDetail].join("，") + "。";
  let operatorState: PhaseRunSummary["operatorState"] = "idle";
  let operatorHeadline = "等待下一条动作";
  let operatorDetail = detail;

  switch (latestPhaseRun.status) {
    case "running":
      headline = currentRoleLabel
        ? `自动链路正在${currentRoleLabel}`
        : "自动链路正在推进";
      operatorState = "waiting";
      operatorHeadline = "当前无需操作";
      operatorDetail = currentRoleLabel
        ? `自动链路正在${currentRoleLabel}，当前不需要重新签发动作，先等待结果写回 committed truth。`
        : "自动链路正在推进，当前不需要重新签发动作，先等待结果写回 committed truth。";
      break;
    case "paused":
      headline = currentRoleLabel
        ? `自动链路暂停在${currentRoleLabel}`
        : "自动链路已暂停";
      detail = latestPhasePauseSummary.exists
        ? latestPhasePauseSummary.detail
        : latestPhaseRun.pauseReason?.trim() ||
          "Autopilot 已暂停，等待你处理暂停条件。";
      operatorState = "needs-intervention";
      operatorHeadline = latestPhaseRun.resumeHint
        ? "先补齐恢复条件，再去指挥入口 continue"
        : "先补齐恢复条件";
      operatorDetail =
        latestPhaseRun.resumeHint && !detail.includes("回到指挥入口")
          ? `${detail} 处理完后回到指挥入口显式 continue 当前自动链路。`
          : detail;
      break;
    case "accepted":
      headline = "最近一次自动链路已接受";
      detail = [sliceDetail, successDetail].join("，") + "。";
      operatorState = "idle";
      operatorHeadline = "这轮自动链路已经完成";
      operatorDetail = "当前这轮 automatic chain 已 accepted，等待下一条明确动作。";
      break;
    case "failed":
      headline = "最近一次自动链路失败";
      detail =
        latestPhaseRun.pauseReason?.trim() ||
        [sliceDetail, successDetail, repairDetail].join("，") + "。";
      operatorState = "needs-intervention";
      operatorHeadline = "先修复失败原因";
      operatorDetail = detail;
      break;
    case "cancelled":
      headline = "最近一次自动链路已取消";
      detail =
        latestPhaseRun.pauseReason?.trim() ||
        "自动链路被显式取消，当前没有继续推进。";
      operatorState = "idle";
      operatorHeadline = "这轮自动链路已取消";
      operatorDetail = detail;
      break;
  }

  return {
    exists: true,
    status: latestPhaseRun.status,
    statusLabel: formatPhaseRunStatusLabel(latestPhaseRun.status),
    operatorState,
    operatorStateLabel: formatOperatorStateLabel(operatorState),
    operatorHeadline,
    operatorDetail,
    phaseRunId: latestPhaseRun.phaseRunId,
    headline,
    detail,
    currentRole: latestPhaseRun.currentRole,
    currentRoleLabel,
    currentSliceId: latestPhaseRun.currentSliceId,
    currentSliceLabel,
    repairCount: latestPhaseRun.repairCount,
    repairLabel,
    latestSuccessfulRole: latestPhaseRun.latestSuccessfulRole,
    latestSuccessfulRoleLabel,
    pauseReason: latestPhaseRun.pauseReason,
    resumeHint: latestPhaseRun.resumeHint,
    startedAt: latestPhaseRun.startedAt,
    finishedAt: latestPhaseRun.finishedAt,
    latestRunRef: latestPhaseRun.latestRunRef,
    workspacePath: latestPhaseRun.workspacePath
  };
}
