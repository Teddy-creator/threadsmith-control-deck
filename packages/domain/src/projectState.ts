import { z } from "zod";
import { acceptanceStateSchema } from "./acceptanceState.ts";
import { currentPhaseSchema, phaseOwnerSchema } from "./currentPhase.ts";
import { preferencesSchema } from "./preferences.ts";
import { projectBriefSchema } from "./projectBrief.ts";
import { projectRoadmapSchema } from "./projectRoadmap.ts";
import { projectStatusSchema } from "./projectStatus.ts";

export const roleStatusSchema = z.enum([
  "idle",
  "running",
  "waiting",
  "blocked",
  "done"
]);

export const activeWorkItemSchema = z.object({
  role: phaseOwnerSchema,
  status: roleStatusSchema,
  taskSummary: z.string().min(1),
  requiresUserDecision: z.boolean()
});

export const activeWorkSchema = z.object({
  items: z.array(activeWorkItemSchema),
  blockerSummary: z.string().nullable()
});

export const projectStateSchema = z.object({
  projectBrief: projectBriefSchema,
  projectStatus: projectStatusSchema,
  projectRoadmap: projectRoadmapSchema,
  currentPhase: currentPhaseSchema,
  acceptanceState: acceptanceStateSchema,
  activeWork: activeWorkSchema,
  preferences: preferencesSchema
});

export type ActiveWork = z.infer<typeof activeWorkSchema>;
export type ActiveWorkItem = z.infer<typeof activeWorkItemSchema>;
export type ProjectState = z.infer<typeof projectStateSchema>;
