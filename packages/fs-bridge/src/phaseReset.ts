import {
  activeWorkSchema,
  alignProjectRoadmapToStatus,
  acceptanceStateSchema,
  currentPhaseSchema,
  deriveProjectOverallState,
  doneWhenItemSchema,
  projectOverallStateSchema,
  projectRoadmapSchema,
  projectSlicePointerSchema,
  projectStatusSchema,
  projectSupervisionStateSchema,
  type ActiveWork,
  type ActiveWorkItem,
  type CurrentPhase,
  type PhaseOwner,
  type ProjectRoadmap,
  type ProjectState,
  type ProjectSupervisionState
} from "@threadsmith/domain";
import { z } from "zod";
import { appendEvent, resolveMonotonicEventTimestamp } from "./events.ts";
import {
  loadProjectState,
  loadProjectSupervisionState,
  writeStateFragment
} from "./fileStore.ts";
import { STATE_FILES } from "./paths.ts";

const ROLE_ORDER: PhaseOwner[] = [
  "planner",
  "executor",
  "reviewer",
  "verifier",
  "closeout",
  "hygiene"
];

const phaseResetStartModeSchema = z.enum(["planning", "implementing"]);

const phaseResetDoneWhenSchema = doneWhenItemSchema.pick({
  id: true,
  label: true
});

const phaseResetRoleSummariesSchema = z.object({
  planner: z.string().min(1).optional(),
  executor: z.string().min(1).optional(),
  reviewer: z.string().min(1).optional(),
  verifier: z.string().min(1).optional(),
  closeout: z.string().min(1).optional(),
  hygiene: z.string().min(1).optional()
});

const phaseResetStatusDraftSchema = z.object({
  currentTrack: z.string().min(1),
  currentFocus: z.string().min(1),
  projectStatusSummary: z.string().min(1),
  latestAcceptedSlice: projectSlicePointerSchema.nullable().optional(),
  nextPlannedSlice: projectSlicePointerSchema.nullable().optional(),
  currentMilestoneId: z.string().min(1).nullable().optional(),
  nextMilestoneId: z.string().min(1).nullable().optional(),
  topRisks: z.array(z.string().min(1)).max(5).default([]),
  overallState: projectOverallStateSchema.optional()
});

const phaseResetRoadmapSchema = projectRoadmapSchema.safeExtend({
  updatedAt: z.string().nullable().optional()
});

export const phaseResetDraftSchema = z.object({
  currentPhase: currentPhaseSchema,
  currentClaim: z.string().min(1),
  doneWhen: z.array(phaseResetDoneWhenSchema).min(1),
  startMode: phaseResetStartModeSchema.default("planning"),
  projectStatus: phaseResetStatusDraftSchema,
  projectRoadmap: phaseResetRoadmapSchema,
  roleSummaries: phaseResetRoleSummariesSchema.optional(),
  supervisionSummary: z.string().min(1).optional(),
  recordedAt: z.string().min(1).optional()
});

export type PhaseResetStartMode = z.infer<typeof phaseResetStartModeSchema>;
export type PhaseResetDraft = z.infer<typeof phaseResetDraftSchema>;

function buildDoneWhenChecklist(draft: PhaseResetDraft) {
  return draft.doneWhen.map((item) => ({
    ...item,
    status: "unknown" as const
  }));
}

function defaultRoleSummary(
  role: PhaseOwner,
  startMode: PhaseResetStartMode,
  phase: CurrentPhase
) {
  if (startMode === "planning") {
    switch (role) {
      case "planner":
        return `根据 accepted continuation 为「${phase.phaseName}」收束当前 slice。`;
      case "executor":
        return "等待 planner 完成当前 phase 定义后开始执行。";
      case "reviewer":
        return "等待 executor 交付后再开始 review。";
      case "verifier":
        return "等待 review 放行后再开始 verification。";
      case "closeout":
        return "等待 verification 通过后再进入 closeout。";
      case "hygiene":
        return "已根据 accepted packet 重新锚定当前 phase reset。";
    }
  }

  switch (role) {
    case "planner":
      return `已定义「${phase.phaseName}」并交接给 executor。`;
    case "executor":
      return `正在推进当前 slice：${phase.phaseGoal}`;
    case "reviewer":
      return "等待 executor 完成当前 slice 后开始 review。";
    case "verifier":
      return "等待 review 放行后再开始 verification。";
    case "closeout":
      return "等待 verification 通过后再进入 closeout。";
    case "hygiene":
      return "已基于 accepted handoff 完成 phase reset 的重新锚定。";
  }
}

