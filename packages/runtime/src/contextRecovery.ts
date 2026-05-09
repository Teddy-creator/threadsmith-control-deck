import type {
  AgentRunRecord,
  ContextPacket,
  PhaseOwner,
  ProjectState,
  RoleContextPacket
} from "@threadsmith/domain";
import {
  createMissingPhasePauseSummary,
  createMissingPhaseRunSummary,
  type PhasePauseSummary,
  type PhaseRunSummary
} from "./phaseRun.ts";

export type ContextRecoveryStatus = "fresh" | "watch" | "recover";
export type ContextRecoveryAction =
  | "continue"
  | "sync-context"
  | "run-hygiene"
  | "wait-for-run"
  | "repair-run"
  | "resume-phase-run"
  | "create-handoff"
  | "phase-reset";

export interface ContextRecoverySignal {
  status: ContextRecoveryStatus;
  action: ContextRecoveryAction;
  headline: string;
  detail: string;
  reasons: string[];
  selectedRole: PhaseOwner | null;
  currentPacketStatus: "fresh" | "stale" | "missing";
  rolePacketStatus: "fresh" | "stale" | "missing" | "not-required";
}

export interface DeriveContextRecoveryOptions {
  currentPacket?: ContextPacket | null;
  rolePackets?: RoleContextPacket[];
  contextArtifactsLoaded?: boolean;
  contextArtifactProblem?: string | null;
  selectedRole?: PhaseOwner | null;
  latestRun?: AgentRunRecord | null;
  latestPhaseRun?: PhaseRunSummary;
  latestPhasePause?: PhasePauseSummary;
}

const ALL_ROLES: PhaseOwner[] = [
  "planner",
  "executor",
  "reviewer",
  "verifier",
  "closeout",
  "hygiene"
];

function signal(
  input: Omit<ContextRecoverySignal, "reasons"> & { reasons?: string[] }
): ContextRecoverySignal {
  return {
    ...input,
    reasons: input.reasons ?? []
  };
}

function inferSelectedRole(state: ProjectState): PhaseOwner {
  if (state.currentPhase.blockedBy.length > 0) {
    return "hygiene";
  }

  if (
    state.acceptanceState.verificationStatus === "failed" ||
    state.acceptanceState.reviewStatus === "review-blocked"
  ) {
    return "executor";
  }

  if (state.acceptanceState.finalState === "accepted") {
    return "hygiene";
  }

  if (
    state.acceptanceState.closeoutStatus === "pending" ||
    state.acceptanceState.finalState === "accepted-with-closeout-pending"
  ) {
    return "closeout";
  }

  if (state.acceptanceState.reviewStatus === "ready-for-verification") {
    return "verifier";
  }

  if (state.acceptanceState.implementationStatus === "ready-for-review") {
    return "reviewer";
  }

  return state.currentPhase.activeOwners[0] ?? "planner";
}

function packetMatchesState(packet: ContextPacket, state: ProjectState) {
  return (
    packet.currentPhase.name === state.currentPhase.phaseName &&
    packet.acceptance.claim === state.acceptanceState.currentClaim &&
    packet.acceptance.finalState === state.acceptanceState.finalState
  );
}

function currentPacketStatus(
  packet: ContextPacket | null | undefined,
  state: ProjectState,
  artifactsLoaded: boolean
): ContextRecoverySignal["currentPacketStatus"] {
  if (!packet) {
    return artifactsLoaded ? "missing" : "fresh";
  }

  return packetMatchesState(packet, state) ? "fresh" : "stale";
}

function rolePacketStatus(
  packets: RoleContextPacket[],
  role: PhaseOwner | null,
  packet: ContextPacket | null | undefined,
  state: ProjectState,
  artifactsLoaded: boolean
): ContextRecoverySignal["rolePacketStatus"] {
  if (!role) {
    return "not-required";
  }

  if (!ALL_ROLES.includes(role)) {
    return "not-required";
  }

  const rolePacket = packets.find((candidate) => candidate.role === role);
  if (!rolePacket) {
    return artifactsLoaded ? "missing" : "fresh";
  }

  if (!packet || !packetMatchesState(packet, state)) {
    return "stale";
  }

  if (rolePacket.parentPacketId !== packet.packetId) {
    return "stale";
  }

  const phaseName = rolePacket.payload.currentPhase?.name;
  const claim = rolePacket.payload.acceptance?.claim;
  const finalState = rolePacket.payload.acceptance?.finalState;

  if (phaseName && phaseName !== state.currentPhase.phaseName) {
    return "stale";
  }

  if (claim && claim !== state.acceptanceState.currentClaim) {
    return "stale";
  }

  if (finalState && finalState !== state.acceptanceState.finalState) {
    return "stale";
  }

  return "fresh";
}

