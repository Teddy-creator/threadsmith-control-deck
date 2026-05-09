import {
  acceptanceStateSchema,
  phaseOwnerSchema,
  currentPhaseSchema,
  continuationBehaviorSchema,
  projectSupervisionStateSchema,
  providerRoutingSchema,
  projectBriefSchema,
  projectRoadmapSchema,
  projectStatusSchema,
  workflowTransitionIdSchema
} from "@threadsmith/domain";
import { z } from "zod";
import { phaseResetDraftSchema } from "./phaseReset.ts";

export const deckActionIdSchema = z.enum([
  "advance-phase",
  "open-current-phase",
  "run-verification",
  "sync-context",
  "run-hygiene",
  "create-handoff"
]);

export const actionScopeSchema = z.enum(["project", "global"]);

export const deckActionSchema = z.object({
  id: z.string().min(1),
  actionId: deckActionIdSchema,
  createdAt: z.string().min(1),
  projectRoot: z.string().min(1),
  previewAccepted: z.boolean(),
  continuationBehavior: continuationBehaviorSchema.optional(),
  persistenceScope: actionScopeSchema.optional()
});

export const deckActionRequestSchema = z.object({
  actionId: deckActionIdSchema,
  continuationBehavior: continuationBehaviorSchema.optional(),
  persistenceScope: actionScopeSchema.optional()
});

export const workflowTransitionRequestSchema = z.object({
  transitionId: workflowTransitionIdSchema
});

export const projectBriefUpdateRequestSchema = z.object({
  value: projectBriefSchema
});

export const currentPhaseUpdateRequestSchema = z.object({
  value: currentPhaseSchema
});

export const acceptanceStateUpdateRequestSchema = z.object({
  value: acceptanceStateSchema
});

export const projectRoadmapUpdateRequestSchema = z.object({
  value: projectRoadmapSchema
});

export const projectStatusUpdateRequestSchema = z.object({
  value: projectStatusSchema
});

export const projectSupervisionUpdateRequestSchema = z.object({
  value: projectSupervisionStateSchema
});

export const providerRoutingUpdateRequestSchema = z.object({
  value: providerRoutingSchema
});

export const phaseResetRequestSchema = z.object({
  value: phaseResetDraftSchema
});

export const runStartRequestSchema = z.object({
  role: phaseOwnerSchema.optional()
});

export type DeckAction = z.infer<typeof deckActionSchema>;
