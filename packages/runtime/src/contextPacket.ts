import {
  contextPacketSchema,
  type ContextPacket,
  type ContextPacketEvidence,
  type ContextPacketRecentDiff,
  type ContextPacketRelevantFile,
  type ContextPacketRisk,
  type ProjectState,
  type VerificationCommandResult
} from "@threadsmith/domain";

export interface BuildContextPacketOptions {
  generatedAt?: string;
  packetId?: string;
  recentDiff?: Partial<ContextPacketRecentDiff>;
  evidence?: Partial<ContextPacketEvidence>;
  relevantFiles?: ContextPacketRelevantFile[];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function inferRecommendedRole(state: ProjectState) {
  if (state.currentPhase.blockedBy.length > 0) {
    return "hygiene" as const;
  }

  if (state.acceptanceState.verificationStatus === "failed") {
    return "executor" as const;
  }

  if (state.acceptanceState.reviewStatus === "review-blocked") {
    return "executor" as const;
  }

  if (state.acceptanceState.closeoutStatus === "pending") {
    return "closeout" as const;
  }

  if (state.acceptanceState.reviewStatus === "ready-for-verification") {
    return "verifier" as const;
  }

  if (state.acceptanceState.implementationStatus === "ready-for-review") {
    return "reviewer" as const;
  }

  return state.currentPhase.activeOwners[0] ?? "planner";
}

function buildPacketId(state: ProjectState, generatedAt: string) {
  const phaseSlug = slugify(state.currentPhase.phaseName) || "current-phase";
  const timestampSlug = generatedAt.replace(/[^0-9TZ]/g, "");
  return `ctx-${phaseSlug}-${timestampSlug}`;
}

function buildNextStep(state: ProjectState) {
  const recommendedRole = inferRecommendedRole(state);

  if (state.currentPhase.blockedBy.length > 0) {
    return {
      label: "先解除当前 blocker",
      rationale: state.currentPhase.blockedBy[0] ?? "当前 phase 已被 blocker 卡住。",
      recommendedRole,
      actionId: "run-hygiene"
    };
  }

  if (state.acceptanceState.verificationStatus === "failed") {
    return {
      label: "修复 verification 缺口",
      rationale: "当前 verification 已失败，下一步应该回到实现或修复线。",
      recommendedRole,
      actionId: "advance-phase"
    };
  }

  if (state.acceptanceState.reviewStatus === "review-blocked") {
    return {
      label: "修复 review blocker",
      rationale: "当前 review 已阻塞，不能直接进入 verification。",
      recommendedRole,
      actionId: "advance-phase"
    };
  }

  if (state.acceptanceState.closeoutStatus === "pending") {
    return {
      label: "完成 closeout",
      rationale: "验证后仍需清理、记录风险并完成收尾。",
      recommendedRole,
      actionId: "advance-phase"
    };
  }

  if (state.acceptanceState.reviewStatus === "ready-for-verification") {
    return {
      label: "运行 verification",
      rationale: "实现已完成 review，下一步需要证据支持当前 claim。",
      recommendedRole,
      actionId: "run-verification"
    };
  }

  if (state.acceptanceState.implementationStatus === "ready-for-review") {
    return {
      label: "进入 review",
      rationale: "实现已准备好，不能由 executor 自行验收。",
      recommendedRole,
      actionId: "advance-phase"
    };
  }

  return {
    label: `推进 ${state.currentPhase.phaseName}`,
    rationale: state.currentPhase.phaseGoal,
    recommendedRole,
    actionId: "advance-phase"
  };
}

function buildRisks(state: ProjectState): ContextPacketRisk[] {
  const projectRisks = state.projectStatus.topRisks.map((label) => ({
    label,
    source: "project" as const
  }));
  const phaseRisks = state.currentPhase.blockedBy.map((label) => ({
    label,
    source: "phase" as const
  }));
  const acceptanceRisks = state.acceptanceState.knownGaps.map((label) => ({
    label,
    source: "acceptance" as const
  }));

  return [...projectRisks, ...phaseRisks, ...acceptanceRisks].slice(0, 8);
}

function buildEvidence(
  state: ProjectState,
  options: BuildContextPacketOptions
): ContextPacketEvidence {
  const commands: VerificationCommandResult[] =
    options.evidence?.commands
    ?? state.currentPhase.verificationForThisPhase.map((command) => ({
      command,
      status: "pending" as const,
      summary: "尚未写入 evidence summary。"
    }));

  return {
    status: options.evidence?.status ?? "missing",
    summary:
      options.evidence?.summary ??
      "当前 packet 只记录验证计划；尚未接入 evidence summary artifact。",
    commands,
    artifactRefs: options.evidence?.artifactRefs ?? []
  };
}

function buildRecentDiff(
  options: BuildContextPacketOptions
): ContextPacketRecentDiff {
  return {
    status: options.recentDiff?.status ?? "unknown",
    summary:
      options.recentDiff?.summary ??
      "Context Packet v1 尚未接入 git diff 摘要；后续 Repo Map / Hygiene slice 会补齐。",
    changedFiles: options.recentDiff?.changedFiles ?? [],
    command: options.recentDiff?.command ?? null
  };
}

export function buildContextPacket(
  state: ProjectState,
  options: BuildContextPacketOptions = {}
): ContextPacket {
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  return contextPacketSchema.parse({
    packetId: options.packetId ?? buildPacketId(state, generatedAt),
    generatedAt,
    project: {
      label: state.projectStatus.projectLabel,
      track: state.projectStatus.currentTrack,
      overallState: state.projectStatus.overallState,
      focus: state.projectStatus.currentFocus,
      summary: state.projectStatus.projectStatusSummary
    },
    goal: {
      projectGoal: state.projectBrief.projectGoal,
      successFrame: state.projectBrief.successFrame,
      priorityOrder: state.projectBrief.priorityOrder
    },
    currentPhase: {
      name: state.currentPhase.phaseName,
      goal: state.currentPhase.phaseGoal,
      deliverable: state.currentPhase.deliverable,
      stopCondition: state.currentPhase.stopCondition,
      activeOwners: state.currentPhase.activeOwners
    },
    scope: {
      inScope: state.currentPhase.inScope,
      outOfScope: state.currentPhase.outOfScope,
      constraints: state.projectBrief.keyConstraints,
      nonGoals: state.projectBrief.nonGoals
    },
    acceptance: {
      claim: state.acceptanceState.currentClaim,
      finalState: state.acceptanceState.finalState,
      implementationStatus: state.acceptanceState.implementationStatus,
      reviewStatus: state.acceptanceState.reviewStatus,
      verificationStatus: state.acceptanceState.verificationStatus,
      closeoutStatus: state.acceptanceState.closeoutStatus,
      checklist: state.acceptanceState.doneWhenChecklist,
      knownGaps: state.acceptanceState.knownGaps
    },
    nextStep: buildNextStep(state),
    risks: buildRisks(state),
    relevantFiles: options.relevantFiles ?? [],
    recentDiff: buildRecentDiff(options),
    evidence: buildEvidence(state, options),
    sourceRefs: [
      {
        kind: "state",
        path: ".threadsmith/project-brief.json",
        title: "Project Brief"
      },
      {
        kind: "state",
        path: ".threadsmith/current-phase.json",
        title: "Current Phase"
      },
      {
        kind: "state",
        path: ".threadsmith/acceptance-state.json",
        title: "Acceptance State"
      }
    ]
  });
}
