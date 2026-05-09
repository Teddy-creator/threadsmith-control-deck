import { z } from "zod";
import { contextBudgetLedgerSchema } from "./contextBudget.ts";
import {
  contextPacketAcceptanceSchema,
  contextPacketCurrentPhaseSchema,
  contextPacketEvidenceSchema,
  contextPacketGoalSchema,
  contextPacketNextStepSchema,
  contextPacketProjectSchema,
  contextPacketRecentDiffSchema,
  contextPacketRelevantFileSchema,
  contextPacketRiskSchema,
  contextPacketScopeSchema
} from "./contextPacket.ts";
import { contextReferenceSchema } from "./agentRuns.ts";
import { phaseOwnerSchema } from "./currentPhase.ts";

export const roleContextPacketPayloadSchema = z.object({
  project: contextPacketProjectSchema.optional(),
  goal: contextPacketGoalSchema.optional(),
  currentPhase: contextPacketCurrentPhaseSchema.optional(),
  scope: contextPacketScopeSchema.optional(),
  acceptance: contextPacketAcceptanceSchema.optional(),
  nextStep: contextPacketNextStepSchema.optional(),
  risks: z.array(contextPacketRiskSchema).optional(),
  relevantFiles: z.array(contextPacketRelevantFileSchema).optional(),
  recentDiff: contextPacketRecentDiffSchema.optional(),
  evidence: contextPacketEvidenceSchema.optional(),
  budget: contextBudgetLedgerSchema.optional(),
  sourceRefs: z.array(contextReferenceSchema).optional()
});

export const roleContextPacketSchema = z.object({
  packetId: z.string().min(1),
  parentPacketId: z.string().min(1),
  generatedAt: z.string().min(1),
  role: phaseOwnerSchema,
  focus: z.string().min(1),
  purpose: z.string().min(1),
  includedSections: z.array(z.string().min(1)),
  omittedSections: z.array(z.string().min(1)),
  payload: roleContextPacketPayloadSchema
});

export type RoleContextPacket = z.infer<typeof roleContextPacketSchema>;
export type RoleContextPacketPayload = z.infer<
  typeof roleContextPacketPayloadSchema
>;
