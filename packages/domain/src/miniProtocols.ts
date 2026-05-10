import { z } from "zod";
import { phaseOwnerSchema } from "./currentPhase.ts";
import { miniProtocolIdSchema } from "./skillOrchestrator.ts";

export const miniProtocolInputFieldSchema = z.enum([
  "userGoal",
  "projectBrief",
  "currentPhase",
  "acceptanceState",
  "activeWork",
  "projectSupervision",
  "contextPacket",
  "rolePacket",
  "repoMap",
  "evidenceSummary",
  "recentDiff",
  "failureSymptom",
  "researchQuestion",
  "verificationCommands"
]);

export const miniProtocolOutputFieldSchema = z.enum([
  "taskBrief",
  "implementationPlan",
  "rootCauseHypothesis",
  "reviewFindings",
  "verificationResult",
  "closeoutSummary",
  "handoffSummary",
  "recoveryDecision",
  "researchMapping",
  "truthWritebackProposal",
  "nextRoleHint"
]);

export const miniProtocolStopReasonSchema = z.enum([
  "needs-user-decision",
  "ready-for-executor",
  "ready-for-review",
  "ready-for-verification",
  "accepted-with-closeout-pending",
  "accepted",
  "blocked",
  "handoff-created",
  "recover-before-continue"
]);

export const miniProtocolContractSchema = z.object({
  id: miniProtocolIdSchema,
  label: z.string().min(1),
  owningRole: phaseOwnerSchema,
  purpose: z.string().min(1),
  requiredInputs: z.array(miniProtocolInputFieldSchema).min(1),
  requiredOutputs: z.array(miniProtocolOutputFieldSchema).min(1),
  evidenceRequired: z.boolean(),
  stopReasons: z.array(miniProtocolStopReasonSchema).min(1),
  continuationHint: z.string().min(1),
  guardrails: z.array(z.string().min(1)).min(1)
});

export const miniProtocolInstructionSchema = z.object({
  protocol: miniProtocolContractSchema,
  role: phaseOwnerSchema,
  objective: z.string().min(1),
  inputChecklist: z.array(z.string().min(1)),
  outputChecklist: z.array(z.string().min(1)),
  guardrails: z.array(z.string().min(1)),
  stopCondition: z.string().min(1),
  continuationHint: z.string().min(1),
  route: z.object({
    source: z.enum(["built-in", "external-adapter", "fallback"]),
    selectedAdapterId: z.string().min(1).nullable(),
    availability: z.enum(["available", "missing", "stale", "disabled", "unsafe"]),
    reason: z.string().min(1),
    safetyWarnings: z.array(z.string().min(1))
  })
});

export type MiniProtocolContract = z.infer<typeof miniProtocolContractSchema>;
export type MiniProtocolInputField = z.infer<
  typeof miniProtocolInputFieldSchema
>;
export type MiniProtocolInstruction = z.infer<
  typeof miniProtocolInstructionSchema
>;
export type MiniProtocolOutputField = z.infer<
  typeof miniProtocolOutputFieldSchema
>;
export type MiniProtocolStopReason = z.infer<
  typeof miniProtocolStopReasonSchema
>;
