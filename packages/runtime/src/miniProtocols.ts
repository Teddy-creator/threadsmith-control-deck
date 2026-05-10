import {
  miniProtocolInstructionSchema,
  type MiniProtocolContract,
  type MiniProtocolId,
  type MiniProtocolInstruction,
  type PhaseOwner,
  type SkillRouteDecision
} from "@threadsmith/domain";

const BUILT_IN_PROTOCOLS: Record<MiniProtocolId, MiniProtocolContract> = {
  brief: {
    id: "brief",
    label: "Brief",
    owningRole: "planner",
    purpose: "Turn a fuzzy request into a narrow task contract.",
    requiredInputs: ["userGoal", "projectBrief", "currentPhase"],
    requiredOutputs: ["taskBrief", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: false,
    stopReasons: ["needs-user-decision", "ready-for-executor"],
    continuationHint: "Route to plan or executor only after scope, non-goals, done-when, and verification are explicit.",
    guardrails: [
      "Do not turn casual discussion into committed truth.",
      "Stop for user decision when scope or non-goals are ambiguous."
    ]
  },
  plan: {
    id: "plan",
    label: "Plan",
    owningRole: "planner",
    purpose: "Turn an accepted brief or current phase into bounded implementation steps.",
    requiredInputs: ["projectBrief", "currentPhase", "acceptanceState", "repoMap"],
    requiredOutputs: ["implementationPlan", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: false,
    stopReasons: ["needs-user-decision", "ready-for-executor", "blocked"],
    continuationHint: "Route to executor when the plan has a clear stop condition and verification commands.",
    guardrails: [
      "Keep the plan phase-bound instead of reopening the whole project.",
      "Do not mark implementation, review, or verification as complete."
    ]
  },
  debug: {
    id: "debug",
    label: "Debug",
    owningRole: "executor",
    purpose: "Investigate a failure before patching.",
    requiredInputs: ["failureSymptom", "recentDiff", "evidenceSummary", "repoMap"],
    requiredOutputs: ["rootCauseHypothesis", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: true,
    stopReasons: ["ready-for-executor", "blocked", "recover-before-continue"],
    continuationHint: "Route to executor repair only after a reproduction path or localized cause exists.",
    guardrails: [
      "Do not guess at fixes before reproducing or localizing the failure.",
      "Preserve contradictory evidence instead of smoothing it over."
    ]
  },
  review: {
    id: "review",
    label: "Review",
    owningRole: "reviewer",
    purpose: "Critique whether implementation matches the phase contract without self-certifying verification.",
    requiredInputs: ["currentPhase", "acceptanceState", "recentDiff", "repoMap"],
    requiredOutputs: ["reviewFindings", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: false,
    stopReasons: ["ready-for-verification", "blocked"],
    continuationHint: "Route to verifier only when review has no blocking findings.",
    guardrails: [
      "Findings come before summaries.",
      "Do not convert review confidence into verification pass."
    ]
  },
  verify: {
    id: "verify",
    label: "Verify",
    owningRole: "verifier",
    purpose: "Prove or reject the acceptance claim with command-backed evidence.",
    requiredInputs: ["currentPhase", "acceptanceState", "evidenceSummary", "verificationCommands"],
    requiredOutputs: ["verificationResult", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: true,
    stopReasons: ["accepted-with-closeout-pending", "blocked"],
    continuationHint: "Route to closeout when required checks pass; route to recover or executor when evidence fails.",
    guardrails: [
      "Never convert missing evidence into a pass.",
      "Record exact commands or unavailable-check reasons."
    ]
  },
  closeout: {
    id: "closeout",
    label: "Closeout",
    owningRole: "closeout",
    purpose: "Clean up the accepted slice and preserve durable continuation truth.",
    requiredInputs: ["acceptanceState", "evidenceSummary", "recentDiff", "contextPacket"],
    requiredOutputs: ["closeoutSummary", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: true,
    stopReasons: ["accepted", "handoff-created", "blocked"],
    continuationHint: "Record residual risks and the next planned slice after verification evidence is present.",
    guardrails: [
      "Do not introduce new product scope during closeout.",
      "Do not hide residual risks or skipped checks."
    ]
  },
  handoff: {
    id: "handoff",
    label: "Handoff",
    owningRole: "hygiene",
    purpose: "Create a compact continuation packet from committed truth and latest evidence.",
    requiredInputs: ["projectBrief", "currentPhase", "acceptanceState", "contextPacket", "evidenceSummary"],
    requiredOutputs: ["handoffSummary", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: false,
    stopReasons: ["handoff-created", "needs-user-decision"],
    continuationHint: "Use the handoff as the next session's source of truth instead of replaying a long transcript.",
    guardrails: [
      "Keep only decision-useful context.",
      "Do not embed large images, raw logs, or full historical transcripts."
    ]
  },
  recover: {
    id: "recover",
    label: "Recover",
    owningRole: "hygiene",
    purpose: "Re-anchor stale, interrupted, or contradictory work before continuing.",
    requiredInputs: ["projectBrief", "currentPhase", "acceptanceState", "activeWork", "recentDiff", "evidenceSummary"],
    requiredOutputs: ["recoveryDecision", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: true,
    stopReasons: ["recover-before-continue", "ready-for-executor", "needs-user-decision", "blocked"],
    continuationHint: "Continue only after stale facts, contradictions, and safe next action are explicit.",
    guardrails: [
      "Committed truth outranks chat memory.",
      "Do not continue normal execution from stale or contradictory state."
    ]
  },
  research: {
    id: "research",
    label: "Research",
    owningRole: "planner",
    purpose: "Ground a design decision in external sources and map takeaways back to Threadsmith objects.",
    requiredInputs: ["researchQuestion", "projectBrief", "currentPhase"],
    requiredOutputs: ["researchMapping", "truthWritebackProposal", "nextRoleHint"],
    evidenceRequired: true,
    stopReasons: ["ready-for-executor", "needs-user-decision", "blocked"],
    continuationHint: "Route to plan only after source takeaways are mapped to schema, protocol, or tests.",
    guardrails: [
      "Use primary sources where possible.",
      "Separate source claims from Threadsmith-specific inferences."
    ]
  }
};

export function listBuiltInMiniProtocols(): MiniProtocolContract[] {
  return Object.values(BUILT_IN_PROTOCOLS);
}

export function getBuiltInMiniProtocol(
  protocolId: MiniProtocolId
): MiniProtocolContract {
  return BUILT_IN_PROTOCOLS[protocolId];
}

export interface BuildMiniProtocolInstructionInput {
  route: SkillRouteDecision;
  role?: PhaseOwner;
  objective?: string;
}

function stopConditionFor(protocol: MiniProtocolContract) {
  return `Stop when one of these reasons is reached: ${protocol.stopReasons.join(", ")}.`;
}

export function buildMiniProtocolInstruction(
  input: BuildMiniProtocolInstructionInput
): MiniProtocolInstruction {
  const protocol = getBuiltInMiniProtocol(input.route.selectedProtocol);

  return miniProtocolInstructionSchema.parse({
    protocol,
    role: input.role ?? input.route.role,
    objective: input.objective ?? protocol.purpose,
    inputChecklist: protocol.requiredInputs,
    outputChecklist: protocol.requiredOutputs,
    guardrails: protocol.guardrails,
    stopCondition: stopConditionFor(protocol),
    continuationHint: protocol.continuationHint,
    route: {
      source: input.route.source,
      selectedAdapterId: input.route.selectedAdapterId,
      availability: input.route.availability,
      reason: input.route.reason,
      safetyWarnings: input.route.safetyWarnings
    }
  });
}
