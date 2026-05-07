import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectRoadmap, ProjectState } from "@threadsmith/domain";
import { z } from "zod";
import { readLatestContinuationPacket } from "./continuationPackets.ts";
import { appendEvent, resolveMonotonicEventTimestamp } from "./events.ts";
import { loadProjectState } from "./fileStore.ts";
import {
  THREADSMITH_DIR,
  getPhaseResetDraftArtifactsDir
} from "./paths.ts";
import {
  phaseResetDraftSchema,
  type PhaseResetDraft
} from "./phaseReset.ts";

const PHASE_RESET_DRAFTS_DIR = "phase-reset-drafts";

const phaseResetDraftArtifactSchema = z.object({
  kind: z.literal("phase-reset-draft"),
  createdAt: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  sourcePhaseName: z.string().min(1),
  sourceAcceptedSliceTitle: z.string().nullable(),
  sourceHandoffPath: z.string().nullable(),
  draft: phaseResetDraftSchema
});

export type PhaseResetDraftArtifact = z.infer<typeof phaseResetDraftArtifactSchema>;

export interface PhaseResetDraftArtifactSummary {
  createdAt: string;
  title: string;
  detail: string;
  sourcePhaseName: string;
  sourceAcceptedSliceTitle: string | null;
  sourceHandoffPath: string | null;
  draft: PhaseResetDraft;
  jsonRelativePath: string;
  markdownRelativePath: string;
}

type DraftSourceMode = "accepted-truth" | "accepted-handoff-backfill";

function slugTimestamp(createdAt: string) {
  return createdAt.replaceAll(":", "-").replaceAll(".", "-");
}

function compactTitle(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function nextMilestoneIndex(roadmap: ProjectRoadmap) {
  const nextIndex = roadmap.milestones.findIndex((milestone) => milestone.state === "next");

  if (nextIndex >= 0) {
    return nextIndex;
  }

  const laterIndex = roadmap.milestones.findIndex((milestone) => milestone.state === "later");

  return laterIndex >= 0 ? laterIndex : -1;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "") || "next-phase";
}

function deriveTargetPhaseName(state: ProjectState) {
  const explicitNextSlice = state.projectStatus.nextPlannedSlice?.title?.trim();

  if (explicitNextSlice) {
    return compactTitle(explicitNextSlice);
  }

  const roadmapTarget = state.projectRoadmap.milestones[nextMilestoneIndex(state.projectRoadmap)];

  if (roadmapTarget?.title) {
    return compactTitle(roadmapTarget.title);
  }

  return `承接 ${state.currentPhase.phaseName} 的下一刀`;
}

function deriveDraftRoadmap(state: ProjectState, phaseName: string, createdAt: string) {
  const candidateIndex = nextMilestoneIndex(state.projectRoadmap);

  if (candidateIndex < 0) {
    return {
      ...state.projectRoadmap,
      milestones: [
        ...state.projectRoadmap.milestones,
        {
          id: slugify(phaseName),
          label: "Next",
          title: phaseName,
          summary: `基于 accepted handoff 为「${phaseName}」生成的 starter draft。`,
          state: "current" as const
        }
      ],
      updatedAt: createdAt
    };
  }

  return {
    ...state.projectRoadmap,
    milestones: state.projectRoadmap.milestones.map((milestone, index) => {
      if (index < candidateIndex) {
        return {
          ...milestone,
          state: "done" as const
        };
      }

      if (index === candidateIndex) {
        return {
          ...milestone,
          state: "current" as const
        };
      }

      if (index === candidateIndex + 1) {
        return {
          ...milestone,
          state: "next" as const
        };
      }

      return {
        ...milestone,
        state: "later" as const
      };
    }),
    updatedAt: createdAt
  };
}

