import type { ContextRecoverySignal } from "@threadsmith/runtime";
import type { Tone } from "../homepage-overview";

export function formatContextRecoveryStatus(status: ContextRecoverySignal["status"]) {
  switch (status) {
    case "fresh":
      return "最新";
    case "watch":
      return "关注";
    case "recover":
      return "需恢复";
    default:
      return status;
  }
}

export function formatContextRecoveryAction(action: ContextRecoverySignal["action"]) {
  switch (action) {
    case "continue":
      return "继续";
    case "sync-context":
      return "同步";
    case "run-hygiene":
      return "整理";
    case "wait-for-run":
      return "等待";
    case "repair-run":
      return "修复";
    case "resume-phase-run":
      return "恢复";
    case "create-handoff":
      return "交接";
    case "phase-reset":
      return "重置";
    default:
      return action;
  }
}

export function formatContextRecoveryActionLong(action: ContextRecoverySignal["action"]) {
  switch (action) {
    case "continue":
      return "继续推进";
    case "sync-context":
      return "同步 context";
    case "run-hygiene":
      return "运行 hygiene";
    case "wait-for-run":
      return "等待回流";
    case "repair-run":
      return "修复运行";
    case "resume-phase-run":
      return "恢复链路";
    case "create-handoff":
      return "创建 handoff";
    case "phase-reset":
      return "重置 phase";
    default:
      return action;
  }
}

export function formatPacketStatus(
  status: ContextRecoverySignal["currentPacketStatus"] | ContextRecoverySignal["rolePacketStatus"]
) {
  switch (status) {
    case "fresh":
      return "最新";
    case "stale":
      return "过期";
    case "missing":
      return "缺失";
    case "not-required":
      return "无需";
    default:
      return status;
  }
}

export function pickContextTone(status: ContextRecoverySignal["status"]): Tone {
  switch (status) {
    case "fresh":
      return "green";
    case "watch":
      return "amber";
    case "recover":
      return "red";
    default:
      return "zinc";
  }
}

export function pickPacketTone(
  status: ContextRecoverySignal["currentPacketStatus"] | ContextRecoverySignal["rolePacketStatus"]
): Tone {
  switch (status) {
    case "fresh":
    case "not-required":
      return "green";
    case "stale":
      return "red";
    case "missing":
      return "amber";
    default:
      return "zinc";
  }
}
