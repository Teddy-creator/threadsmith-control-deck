import { z } from "zod";
import {
  contextReferenceSchema,
  verificationCommandResultSchema
} from "./agentRuns.ts";
import { acceptanceFinalStateSchema } from "./acceptanceState.ts";
import { phaseOwnerSchema } from "./currentPhase.ts";
import { projectOverallStateSchema } from "./projectStatus.ts";

export const contextPacketSectionStatusSchema = z.enum([
  "ready",
  "missing",
  "blocked",
  "unknown"
]);

export const contextPacketProjectSchema = z.object({
  label: z.string().min(1),
  track: z.string().min(1),
  overallState: projectOverallStateSchema,
  focus: z.string().min(1),
  summary: z.string().min(1)
});

export const contextPacketGoalSchema = z.object({
  projectGoal: z.string().min(1),
  successFrame: z.string().min(1),
  priorityOrder: z.array(z.string().min(1))
});

export const contextPacketCurrentPhaseSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  deliverable: z.string().min(1),
  stopCondition: z.string().min(1),
  activeOwners: z.array(phaseOwnerSchema)
});

export const contextPacketScopeSchema = z.object({
  inScope: z.array(z.string().min(1)),
  outOfScope: z.array(z.string().min(1)),
  constraints: z.array(z.string().min(1)),
  nonGoals: z.array(z.string().min(1))
});

export const contextPacketAcceptanceSchema = z.object({
  claim: z.string().min(1),
  finalState: acceptanceFinalStateSchema,
  implementationStatus: z.string().min(1),
  reviewStatus: z.string().min(1),
  verificationStatus: z.string().min(1),
  closeoutStatus: z.string().min(1),
  checklist: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      status: z.enum(["pass", "fail", "unknown"])
    })
  ),
  knownGaps: z.array(z.string().min(1))
});

export const contextPacketNextStepSchema = z.object({
  label: z.string().min(1),
  rationale: z.string().min(1),
  recommendedRole: phaseOwnerSchema,
  actionId: z.string().min(1).nullable()
});

export const contextPacketRiskSchema = z.object({
  label: z.string().min(1),
  source: z.enum(["project", "phase", "acceptance", "context"])
});

export const contextPacketRelevantFileSchema = z.object({
  path: z.string().min(1),
  reason: z.string().min(1),
  source: z.enum(["phase", "diff", "evidence", "manual", "repo-map"])
});

export const contextPacketRecentDiffSchema = z.object({
  status: z.enum(["clean", "dirty", "unknown"]),
  summary: z.string().min(1),
  changedFiles: z.array(z.string().min(1)),
  command: z.string().min(1).nullable()
});

export const contextPacketEvidenceSchema = z.object({
  status: contextPacketSectionStatusSchema,
  summary: z.string().min(1),
  commands: z.array(verificationCommandResultSchema),
  artifactRefs: z.array(z.string().min(1))
});

export const contextPacketSchema = z.object({
  packetId: z.string().min(1),
  generatedAt: z.string().min(1),
  project: contextPacketProjectSchema,
  goal: contextPacketGoalSchema,
  currentPhase: contextPacketCurrentPhaseSchema,
  scope: contextPacketScopeSchema,
  acceptance: contextPacketAcceptanceSchema,
  nextStep: contextPacketNextStepSchema,
  risks: z.array(contextPacketRiskSchema),
  relevantFiles: z.array(contextPacketRelevantFileSchema),
  recentDiff: contextPacketRecentDiffSchema,
  evidence: contextPacketEvidenceSchema,
  sourceRefs: z.array(contextReferenceSchema)
});

export type ContextPacket = z.infer<typeof contextPacketSchema>;
export type ContextPacketEvidence = z.infer<typeof contextPacketEvidenceSchema>;
export type ContextPacketRecentDiff = z.infer<typeof contextPacketRecentDiffSchema>;
export type ContextPacketRelevantFile = z.infer<
  typeof contextPacketRelevantFileSchema
>;
export type ContextPacketRisk = z.infer<typeof contextPacketRiskSchema>;
export type ContextPacketSectionStatus = z.infer<
  typeof contextPacketSectionStatusSchema
>;
