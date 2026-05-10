import type { PhaseRunPause, PhaseRunRecord, ProjectState } from "@threadsmith/domain";
import type { BootstrapProjectStateResult } from "./bootstrap.ts";

export type AutopilotContinuationAction =
  | "start"
  | "resume"
  | "wait"
  | "reset-needed";

export interface AutopilotContinuationDecision {
  action: AutopilotContinuationAction;
  headline: string;
  detail: string;
  recommendedCommand: string | null;
  phaseRunId: string | null;
}

export function describeAutopilotContinuationDecision(
  decision: AutopilotContinuationDecision
) {
  switch (decision.action) {
    case "start":
      return "continue 将启动新的 locked phase run，并连续推进 planner -> executor -> reviewer -> verifier -> closeout，除非触发安全暂停。";
    case "resume":
      return "continue 将从 paused phase run 恢复，沿原有 locked phase 继续，不会新开重复自动链。";
    case "wait":
      return "continue 不会重复启动；当前已有 running phase run，先等待结果写回 committed truth。";
    case "reset-needed":
      return "continue 不会从旧 truth 硬跑；需要先补齐 bootstrap 或重置新的 current phase。";
  }
}

function formatRoleLabel(role: PhaseRunRecord["currentRole"]) {
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

export function buildAutopilotCliCommand(
  projectRoot: string,
  command: "start" | "resume" | "continue" | "status"
) {
  return `npm run threadsmith:autopilot -- ${command} ${JSON.stringify(projectRoot)}`;
}

function bootstrapBlockedDecision(
  projectRoot: string,
  bootstrap: Pick<BootstrapProjectStateResult, "summary" | "missingInfo">
): AutopilotContinuationDecision {
  const missingInfoText =
    bootstrap.missingInfo.length > 0
      ? `缺口：${bootstrap.missingInfo.join("；")}`
      : bootstrap.summary;

  return {
    action: "reset-needed",
    headline: "Bootstrap 还没补齐",
    detail: `${bootstrap.summary}${missingInfoText ? ` ${missingInfoText}` : ""}`.trim(),
    recommendedCommand: buildAutopilotCliCommand(projectRoot, "status"),
    phaseRunId: null
  };
}

function acceptedResetDecision(
  projectRoot: string,
  state: ProjectState,
  latestPhaseRun: PhaseRunRecord | null
): AutopilotContinuationDecision {
  const phaseRunDetail = latestPhaseRun
    ? `最近一轮 phase run（${latestPhaseRun.phaseRunId}）状态为 ${latestPhaseRun.status}。`
    : "";

  return {
    action: "reset-needed",
    headline: "当前 phase 已 accepted，先重置下一刀",
    detail: `${phaseRunDetail}当前 claim「${state.acceptanceState.currentClaim}」已经 accepted。请先写回新的 current phase / acceptance truth，再继续 autopilot；如果 phase run 仍显示 running/paused，请先检查最近 artifact，避免从旧 truth 恢复。`,
    recommendedCommand: buildAutopilotCliCommand(projectRoot, "status"),
    phaseRunId: latestPhaseRun?.phaseRunId ?? null
  };
}

function pausedResumeDecision(
  projectRoot: string,
  latestPhaseRun: PhaseRunRecord,
  latestPause: PhaseRunPause | null
): AutopilotContinuationDecision {
  const pauseSummary = latestPause?.summary ?? latestPhaseRun.pauseReason ?? "当前 paused phase run 可以继续恢复。";
  const pauseDetail = latestPause?.detail?.trim();
  const detail = pauseDetail ? `${pauseSummary} ${pauseDetail}` : pauseSummary;

  return {
    action: "resume",
    headline: "当前自动链可继续恢复",
    detail,
    recommendedCommand: buildAutopilotCliCommand(projectRoot, "continue"),
    phaseRunId: latestPhaseRun.phaseRunId
  };
}

function runningWaitDecision(
  projectRoot: string,
  latestPhaseRun: PhaseRunRecord
): AutopilotContinuationDecision {
  const roleLabel = formatRoleLabel(latestPhaseRun.currentRole);
  const roleDetail = roleLabel ? `当前正在${roleLabel}` : "当前自动链正在运行";

  return {
    action: "wait",
    headline: "当前自动链仍在运行",
    detail: `${roleDetail}，先等待这一轮结果写回 committed truth，不要重复启动新的 phase run。`,
    recommendedCommand: buildAutopilotCliCommand(projectRoot, "status"),
    phaseRunId: latestPhaseRun.phaseRunId
  };
}

function failedOrCancelledDecision(
  projectRoot: string,
  latestPhaseRun: PhaseRunRecord
): AutopilotContinuationDecision {
  return {
    action: "reset-needed",
    headline:
      latestPhaseRun.status === "cancelled"
        ? "最近一轮自动链已取消"
        : "最近一轮自动链未处于可继续状态",
    detail: `最近一轮 phase run（${latestPhaseRun.phaseRunId}）状态为 ${latestPhaseRun.status}。请先检查当前 committed truth 与最近 artifact，再决定是否重置 phase 或人工接管。`,
    recommendedCommand: buildAutopilotCliCommand(projectRoot, "status"),
    phaseRunId: latestPhaseRun.phaseRunId
  };
}

export function decideAutopilotContinuation(input: {
  projectRoot: string;
  bootstrap: BootstrapProjectStateResult;
  latestPhaseRun: PhaseRunRecord | null;
  latestPhasePause: PhaseRunPause | null;
}): AutopilotContinuationDecision {
  if (input.bootstrap.kind === "paused") {
    return bootstrapBlockedDecision(input.projectRoot, input.bootstrap);
  }

  if (input.bootstrap.state.acceptanceState.finalState === "accepted") {
    return acceptedResetDecision(
      input.projectRoot,
      input.bootstrap.state,
      input.latestPhaseRun
    );
  }

  if (!input.latestPhaseRun) {
    return {
      action: "start",
      headline: "当前可以启动新的自动链",
      detail: "Bootstrap 已完成，当前还没有 phase run 记录，可以从当前 committed phase 开始一轮新的 autopilot。",
      recommendedCommand: buildAutopilotCliCommand(input.projectRoot, "continue"),
      phaseRunId: null
    };
  }

  switch (input.latestPhaseRun.status) {
    case "paused":
      return pausedResumeDecision(
        input.projectRoot,
        input.latestPhaseRun,
        input.latestPhasePause
      );
    case "running":
      return runningWaitDecision(input.projectRoot, input.latestPhaseRun);
    case "accepted":
      if (input.bootstrap.state.acceptanceState.finalState === "accepted") {
        return acceptedResetDecision(
          input.projectRoot,
          input.bootstrap.state,
          input.latestPhaseRun
        );
      }

      return {
        action: "start",
        headline: "上一轮自动链已结束，可以开始当前新 slice",
        detail: `最近一轮 phase run（${input.latestPhaseRun.phaseRunId}）已经 accepted；当前 committed truth 已不再停在 accepted，所以可以从新的 current phase 启动下一轮 autopilot。`,
        recommendedCommand: buildAutopilotCliCommand(input.projectRoot, "continue"),
        phaseRunId: input.latestPhaseRun.phaseRunId
      };
    case "failed":
    case "cancelled":
      return failedOrCancelledDecision(input.projectRoot, input.latestPhaseRun);
  }
}