export function deriveContextRecovery(
  state: ProjectState,
  options: DeriveContextRecoveryOptions = {}
): ContextRecoverySignal {
  const latestPhaseRun = options.latestPhaseRun ?? createMissingPhaseRunSummary();
  const latestPhasePause =
    options.latestPhasePause ?? createMissingPhasePauseSummary();
  const selectedRole = options.selectedRole ?? inferSelectedRole(state);
  const artifactsLoaded = options.contextArtifactsLoaded ?? false;
  const currentStatus = currentPacketStatus(
    options.currentPacket,
    state,
    artifactsLoaded
  );
  const roleStatus = rolePacketStatus(
    options.rolePackets ?? [],
    selectedRole,
    options.currentPacket,
    state,
    artifactsLoaded
  );

  if (options.contextArtifactProblem) {
    return signal({
      status: "recover",
      action: "sync-context",
      headline: "Context artifact 不兼容",
      detail: options.contextArtifactProblem,
      reasons: ["context-artifact-invalid"],
      selectedRole,
      currentPacketStatus: "stale",
      rolePacketStatus: roleStatus
    });
  }

  if (latestPhaseRun.status === "paused") {
    return signal({
      status: "recover",
      action: "resume-phase-run",
      headline: "自动链路已暂停",
      detail:
        latestPhasePause.summary ??
        latestPhaseRun.pauseReason ??
        "先处理暂停原因，再继续当前自动链路。",
      reasons: ["phase-run-paused"],
      selectedRole,
      currentPacketStatus: currentStatus,
      rolePacketStatus: roleStatus
    });
  }

  if (latestPhaseRun.status === "running" || options.latestRun?.status === "running") {
    return signal({
      status: "watch",
      action: "wait-for-run",
      headline: "等待运行结果回流",
      detail: "当前已有运行中的自动链路或角色执行，先等待结果写回 committed truth。",
      reasons: ["run-in-progress"],
      selectedRole,
      currentPacketStatus: currentStatus,
      rolePacketStatus: roleStatus
    });
  }

  if (latestPhaseRun.status === "failed" || options.latestRun?.status === "failed") {
    return signal({
      status: "recover",
      action: "repair-run",
      headline: "最新运行失败",
      detail: "先把失败结果、当前 truth 和修复目标重新对齐，再继续执行。",
      reasons: ["latest-run-failed"],
      selectedRole,
      currentPacketStatus: currentStatus,
      rolePacketStatus: roleStatus
    });
  }

  if (currentStatus === "missing") {
    return signal({
      status: "recover",
      action: "sync-context",
      headline: "缺少 current context packet",
      detail: "当前项目没有可用的 Context Packet，继续前应先从 committed truth 重新生成 packet。",
      reasons: ["context-packet-missing"],
      selectedRole,
      currentPacketStatus: currentStatus,
      rolePacketStatus: roleStatus
    });
  }

  if (currentStatus === "stale") {
    return signal({
      status: "recover",
      action: "sync-context",
      headline: "Context Packet 已过期",
      detail: "当前 Context Packet 与 committed phase 或 acceptance 不一致，继续前应先同步 context。",
      reasons: ["context-packet-stale"],
      selectedRole,
      currentPacketStatus: currentStatus,
      rolePacketStatus: roleStatus
    });
  }

  if (roleStatus === "missing") {
    return signal({
      status: "watch",
      action: "sync-context",
      headline: "缺少当前角色 packet",
      detail: `当前 ${selectedRole} 角色没有 Role-specific Packet。可以继续使用主 packet，但最好先刷新角色 packet。`,
      reasons: ["role-packet-missing"],
      selectedRole,
      currentPacketStatus: currentStatus,
      rolePacketStatus: roleStatus
    });
  }

  if (roleStatus === "stale") {
    return signal({
      status: "recover",
      action: "run-hygiene",
      headline: "Role-specific Packet 已过期",
      detail: `当前 ${selectedRole} 角色 packet 与主 packet 或 committed truth 不一致，继续前先运行 hygiene 或同步 context。`,
      reasons: ["role-packet-stale"],
      selectedRole,
      currentPacketStatus: currentStatus,
      rolePacketStatus: roleStatus
    });
  }

  if (state.acceptanceState.finalState === "accepted") {
    return signal({
      status: "watch",
      action: "create-handoff",
      headline: "已接受状态需要继续点",
      detail: "当前 slice 已 accepted；继续开发前应保留 handoff 或准备 phase reset。",
      reasons: ["accepted-needs-continuation"],
      selectedRole,
      currentPacketStatus: currentStatus,
      rolePacketStatus: roleStatus
    });
  }

  return signal({
    status: "fresh",
    action: "continue",
    headline: "Context truth 可继续使用",
    detail: "当前 Context Packet 与角色 packet 和 committed truth 对齐，可以继续推进。",
    selectedRole,
    currentPacketStatus: currentStatus,
    rolePacketStatus: roleStatus
  });
}