function roleStatusForStartMode(
  role: PhaseOwner,
  startMode: PhaseResetStartMode
): ActiveWorkItem["status"] {
  if (startMode === "planning") {
    switch (role) {
      case "planner":
        return "running";
      case "executor":
      case "reviewer":
        return "waiting";
      case "verifier":
      case "closeout":
        return "idle";
      case "hygiene":
        return "done";
    }
  }

  switch (role) {
    case "planner":
      return "done";
    case "executor":
      return "running";
    case "reviewer":
      return "waiting";
    case "verifier":
    case "closeout":
      return "idle";
    case "hygiene":
      return "done";
  }
}

function buildActiveWork(draft: PhaseResetDraft): ActiveWork {
  return activeWorkSchema.parse({
    items: ROLE_ORDER.map((role) => ({
      role,
      status: roleStatusForStartMode(role, draft.startMode),
      taskSummary:
        draft.roleSummaries?.[role] ??
        defaultRoleSummary(role, draft.startMode, draft.currentPhase),
      requiresUserDecision: false
    })),
    blockerSummary:
      draft.currentPhase.blockedBy.length > 0
        ? draft.currentPhase.blockedBy.join("；")
        : null
  });
}

function buildAcceptanceState(draft: PhaseResetDraft) {
  return acceptanceStateSchema.parse({
    currentClaim: draft.currentClaim,
    doneWhenChecklist: buildDoneWhenChecklist(draft),
    implementationStatus:
      draft.startMode === "implementing" ? "implementing" : "not-started",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: [...draft.currentPhase.blockedBy],
    finalState: "not-ready"
  });
}

function resolveProjectStatus(
  state: ProjectState,
  draft: PhaseResetDraft,
  createdAt: string
) {
  const acceptanceState = buildAcceptanceState(draft);
  const overallState =
    draft.projectStatus.overallState ??
    deriveProjectOverallState(acceptanceState, draft.currentPhase);

  return projectStatusSchema.parse({
    ...state.projectStatus,
    currentTrack: draft.projectStatus.currentTrack,
    overallState,
    currentFocus: draft.projectStatus.currentFocus,
    projectStatusSummary: draft.projectStatus.projectStatusSummary,
    latestAcceptedSlice:
      draft.projectStatus.latestAcceptedSlice === undefined
        ? state.projectStatus.latestAcceptedSlice
        : draft.projectStatus.latestAcceptedSlice,
    nextPlannedSlice:
      draft.projectStatus.nextPlannedSlice === undefined
        ? state.projectStatus.nextPlannedSlice
        : draft.projectStatus.nextPlannedSlice,
    currentMilestoneId:
      draft.projectStatus.currentMilestoneId === undefined
        ? state.projectStatus.currentMilestoneId ?? null
        : draft.projectStatus.currentMilestoneId,
    nextMilestoneId:
      draft.projectStatus.nextMilestoneId === undefined
        ? state.projectStatus.nextMilestoneId ?? null
        : draft.projectStatus.nextMilestoneId,
    topRisks: draft.projectStatus.topRisks,
    updatedAt: createdAt
  });
}

function resolveProjectRoadmap(
  draft: PhaseResetDraft,
  projectStatus: ReturnType<typeof resolveProjectStatus>,
  createdAt: string
): ProjectRoadmap {
  const roadmap = projectRoadmapSchema.parse({
    ...draft.projectRoadmap,
    updatedAt: createdAt
  });

  return alignProjectRoadmapToStatus(roadmap, projectStatus);
}

