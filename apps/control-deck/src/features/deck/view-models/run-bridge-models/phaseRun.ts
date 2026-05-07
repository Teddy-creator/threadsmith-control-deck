import type { SupervisorState } from "@threadsmith/runtime";
import { formatEventTime } from "../../../events/formatters";
import { compactText, type Tone } from "../shared";
import type { LatestPhaseRunModel } from "./types";

function pickPhaseRunTone(
  status: SupervisorState["latestPhaseRunSummary"]["status"]
): Tone {
  switch (status) {
    case "running":
      return "amber";
    case "paused":
      return "red";
    case "accepted":
      return "green";
    case "failed":
      return "red";
    case "cancelled":
      return "zinc";
    default:
      return "zinc";
  }
}

export function buildLatestPhaseRunModel(
  supervisorState: SupervisorState | null
): LatestPhaseRunModel {
  const summary = supervisorState?.latestPhaseRunSummary ?? null;
  const pause = supervisorState?.latestPhasePauseSummary ?? null;
  const phaseRun = supervisorState?.latestPhaseRun ?? null;

  if (!summary?.exists) {
    return {
      exists: false,
      headline: "当前还没有自动链路",
      summary: "Autopilot 还没有为这个项目写入 automatic chain truth。",
      statusLabel: "暂无记录",
      operatorStateLabel: "当前无需介入",
      operatorHeadline: "等待第一次自动链路",
      operatorDetail: "Autopilot 还没有为这个项目写入 automatic chain truth。",
      tone: "zinc",
      phaseRunId: null,
      roleLabel: null,
      sliceLabel: null,
      repairLabel: null,
      latestSuccessfulRoleLabel: null,
      timingLine: "等待第一次 phase run",
      lockedPhasePath: null,
      workspacePath: null,
      resumeHint: null,
      pauseHeadline: null,
      pauseDetail: null,
      pauseRequirements: []
    };
  }

  const timingParts = summary.startedAt
    ? [`开始 ${formatEventTime(summary.startedAt)}`]
    : [];

  if (summary.finishedAt) {
    timingParts.push(`结束 ${formatEventTime(summary.finishedAt)}`);
  } else if (summary.status === "running") {
    timingParts.push("尚未结束");
  } else if (pause?.createdAt) {
    timingParts.push(`暂停 ${formatEventTime(pause.createdAt)}`);
  }

  return {
    exists: true,
    headline: summary.headline,
    summary: compactText(summary.detail, 140),
    statusLabel: summary.statusLabel,
    operatorStateLabel: summary.operatorStateLabel,
    operatorHeadline: summary.operatorHeadline,
    operatorDetail: compactText(summary.operatorDetail, 140),
    tone: pickPhaseRunTone(summary.status),
    phaseRunId: summary.phaseRunId,
    roleLabel: summary.currentRoleLabel,
    sliceLabel: summary.currentSliceLabel,
    repairLabel: summary.repairLabel,
    latestSuccessfulRoleLabel: summary.latestSuccessfulRoleLabel,
    timingLine: timingParts.length > 0 ? timingParts.join(" · ") : "时间线未记录",
    lockedPhasePath: phaseRun?.lockedPhaseSnapshotRef ?? null,
    workspacePath: summary.workspacePath,
    resumeHint: pause?.recommendedPrompt ?? summary.resumeHint,
    pauseHeadline: pause?.summary ?? summary.pauseReason,
    pauseDetail: pause?.detail ?? null,
    pauseRequirements: pause?.resumeRequirements ?? []
  };
}
