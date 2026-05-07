import { z } from "zod";
import {
  executionResultOutcomeSchema,
  providerIdSchema
} from "./agentRuns.ts";
import { phaseOwnerSchema } from "./currentPhase.ts";

export const workflowTransitionIdSchema = z.enum([
  "executor-ready-for-review",
  "reviewer-blocked",
  "reviewer-ready-for-verification",
  "verifier-failed",
  "verifier-accepted",
  "closeout-complete"
]);

export const workflowEventKindSchema = z.enum([
  "deck-action",
  "workflow-transition",
  "agent-run",
  "phase-run"
]);

export const workflowEventSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  kind: workflowEventKindSchema,
  title: z.string().min(1),
  detail: z.string().min(1),
  role: phaseOwnerSchema.optional(),
  actionId: z.string().min(1).optional(),
  transitionId: workflowTransitionIdSchema.optional(),
  artifactPath: z.string().min(1).optional(),
  runId: z.string().min(1).optional(),
  provider: providerIdSchema.optional(),
  outcome: executionResultOutcomeSchema.optional()
});

export type WorkflowTransitionId = z.infer<typeof workflowTransitionIdSchema>;
export type WorkflowEvent = z.infer<typeof workflowEventSchema>;