function deriveProjectStatusDraft(state: ProjectState, phaseName: string, createdAt: string) {
  const roadmapTarget = state.projectRoadmap.milestones[nextMilestoneIndex(state.projectRoadmap)];
  const draftRoadmap = deriveDraftRoadmap(state, phaseName, createdAt);
  const currentMilestone =
    draftRoadmap.milestones.find((milestone) => milestone.state === "current") ?? null;
  const nextMilestone =
    draftRoadmap.milestones.find((milestone) => milestone.state === "next") ?? null;

  return {
    currentTrack: phaseName,
    currentFocus: `基于 accepted handoff 收束「${phaseName}」的 phase 边界，并准备 formal phase reset。`,
    projectStatusSummary: `当前正在为「${phaseName}」准备 starter draft；审阅通过后即可进入 formal phase reset。`,
    latestAcceptedSlice:
      state.projectStatus.latestAcceptedSlice ?? {
        title: state.currentPhase.phaseName,
        recordedAt: createdAt
      },
    nextPlannedSlice: {
      title: phaseName,
      recordedAt: createdAt
    },
    currentMilestoneId: currentMilestone?.id ?? roadmapTarget?.id ?? null,
    nextMilestoneId: nextMilestone?.id ?? null,
    topRisks: [
      "这还是一份 starter draft，formal phase reset 前仍需要 conductor 或人工 review。",
      ...state.projectStatus.topRisks.slice(0, 2)
    ]
  };
}

