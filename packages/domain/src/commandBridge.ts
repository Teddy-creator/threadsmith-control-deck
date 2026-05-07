import { z } from "zod";
import {
  agentRunStatusSchema,
  executionFailureKindSchema,
  executionFailureStageSchema,
  executionTaskOutcomeSchema,
  providerIdSchema
} from "./agentRuns.ts";
import { phaseOwnerSchema } from "./currentPhase.ts";

export const commandBridgeSurfaceSchema = z.enum([
  "deck-action-bridge",
  "direct-run"
]);

export const commandBridgeRouteStatusSchema = z.enum([
  "dispatched",
  "running",
  "succeeded",
  "failed"
]);

export const commandBridgeTruthWritebackSchema = z.enum([
  "pending",
  "written",
  "failed-written",
  "cancelled-written"
]);

export const commandBridgeLatestRouteSchema = z.object({
  routeId: z.string().min(1),
  sourceActionId: z.string().min(1).nullable(),
  surface: commandBridgeSurfaceSchema,
  provider: providerIdSchema,
  targetRole: phaseOwnerSchema,
  projectLabel: z.string().min(1),
  projectRoot: z.string().min(1),
  status: commandBridgeRouteStatusSchema,
  statusDetail: z.string().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  artifactPath: z.string().min(1).nullable(),
  runId: z.string().min(1).nullable()
});

export const commandBridgeLatestRunSchema = z.object({
  runId: z.string().min(1),
  routeId: z.string().min(1).nullable(),
  provider: providerIdSchema,
  role: phaseOwnerSchema,
  status: agentRunStatusSchema,
  taskOutcome: executionTaskOutcomeSchema.optional(),
  failureStage: executionFailureStageSchema.nullable().optional(),
  failureKind: executionFailureKindSchema.nullable().optional(),
  summary: z.string().min(1),
  recordedAt: z.string().min(1),
  artifactPath: z.string().min(1).nullable(),
  truthWritebackStatus: commandBridgeTruthWritebackSchema
});

export const commandBridgeStateSchema = z.object({
  latestRoute: commandBridgeLatestRouteSchema.nullable(),
  latestRun: commandBridgeLatestRunSchema.nullable(),
  updatedAt: z.string().nullable()
});

export type CommandBridgeLatestRoute = z.infer<
  typeof commandBridgeLatestRouteSchema
>;
export type CommandBridgeLatestRun = z.infer<typeof commandBridgeLatestRunSchema>;
export type CommandBridgeRouteStatus = z.infer<
  typeof commandBridgeRouteStatusSchema
>;
export type CommandBridgeState = z.infer<typeof commandBridgeStateSchema>;
export type CommandBridgeSurface = z.infer<typeof commandBridgeSurfaceSchema>;
export type CommandBridgeTruthWriteback = z.infer<
  typeof commandBridgeTruthWritebackSchema
>;
