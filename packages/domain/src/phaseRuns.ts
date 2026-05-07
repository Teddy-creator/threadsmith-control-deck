import { z } from "zod";
import { currentPhaseSchema, phaseOwnerSchema } from "./currentPhase.ts";

export const phaseRunStatusSchema = z.enum([
  "running",
  "paused",
  "failed",
  "accepted",
  "cancelled"
]);

export const phaseSliceKindSchema = z.enum(["primary", "repair"]);

export const phaseRunPauseTypeSchema = z.enum([
  "risk",
  "blocked",
  "missing-info",
  "loop-limit",
  "infra-failure"
]);

export const phaseRunRecordSchema = z.object({
  phaseRunId: z.string().min(1),
  projectRoot: z.string().min(1),
  status: phaseRunStatusSchema,
  currentRole: phaseOwnerSchema.nullable(),
  currentSliceId: z.string().min(1).nullable(),
  repairCount: z.number().int().min(0),
  lockedPhaseSnapshotRef: z.string().min(1),
  latestSuccessfulRole: phaseOwnerSchema.nullable(),
  pauseReason: z.string().min(1).nullable(),
  resumeHint: z.string().min(1).nullable(),
  workspacePath: z.string().min(1),
  latestRunRef: z.string().min(1).nullable(),
  eventRefs: z.array(z.string().min(1)),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1).nullable()
});

export const lockedPhaseSnapshotSchema = z.object({
  phaseRunId: z.string().min(1),
  phase: currentPhaseSchema,
  capturedAt: z.string().min(1)
});

export const phaseSliceArtifactSchema = z.object({
  phaseRunId: z.string().min(1),
  sliceId: z.string().min(1),
  kind: phaseSliceKindSchema,
  goal: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1),
  doneWhen: z.array(z.string().min(1)).min(1),
  verification: z.array(z.string().min(1)),
  whyNow: z.string().min(1),
  createdByRunId: z.string().min(1),
  createdAt: z.string().min(1)
});

export const phaseRunPauseSchema = z.object({
  phaseRunId: z.string().min(1),
  type: phaseRunPauseTypeSchema,
  role: phaseOwnerSchema,
  summary: z.string().min(1),
  detail: z.string().min(1),
  resumeRequirements: z.array(z.string().min(1)),
  recommendedPrompt: z.string().min(1),
  createdAt: z.string().min(1)
});

export type LockedPhaseSnapshot = z.infer<typeof lockedPhaseSnapshotSchema>;
export type PhaseRunPause = z.infer<typeof phaseRunPauseSchema>;
export type PhaseRunPauseType = z.infer<typeof phaseRunPauseTypeSchema>;
export type PhaseRunRecord = z.infer<typeof phaseRunRecordSchema>;
export type PhaseRunStatus = z.infer<typeof phaseRunStatusSchema>;
export type PhaseSliceArtifact = z.infer<typeof phaseSliceArtifactSchema>;
export type PhaseSliceKind = z.infer<typeof phaseSliceKindSchema>;
