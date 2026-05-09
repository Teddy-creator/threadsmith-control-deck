import type { SupervisorState } from "@threadsmith/runtime";
import type { Tone } from "../../homepage-overview";
import { formatRole } from "../../../display/labels";
import {
  formatContextRecoveryAction,
  formatContextRecoveryStatus,
  formatPacketStatus,
  pickContextTone,
  pickPacketTone
} from "../contextRecovery";

export interface HomepageContextSignal {
  label: string;
  value: string;
  tone: Tone;
}

export interface HomepageContextModel {
  visible: boolean;
  label: string;
  tone: Tone;
  summary: string;
  signals: HomepageContextSignal[];
}

export function buildHomepageContextModel(
  supervisorState: SupervisorState | null
): HomepageContextModel {
  if (!supervisorState) {
    return {
      visible: false,
      label: "未连接",
      tone: "zinc",
      summary: "连接真实项目后，这里会展示 Context Packet 是否可继续使用。",
      signals: []
    };
  }

  const recovery = supervisorState.contextRecovery;
  const selectedRole = recovery.selectedRole ? formatRole(recovery.selectedRole) : "当前角色";

  return {
    visible: true,
    label: formatContextRecoveryStatus(recovery.status),
    tone: pickContextTone(recovery.status),
    summary: recovery.headline,
    signals: [
      {
        label: "主 packet",
        value: formatPacketStatus(recovery.currentPacketStatus),
        tone: pickPacketTone(recovery.currentPacketStatus)
      },
      {
        label: selectedRole,
        value: formatPacketStatus(recovery.rolePacketStatus),
        tone: pickPacketTone(recovery.rolePacketStatus)
      },
      {
        label: "建议动作",
        value: formatContextRecoveryAction(recovery.action),
        tone: recovery.status === "fresh" ? "green" : pickContextTone(recovery.status)
      }
    ]
  };
}
