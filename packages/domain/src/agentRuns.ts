import { z } from "zod";
import { phaseOwnerSchema } from "./currentPhase.ts";
import { miniProtocolInstructionSchema } from "./miniProtocols.ts";
import { phaseRunPauseTypeSchema } from "./phaseRuns.ts";

export const providerIdSchema = z.enum(["codex", "claude"]);

export const contextReferenceKindSchema = z.enum([
  "state",
  "doc",
  "file",
  "event",
  "artifact"
]);

export const contextReferenceSchema = z.object({
  kind: contextReferenceKindSchema,
  path: z.string().min(1),
  title: z.string().min(1).optional()
});

export const verificationCommandStatusSchema = z.enum([
  "pending",
  "passed",
  "failed",
  "skipped"
]);

export const verificationCommandResultSchema = z.object({
  command: z.string().min(1),
  status: verificationCommandStatusSchema,
  summary: z.string().min(1).optional()
});

export const executionWorkflowEffectSchema = z.enum([
  "advance",
  "artifact-only"
]);

export const executionPacketSchema = z.object({
  runId: z.string().min(1),
  projectRoot: z.string().min(1),
  role: phaseOwnerSchema,
  provider: providerIdSchema,
  workflowEffect: executionWorkflowEffectSchema.optional(),
  objective: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1),
  doneWhen: z.array(z.string().min(1)).min(1),
  verification: z.array(z.string().min(1)),
  protocolInstruction: miniProtocolInstructionSchema.optional(),
  contextRefs: z.array(contextReferenceSchema),
  output: z.object({
    resultPath: z.string().min(1),
    summaryPath: z.string().min(1)
  })
});

export const executionResultOutcomeSchema = z.enum([
  "succeeded",
  "failed",
  "cancelled"
]);

export const executionDecisionSchema = z.enum([
  "slice-ready",
  "pause-recommended",
  "ready-for-review",
  "review-blocked",
  "ready-for-verification",
  "verification-failed",
  "accepted-with-closeout-pending",
  "accepted"
]);

export const executionPauseRecommendationSchema = z.object({
  type: phaseRunPauseTypeSchema,
  summary: z.string().min(1),
  detail: z.string().min(1),
  resumeRequirements: z.array(z.string().min(1)).min(1)
});

export const executionTaskOutcomeSchema = z.enum([
  "succeeded",
  "failed",
  "unknown"
]);

export const executionFailureStageSchema = z.enum([
  "task",
  "result-reporting",
  "cli-startup",
  "unknown"
]);

export const executionFailureKindSchema = z.enum([
  "rate-limit",
  "missing-structured-result",
  "cli-exit",
  "cli-startup",
  "unknown"
]);

export const executionResultSchema = z.object({
  runId: z.string().min(1),
  role: phaseOwnerSchema,
  provider: providerIdSchema,
  outcome: executionResultOutcomeSchema,
  decision: executionDecisionSchema.nullable().optional(),
  sliceRef: z.string().min(1).nullable().optional(),
  pauseRecommendation: executionPauseRecommendationSchema.nullable().optional(),
  riskHits: z.array(z.string().min(1)).nullable().optional(),
  taskOutcome: executionTaskOutcomeSchema.optional(),
  failureStage: executionFailureStageSchema.nullable().optional(),
  failureKind: executionFailureKindSchema.nullable().optional(),
  summary: z.string().min(1),
  changedFiles: z.array(z.string().min(1)),
  verification: z.array(verificationCommandResultSchema),
  evidenceRefs: z.array(z.string().min(1)),
  blocker: z.string().min(1).nullable().optional()
});

export const agentRunStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled"
]);

export const agentRunRecordSchema = z.object({
  runId: z.string().min(1),
  projectRoot: z.string().min(1),
  role: phaseOwnerSchema,
  provider: providerIdSchema,
  status: agentRunStatusSchema,
  createdAt: z.string().min(1),
  startedAt: z.string().min(1).nullable(),
  finishedAt: z.string().min(1).nullable(),
  packetPath: z.string().min(1),
  promptPath: z.string().min(1).nullable(),
  resultPath: z.string().min(1).nullable(),
  summaryPath: z.string().min(1).nullable(),
  stdoutPath: z.string().min(1).nullable(),
  stderrPath: z.string().min(1).nullable(),
  outcome: executionResultOutcomeSchema.nullable(),
  taskOutcome: executionTaskOutcomeSchema.optional(),
  failureStage: executionFailureStageSchema.nullable().optional(),
  failureKind: executionFailureKindSchema.nullable().optional(),
  statusDetail: z.string().min(1).nullable()
});

export type AgentRunRecord = z.infer<typeof agentRunRecordSchema>;
export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>;
export type ContextReference = z.infer<typeof contextReferenceSchema>;
export type ExecutionDecision = z.infer<typeof executionDecisionSchema>;
export type ExecutionPacket = z.infer<typeof executionPacketSchema>;
export type ExecutionPauseRecommendation = z.infer<
  typeof executionPauseRecommendationSchema
>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;
export type ExecutionResultOutcome = z.infer<typeof executionResultOutcomeSchema>;
export type ExecutionTaskOutcome = z.infer<typeof executionTaskOutcomeSchema>;
export type ExecutionFailureStage = z.infer<typeof executionFailureStageSchema>;
export type ExecutionFailureKind = z.infer<typeof executionFailureKindSchema>;
export type ProviderId = z.infer<typeof providerIdSchema>;
export type VerificationCommandResult = z.infer<
  typeof verificationCommandResultSchema
>;
export type ExecutionWorkflowEffect = z.infer<
  typeof executionWorkflowEffectSchema
>;
