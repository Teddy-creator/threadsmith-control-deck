import { z } from "zod";
import type { AcceptanceState } from "./acceptanceState.ts";
import type { CurrentPhase } from "./currentPhase.ts";
import type { ProjectBrief } from "./projectBrief.ts";
import type { ProjectStatus } from "./projectStatus.ts";

export const roadmapMilestoneStateSchema = z.enum([
  "done",
  "current",
  "next",
  "later",
  "blocked"
]);

export const projectRoadmapMilestoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  state: roadmapMilestoneStateSchema
});

export const projectRoadmapSchema = z.object({
  versionLabel: z.string().min(1),
  finalGoal: z.string().min(1),
  milestones: z.array(projectRoadmapMilestoneSchema).min(1),
  updatedAt: z.string().nullable()
}).superRefine((value, context) => {
  const activeCount = value.milestones.filter(
    (item) => item.state === "current" || item.state === "blocked"
  ).length;
  const nextCount = value.milestones.filter((item) => item.state === "next").length;

  if (activeCount > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "project roadmap can have at most one current or blocked milestone"
    });
  }

  if (nextCount > 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "project roadmap can have at most one next milestone"
    });
  }
});

export type RoadmapMilestoneState = z.infer<typeof roadmapMilestoneStateSchema>;
export type ProjectRoadmapMilestone = z.infer<typeof projectRoadmapMilestoneSchema>;
export type ProjectRoadmap = z.infer<typeof projectRoadmapSchema>;

export function alignProjectRoadmapToStatus(
  roadmap: ProjectRoadmap,
  projectStatus: Pick<
    ProjectStatus,
    "currentMilestoneId" | "nextMilestoneId" | "overallState" | "updatedAt"
  >
): ProjectRoadmap {
  const currentMilestoneId = projectStatus.currentMilestoneId ?? null;
  const nextMilestoneId = projectStatus.nextMilestoneId ?? null;

  if (!currentMilestoneId && !nextMilestoneId) {
    return roadmap;
  }

  const currentIndex = currentMilestoneId
    ? roadmap.milestones.findIndex((milestone) => milestone.id === currentMilestoneId)
    : -1;
  const nextIndex = nextMilestoneId
    ? roadmap.milestones.findIndex((milestone) => milestone.id === nextMilestoneId)
    : -1;

  if (currentIndex === -1 && nextIndex === -1) {
    return roadmap;
  }

  const normalizedMilestones = roadmap.milestones.map((milestone, index) => {
    if (currentIndex >= 0) {
      if (index < currentIndex) {
        return { ...milestone, state: "done" as const };
      }

      if (index === currentIndex) {
        return {
          ...milestone,
          state:
            projectStatus.overallState === "blocked" ? ("blocked" as const) : ("current" as const)
        };
      }

      if (nextIndex >= 0 && index === nextIndex && nextIndex > currentIndex) {
        return { ...milestone, state: "next" as const };
      }

      return { ...milestone, state: "later" as const };
    }

    if (nextIndex >= 0) {
      if (index < nextIndex && milestone.state === "done") {
        return milestone;
      }

      if (index === nextIndex) {
        return { ...milestone, state: "next" as const };
      }

      return { ...milestone, state: "later" as const };
    }

    return milestone;
  });

  return projectRoadmapSchema.parse({
    ...roadmap,
    milestones: normalizedMilestones,
    updatedAt: projectStatus.updatedAt ?? roadmap.updatedAt
  });
}

export function deriveFallbackProjectRoadmap(input: {
  projectLabel: string;
  projectBrief: ProjectBrief;
  projectStatus: ProjectStatus;
  currentPhase: CurrentPhase;
  acceptanceState: AcceptanceState;
}): ProjectRoadmap {
  const currentPhaseAccepted = input.acceptanceState.finalState === "accepted";
  const currentMilestoneState: RoadmapMilestoneState = currentPhaseAccepted
    ? "done"
    : input.currentPhase.blockedBy.length > 0
      ? "blocked"
      : "current";
  const nextMilestoneState: RoadmapMilestoneState = currentPhaseAccepted
    ? "current"
    : "next";

  return projectRoadmapSchema.parse({
    versionLabel: `${input.projectLabel} v1`,
    finalGoal: input.projectBrief.successFrame,
    milestones: [
      {
        id: "project-connected",
        label: "项目接入",
        title: `${input.projectLabel} 已接入 Threadsmith`,
        summary: "基础状态文件已经建立，可以从仓库内真相继续推进。",
        state: "done"
      },
      {
        id: "scope-aligned",
        label: "范围对齐",
        title: "明确当前版本范围与边界",
        summary: input.projectBrief.currentVersionScope,
        state: "done"
      },
      {
        id: "current-phase",
        label: currentPhaseAccepted ? "已接受切片" : "当前阶段",
        title: currentPhaseAccepted
          ? (input.projectStatus.latestAcceptedSlice?.title ?? input.currentPhase.phaseName)
          : input.currentPhase.phaseName,
        summary: input.currentPhase.phaseGoal,
        state: currentMilestoneState
      },
      {
        id: "next-milestone",
        label: "下一计划",
        title: input.projectStatus.nextPlannedSlice?.title ?? "定义下一条里程碑",
        summary: input.projectStatus.currentFocus,
        state: nextMilestoneState
      },
      {
        id: "steady-loop",
        label: "稳定节奏",
        title: "进入可持续推进的开发节奏",
        summary: input.projectBrief.successFrame,
        state: "later"
      }
    ],
    updatedAt: input.projectStatus.updatedAt
  });
}
