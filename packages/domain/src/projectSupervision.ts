import { z } from "zod";
import { providerIdSchema } from "./agentRuns.ts";
import { phaseOwnerSchema } from "./currentPhase.ts";

export const projectSupervisionPresenceSchema = z.enum(["logical", "live"]);

export const projectSupervisionModeSchema = z.enum([
  "single-thread",
  "multi-thread"
]);

export const projectSupervisionLineStatusSchema = z.enum([
  "idle",
  "running",
  "waiting",
  "blocked",
  "done"
]);

export const projectSupervisionLineSchema = z.object({
  id: z.string().min(1),
  role: phaseOwnerSchema,
  threadLabel: z.string().min(1),
  provider: providerIdSchema.nullable(),
  presence: projectSupervisionPresenceSchema,
  status: projectSupervisionLineStatusSchema,
  taskSummary: z.string().min(1),
  requiresUserDecision: z.boolean(),
  blockerSummary: z.string().nullable(),
  latestEvidenceLabel: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export const projectSupervisionStateSchema = z.object({
  mode: projectSupervisionModeSchema,
  modeLabel: z.string().min(1),
  summary: z.string().min(1),
  lines: z.array(projectSupervisionLineSchema),
  updatedAt: z.string().nullable()
});

export type ProjectSupervisionLine = z.infer<typeof projectSupervisionLineSchema>;
export type ProjectSupervisionLineStatus = z.infer<
  typeof projectSupervisionLineStatusSchema
>;
export type ProjectSupervisionMode = z.infer<typeof projectSupervisionModeSchema>;
export type ProjectSupervisionPresence = z.infer<
  typeof projectSupervisionPresenceSchema
>;
export type ProjectSupervisionState = z.infer<
  typeof projectSupervisionStateSchema
>;