function deriveRoleSummariesFromActiveWork(state: ProjectState) {
  const entries = state.activeWork.items
    .filter((item) => item.taskSummary.trim().length > 0)
    .map((item) => [item.role, item.taskSummary] as const);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function derivePhaseResetDraftFromAcceptedHandoffBackfill(
  state: ProjectState,
  handoffPhaseName: string,
  createdAt: string
): PhaseResetDraft {
  const startMode = state.acceptanceState.implementationStatus === "not-started"
    ? "planning"
    : "implementing";

  return phaseResetDraftSchema.parse({
    currentPhase: state.currentPhase,
    currentClaim: `Threadsmith 已把「${state.currentPhase.phaseName}」与最新 accepted handoff 对齐，并补写为 committed 的 phase reset draft artifact。`,
    doneWhen:
      state.acceptanceState.doneWhenChecklist.map(({ id, label }) => ({ id, label })),
    startMode,
    projectStatus: state.projectStatus,
    projectRoadmap: state.projectRoadmap,
    roleSummaries: deriveRoleSummariesFromActiveWork(state),
    supervisionSummary: `当前 phase「${state.currentPhase.phaseName}」已在 live truth 中推进；这份 draft artifact 用于把它重新绑定回 accepted handoff「${handoffPhaseName}」。`,
    recordedAt: createdAt
  });
}

function resolveDraftSource(
  state: ProjectState,
  createdAt: string,
  latestHandoff: Awaited<ReturnType<typeof readLatestContinuationPacket>>
) {
  if (state.acceptanceState.finalState === "accepted") {
    return {
      draft: derivePhaseResetDraftFromAcceptedState(state, createdAt),
      mode: "accepted-truth" as const,
      sourcePhaseName: state.currentPhase.phaseName,
      sourceAcceptedSliceTitle: state.projectStatus.latestAcceptedSlice?.title ?? null
    };
  }

  const latestAcceptedSliceTitle = state.projectStatus.latestAcceptedSlice?.title?.trim() ?? null;
  const canBackfillFromAcceptedHandoff =
    latestHandoff?.kind === "handoff" &&
    latestHandoff.phaseName.trim().length > 0 &&
    latestHandoff.phaseName !== state.currentPhase.phaseName &&
    (latestAcceptedSliceTitle === null || latestAcceptedSliceTitle === latestHandoff.phaseName);

  if (canBackfillFromAcceptedHandoff && latestHandoff) {
    return {
      draft: derivePhaseResetDraftFromAcceptedHandoffBackfill(
        state,
        latestHandoff.phaseName,
        createdAt
      ),
      mode: "accepted-handoff-backfill" as const,
      sourcePhaseName: latestHandoff.phaseName,
      sourceAcceptedSliceTitle: latestHandoff.phaseName
    };
  }

  throw new Error("只有 accepted truth 或 accepted handoff 边界才能生成 phase reset draft artifact");
}

export function derivePhaseResetDraftFromAcceptedState(
  state: ProjectState,
  createdAt: string
): PhaseResetDraft {
  if (state.acceptanceState.finalState !== "accepted") {
    throw new Error("只有 accepted truth 才能生成 phase reset draft artifact");
  }

  const phaseName = deriveTargetPhaseName(state);
  const projectRoadmap = deriveDraftRoadmap(state, phaseName, createdAt);
  const projectStatus = deriveProjectStatusDraft(state, phaseName, createdAt);

  return phaseResetDraftSchema.parse({
    currentPhase: {
      phaseName,
      phaseGoal: `围绕「${phaseName}」收束下一条最小可执行 slice，并为 formal phase reset 准备完整边界。`,
      deliverable: `「${phaseName}」的 starter phase reset draft`,
      inScope: [
        "把 accepted handoff 收束成下一条 current phase starter draft",
        "对齐新的 project status / roadmap 指针",
        "为 formal phase reset 准备可审阅的边界"
      ],
      outOfScope: [
        "自动执行新的 phase reset",
        "进入 multi-provider routing",
        "重做 deck 视觉骨架"
      ],
      stopCondition: `「${phaseName}」的 starter draft 已审阅并可以正式 phase reset。`,
      verificationForThisPhase: [
        "确认 Goal / Scope / Done when / Verification 已对齐后，再执行 formal phase reset。"
      ],
      activeOwners: ["planner", "executor", "reviewer", "verifier", "closeout", "hygiene"],
      blockedBy: []
    },
    currentClaim: `Threadsmith 已为「${phaseName}」准备 starter draft，可在 review 后执行 formal phase reset。`,
    doneWhen: [
      {
        id: "starter-phase-defined",
        label: `「${phaseName}」的 starter phase contract 已生成`
      },
      {
        id: "status-roadmap-aligned",
        label: "starter draft 的 project status / roadmap 指针已对齐"
      },
      {
        id: "phase-reset-ready",
        label: "这份 starter draft 已可作为 formal phase reset 的起点"
      }
    ],
    startMode: "planning",
    projectStatus,
    projectRoadmap,
    roleSummaries: {
      planner: `根据 accepted handoff 为「${phaseName}」收束 starter draft。`,
      executor: "等待 planner 完成 draft 审阅后再开始执行。",
      reviewer: "等待 planner 收束 draft 后再 review。",
      verifier: "等待 review 放行后再开始 verification。",
      closeout: "等待 verification 通过后再进入 closeout。",
      hygiene: "已基于 accepted handoff 完成 draft 生成前的重新锚定。"
    },
    supervisionSummary: `当前正在为「${phaseName}」准备 phase reset starter draft。`,
    recordedAt: createdAt
  });
}

function buildArtifactTitle(phaseName: string) {
  return `已生成 phase reset draft：「${phaseName}」`;
}

function buildArtifactDetail(args: {
  sourceMode: DraftSourceMode;
  phaseName: string;
  sourcePhaseName: string;
  sourceHandoffPath: string | null;
}) {
  const source = args.sourceHandoffPath
    ? `来源 handoff：${args.sourceHandoffPath}`
    : `来源 phase：${args.sourcePhaseName}`;

  if (args.sourceMode === "accepted-handoff-backfill") {
    return `当前项目已经进入 phase「${args.phaseName}」，现基于最新 accepted handoff 补写 committed 的 phase reset draft artifact，让这条 phase 的起点重新回到正式 artifact。${source ? ` ${source}` : ""}`;
  }

  return `已基于 accepted truth 为下一条 phase「${args.phaseName}」生成 starter draft，可在 review 后执行 formal phase reset。${source ? ` ${source}` : ""}`;
}

function buildMarkdownContents(artifact: PhaseResetDraftArtifact) {
  return [
    "# Threadsmith Phase Reset Draft",
    "",
    `- 类型：${artifact.kind}`,
    `- 创建时间：${artifact.createdAt}`,
    `- 来源 phase：${artifact.sourcePhaseName}`,
    `- 来源 accepted slice：${artifact.sourceAcceptedSliceTitle ?? "无"}`,
    `- 来源 handoff：${artifact.sourceHandoffPath ?? "无"}`,
    "",
    "## 摘要",
    "",
    artifact.title,
    "",
    artifact.detail,
    "",
    "## 推荐下一步",
    "",
    `- 先 review 这份「${artifact.draft.currentPhase.phaseName}」starter draft`,
    "- 如需调整，优先修改 draft，再做 formal phase reset",
    "- 如已对齐，可直接把这份 draft 作为下一轮 phase reset 输入",
    "",
    "## Phase Reset Draft",
    "",
    "```json",
    JSON.stringify(artifact.draft, null, 2),
    "```",
    ""
  ].join("\n");
}

export async function writePhaseResetDraftArtifact(
  projectRoot: string,
  options?: {
    draft?: PhaseResetDraft;
    createdAt?: string;
  }
): Promise<PhaseResetDraftArtifactSummary> {
  const state = await loadProjectState(projectRoot);
  const createdAt = await resolveMonotonicEventTimestamp(projectRoot, options?.createdAt);
  const latestHandoff = await readLatestContinuationPacket(projectRoot, {
    kind: "handoff"
  });
  const source = options?.draft
    ? {
        draft: options.draft,
        mode: "accepted-truth" as const,
        sourcePhaseName: state.currentPhase.phaseName,
        sourceAcceptedSliceTitle: state.projectStatus.latestAcceptedSlice?.title ?? null
      }
    : resolveDraftSource(state, createdAt, latestHandoff);
  const draft = source.draft;
  const title = buildArtifactTitle(draft.currentPhase.phaseName);
  const detail = buildArtifactDetail({
    sourceMode: source.mode,
    phaseName: draft.currentPhase.phaseName,
    sourcePhaseName: source.sourcePhaseName,
    sourceHandoffPath: latestHandoff?.relativePath ?? null
  });
  const artifact = phaseResetDraftArtifactSchema.parse({
    kind: "phase-reset-draft",
    createdAt,
    title,
    detail,
    sourcePhaseName: source.sourcePhaseName,
    sourceAcceptedSliceTitle: source.sourceAcceptedSliceTitle,
    sourceHandoffPath: latestHandoff?.relativePath ?? null,
    draft
  });
  const fileSlug = slugTimestamp(createdAt);
  const jsonFileName = `${fileSlug}.json`;
  const markdownFileName = `${fileSlug}.md`;
  const jsonRelativePath = `${THREADSMITH_DIR}/${PHASE_RESET_DRAFTS_DIR}/${jsonFileName}`;
  const markdownRelativePath = `${THREADSMITH_DIR}/${PHASE_RESET_DRAFTS_DIR}/${markdownFileName}`;

  await mkdir(getPhaseResetDraftArtifactsDir(projectRoot), { recursive: true });
  await writeFile(
    join(getPhaseResetDraftArtifactsDir(projectRoot), jsonFileName),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    join(getPhaseResetDraftArtifactsDir(projectRoot), markdownFileName),
    `${buildMarkdownContents(artifact).trim()}\n`,
    "utf8"
  );

  await appendEvent(projectRoot, {
    id: crypto.randomUUID(),
    createdAt,
    kind: "workflow-transition",
    title,
    detail: `${detail} Artifact：${markdownRelativePath}`,
    role: "planner",
    actionId: "phase-reset-draft",
    artifactPath: markdownRelativePath
  });

  return {
    createdAt,
    title,
    detail,
    sourcePhaseName: artifact.sourcePhaseName,
    sourceAcceptedSliceTitle: artifact.sourceAcceptedSliceTitle,
    sourceHandoffPath: artifact.sourceHandoffPath,
    draft,
    jsonRelativePath,
    markdownRelativePath
  };
}

export async function readLatestPhaseResetDraftArtifact(projectRoot: string) {
  try {
    const fileName = (await readdir(getPhaseResetDraftArtifactsDir(projectRoot)))
      .filter((candidate) => candidate.endsWith(".json"))
      .sort()
      .reverse()[0];

    if (!fileName) {
      return null;
    }

    const raw = await readFile(
      join(getPhaseResetDraftArtifactsDir(projectRoot), fileName),
      "utf8"
    );
    const artifact = phaseResetDraftArtifactSchema.parse(JSON.parse(raw));
    const markdownFileName = fileName.replace(/\.json$/, ".md");

    return {
      createdAt: artifact.createdAt,
      title: artifact.title,
      detail: artifact.detail,
      sourcePhaseName: artifact.sourcePhaseName,
      sourceAcceptedSliceTitle: artifact.sourceAcceptedSliceTitle,
      sourceHandoffPath: artifact.sourceHandoffPath,
      draft: artifact.draft,
      jsonRelativePath: `${THREADSMITH_DIR}/${PHASE_RESET_DRAFTS_DIR}/${fileName}`,
      markdownRelativePath: `${THREADSMITH_DIR}/${PHASE_RESET_DRAFTS_DIR}/${markdownFileName}`
    } satisfies PhaseResetDraftArtifactSummary;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
