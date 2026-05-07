import { z } from "zod";
import type { AcceptanceState } from "./acceptanceState.ts";
import type { CurrentPhase } from "./currentPhase.ts";
import type { ProjectBrief } from "./projectBrief.ts";

export const projectOverallStateSchema = z.enum([
  "planning",
  "in-progress",
  "at-risk",
  "blocked",
  "stable"
]);

export const projectSlicePointerSchema = z.object({
  title: z.string().min(1),
  recordedAt: z.string().nullable()
});

export const projectStatusSchema = z.object({
  projectLabel: z.string().min(1),
  currentTrack: z.string().min(1),
  overallState: projectOverallStateSchema,
  currentFocus: z.string().min(1),
  projectStatusSummary: z.string().min(1),
  latestAcceptedSlice: projectSlicePointerSchema.nullable(),
  nextPlannedSlice: projectSlicePointerSchema.nullable(),
  currentMilestoneId: z.string().min(1).nullable().optional(),
  nextMilestoneId: z.string().min(1).nullable().optional(),
  topRisks: z.array(z.string().min(1)).max(5),
  updatedAt: z.string().nullable()
});

export type ProjectOverallState = z.infer<typeof projectOverallStateSchema>;
export type ProjectSlicePointer = z.infer<typeof projectSlicePointerSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export function deriveProjectOverallState(
  acceptanceState: AcceptanceState,
  currentPhase: CurrentPhase
): ProjectOverallState {
  if (currentPhase.blockedBy.length > 0) {
    return "blocked";
  }

  if (
    acceptanceState.reviewStatus === "review-blocked" ||
    acceptanceState.verificationStatus === "failed"
  ) {
    return "at-risk";
  }

  if (acceptanceState.finalState === "accepted") {
    return "stable";
  }

  if (
    acceptanceState.implementationStatus === "implementing" ||
    acceptanceState.reviewStatus === "in-review" ||
    acceptanceState.verificationStatus === "running"
  ) {
    return "in-progress";
  }

  return "planning";
}

export function deriveFallbackProjectStatus(input: {
  projectLabel: string;
  projectBrief: ProjectBrief;
  currentPhase: CurrentPhase;
  acceptanceState: AcceptanceState;
  latestAcceptedRecordedAt?: string | null;
}): ProjectStatus {
  const overallState = deriveProjectOverallState(
    input.acceptanceState,
    input.currentPhase
  );
  const topRisks = [
    ...input.currentPhase.blockedBy,
    ...input.acceptanceState.knownGaps
  ].slice(0, 5);

  return {
    projectLabel: input.projectLabel,
    currentTrack: input.projectBrief.currentVersionScope,
    overallState,
    currentFocus:
      overallState === "stable"
        ? `已接受 slice：${input.currentPhase.phaseName}`
        : input.currentPhase.phaseGoal,
    projectStatusSummary:
      overallState === "stable"
        ? `当前最新已接受切片是「${input.currentPhase.phaseName}」，项目可以从这里继续规划下一刀。`
        : `当前项目主线仍围绕「${input.currentPhase.phaseName}」推进。`,
    latestAcceptedSlice:
      input.acceptanceState.finalState === "accepted"
        ? {
            title: input.currentPhase.phaseName,
            recordedAt: input.latestAcceptedRecordedAt ?? null
          }
        : null,
    nextPlannedSlice:
      input.acceptanceState.finalState === "accepted"
        ? null
        : {
            title: input.currentPhase.phaseName,
            recordedAt: null
          },
    currentMilestoneId: input.acceptanceState.finalState === "accepted"
      ? "next-milestone"
      : "current-phase",
    nextMilestoneId:
      input.acceptanceState.finalState === "accepted" ? null : "next-milestone",
    topRisks,
    updatedAt: null
  };
}