function defaultThreadLabel(role: PhaseOwner) {
  switch (role) {
    case "planner":
      return "Conductor";
    case "executor":
      return "Builder";
    case "reviewer":
      return "Critic";
    case "verifier":
      return "Verifier";
    case "closeout":
      return "Closeout";
    case "hygiene":
      return "Hygiene";
  }
}

function resolveProjectSupervision(args: {
  existing: ProjectSupervisionState;
  draft: PhaseResetDraft;
  activeWork: ActiveWork;
  createdAt: string;
}) {
  const lines = ROLE_ORDER.map((role) => {
    const existingLine = args.existing.lines.find((item) => item.role === role);
    const workItem = args.activeWork.items.find((item) => item.role === role);

    return {
      id: existingLine?.id ?? role,
      role,
      threadLabel: existingLine?.threadLabel ?? defaultThreadLabel(role),
      provider: existingLine?.provider ?? null,
      presence: existingLine?.presence ?? "logical",
      status: workItem?.status ?? "idle",
      taskSummary:
        workItem?.taskSummary ??
        draft.roleSummaries?.[role] ??
        defaultRoleSummary(role, args.draft.startMode, args.draft.currentPhase),
      requiresUserDecision: workItem?.requiresUserDecision ?? false,
      blockerSummary:
        workItem?.status === "blocked"
          ? args.activeWork.blockerSummary ?? workItem.taskSummary
          : null,
      latestEvidenceLabel: null,
      updatedAt: args.createdAt
    };
  });

  return projectSupervisionStateSchema.parse({
    mode: lines.length > 1 ? "multi-thread" : "single-thread",
    modeLabel: lines.length > 1 ? "多角色协作" : "单线推进",
    summary:
      args.draft.supervisionSummary ??
      (args.draft.startMode === "implementing"
        ? `当前 current phase 已重置为「${args.draft.currentPhase.phaseName}」，executor 正在推进实现。`
        : `当前 current phase 已重置为「${args.draft.currentPhase.phaseName}」，planner 正在收束当前 slice。`),
    lines,
    updatedAt: args.createdAt
  });
}

export async function applyPhaseReset(projectRoot: string, input: PhaseResetDraft) {
  const draft = phaseResetDraftSchema.parse(input);
  const state = await loadProjectState(projectRoot);
  const existingSupervision = await loadProjectSupervisionState(projectRoot, state);
  const createdAt = await resolveMonotonicEventTimestamp(
    projectRoot,
    draft.recordedAt
  );
  const acceptanceState = buildAcceptanceState(draft);
  const activeWork = buildActiveWork(draft);
  const projectStatus = resolveProjectStatus(state, draft, createdAt);
  const projectRoadmap = resolveProjectRoadmap(draft, projectStatus, createdAt);
  const projectSupervision = resolveProjectSupervision({
    existing: existingSupervision,
    draft,
    activeWork,
    createdAt
  });

  await writeStateFragment(projectRoot, STATE_FILES.currentPhase, draft.currentPhase);
  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, acceptanceState);
  await writeStateFragment(projectRoot, STATE_FILES.activeWork, activeWork);
  await writeStateFragment(projectRoot, STATE_FILES.projectStatus, projectStatus);
  await writeStateFragment(projectRoot, STATE_FILES.projectRoadmap, projectRoadmap);
  await writeStateFragment(
    projectRoot,
    STATE_FILES.projectSupervision,
    projectSupervision
  );

  await appendEvent(projectRoot, {
    id: crypto.randomUUID(),
    createdAt,
    kind: "workflow-transition",
    title: "Current phase 已重置",
    detail: `已从 accepted continuation 切换到新的 current phase「${draft.currentPhase.phaseName}」，当前状态为 ${draft.startMode === "implementing" ? "实现中" : "规划中"}。`,
    role: "planner",
    actionId: "phase-reset"
  });

  return {
    createdAt,
    currentPhase: draft.currentPhase,
    acceptanceState,
    activeWork,
    projectStatus,
    projectRoadmap,
    projectSupervision
  };
}
