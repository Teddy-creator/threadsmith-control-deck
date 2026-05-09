import {
  roleContextPacketSchema,
  type ContextPacket,
  type PhaseOwner,
  type RoleContextPacket,
  type RoleContextPacketPayload
} from "@threadsmith/domain";

const ROLE_ORDER: PhaseOwner[] = [
  "planner",
  "executor",
  "reviewer",
  "verifier",
  "closeout",
  "hygiene"
];

const ALL_SECTIONS = [
  "project",
  "goal",
  "currentPhase",
  "scope",
  "acceptance",
  "nextStep",
  "risks",
  "relevantFiles",
  "recentDiff",
  "evidence",
  "budget",
  "sourceRefs"
];

interface RoleDefinition {
  focus: string;
  purpose: string;
  sections: Array<keyof RoleContextPacketPayload>;
}

const ROLE_DEFINITIONS: Record<PhaseOwner, RoleDefinition> = {
  planner: {
    focus: "Choose and tighten the next slice without reopening the whole project.",
    purpose: "Give the planner enough project, phase, scope, risk, and next-step context to make a narrow decision.",
    sections: ["project", "goal", "currentPhase", "scope", "nextStep", "risks", "budget", "sourceRefs"]
  },
  executor: {
    focus: "Implement the current slice within scope and constraints.",
    purpose: "Give the executor implementation boundaries, relevant files, diff context, and the immediate next step.",
    sections: ["project", "currentPhase", "scope", "nextStep", "risks", "relevantFiles", "recentDiff", "budget", "sourceRefs"]
  },
  reviewer: {
    focus: "Review whether the implementation matches requirements without self-verifying executor work.",
    purpose: "Give the reviewer the claim, scope, diff, risks, and files needed to find regressions or blockers.",
    sections: ["project", "currentPhase", "scope", "acceptance", "risks", "relevantFiles", "recentDiff", "budget", "sourceRefs"]
  },
  verifier: {
    focus: "Prove or reject the acceptance claim with command-backed evidence.",
    purpose: "Give the verifier acceptance criteria, verification commands, evidence summaries, and artifact refs.",
    sections: ["project", "currentPhase", "acceptance", "nextStep", "evidence", "budget", "sourceRefs"]
  },
  closeout: {
    focus: "Stabilize the accepted slice and preserve durable handoff truth.",
    purpose: "Give closeout cleanup, residual risk, evidence, and source references without implementation noise.",
    sections: ["project", "currentPhase", "acceptance", "risks", "evidence", "budget", "sourceRefs"]
  },
  hygiene: {
    focus: "Detect stale truth, contradictions, oversized context, or handoff needs before the next phase.",
    purpose: "Give hygiene freshness, blocker, budget, source, and evidence signals for re-anchoring work.",
    sections: ["project", "currentPhase", "acceptance", "nextStep", "risks", "recentDiff", "evidence", "budget", "sourceRefs"]
  }
};

export interface DeriveRoleContextPacketOptions {
  generatedAt?: string;
  packetId?: string;
}

function rolePacketId(parentPacketId: string, role: PhaseOwner) {
  return `${parentPacketId}-${role}`;
}

function pickPayload(
  contextPacket: ContextPacket,
  sections: Array<keyof RoleContextPacketPayload>
) {
  const payload: RoleContextPacketPayload = {};

  for (const section of sections) {
    payload[section] = contextPacket[section] as never;
  }

  return payload;
}

export function deriveRoleContextPacket(
  contextPacket: ContextPacket,
  role: PhaseOwner,
  options: DeriveRoleContextPacketOptions = {}
): RoleContextPacket {
  const definition = ROLE_DEFINITIONS[role];
  const includedSections = definition.sections.map(String);
  const omittedSections = ALL_SECTIONS.filter(
    (section) => !includedSections.includes(section)
  );

  return roleContextPacketSchema.parse({
    packetId: options.packetId ?? rolePacketId(contextPacket.packetId, role),
    parentPacketId: contextPacket.packetId,
    generatedAt: options.generatedAt ?? contextPacket.generatedAt,
    role,
    focus: definition.focus,
    purpose: definition.purpose,
    includedSections,
    omittedSections,
    payload: pickPayload(contextPacket, definition.sections)
  });
}

export function deriveRoleContextPackets(
  contextPacket: ContextPacket,
  options: DeriveRoleContextPacketOptions = {}
) {
  return ROLE_ORDER.map((role) =>
    deriveRoleContextPacket(contextPacket, role, options)
  );
}
