import type { SupervisorState } from "@threadsmith/runtime";
import type { Tone } from "../../homepage-overview";
import { formatRole } from "../../../display/labels";
import {
  formatContextRecoveryAction,
  formatPacketStatus,
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
  const confidence = supervisorState.truthConfidence;
  const selectedRole = recovery.selectedRole ? formatRole(recovery.selectedRole) : "当前角色";

  return {
    visible: true,
    label: confidence.label,
    tone: confidence.tone,
    summary: confidence.headline,
    signals: [
      {
        label: "首要原因",
        value: confidence.primaryReason.label,
        tone: confidence.tone
      },
      {
        label: selectedRole,
        value: formatPacketStatus(recovery.rolePacketStatus),
        tone: pickPacketTone(recovery.rolePacketStatus)
      },
      {
        label: "安全动作",
        value: formatContextRecoveryAction(confidence.safeAction),
        tone: confidence.tone
      }
    ]
  };
}
