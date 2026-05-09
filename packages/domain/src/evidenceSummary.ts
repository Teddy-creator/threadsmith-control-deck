import { z } from "zod";
import {
  verificationCommandResultSchema,
  verificationCommandStatusSchema
} from "./agentRuns.ts";

export const evidenceSummaryStatusSchema = z.enum([
  "empty",
  "passed",
  "failed",
  "mixed",
  "running",
  "unknown"
]);

export const evidenceSummaryCommandSchema = verificationCommandResultSchema.extend({
  exitCode: z.number().int().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  failureFocus: z.string().min(1).nullable().optional(),
  artifactRefs: z.array(z.string().min(1))
});

export const evidenceSummaryArtifactSchema = z.object({
  path: z.string().min(1),
  kind: z.enum(["stdout", "stderr", "trace", "report", "summary", "other"]),
  description: z.string().min(1).nullable()
});

export const evidenceSummarySchema = z.object({
  summaryId: z.string().min(1),
  generatedAt: z.string().min(1),
  status: evidenceSummaryStatusSchema,
  headline: z.string().min(1),
  detail: z.string().min(1),
  commands: z.array(evidenceSummaryCommandSchema),
  artifactRefs: z.array(evidenceSummaryArtifactSchema),
  failureFocus: z.string().min(1).nullable(),
  source: z.enum(["manual", "verification", "agent-run", "empty"]),
  warnings: z.array(z.string().min(1))
});

export type EvidenceSummary = z.infer<typeof evidenceSummarySchema>;
export type EvidenceSummaryArtifact = z.infer<
  typeof evidenceSummaryArtifactSchema
>;
export type EvidenceSummaryCommand = z.infer<typeof evidenceSummaryCommandSchema>;
export type EvidenceSummaryStatus = z.infer<typeof evidenceSummaryStatusSchema>;
export type VerificationCommandStatus = z.infer<
  typeof verificationCommandStatusSchema
>;
