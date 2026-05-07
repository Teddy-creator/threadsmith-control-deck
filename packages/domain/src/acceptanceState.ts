import { z } from "zod";

export const implementationStatusSchema = z.enum([
  "not-started",
  "implementing",
  "ready-for-review"
]);

export const reviewStatusSchema = z.enum([
  "not-started",
  "in-review",
  "review-blocked",
  "ready-for-verification"
]);

export const verificationStatusSchema = z.enum([
  "not-started",
  "ready",
  "running",
  "failed",
  "passed"
]);

export const closeoutStatusSchema = z.enum([
  "not-started",
  "pending",
  "done"
]);

export const acceptanceFinalStateSchema = z.enum([
  "not-ready",
  "ready-for-review",
  "review-blocked",
  "ready-for-verification",
  "verification-failed",
  "accepted-with-closeout-pending",
  "accepted"
]);

export const doneWhenItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["pass", "fail", "unknown"])
});

export const acceptanceStateSchema = z.object({
  currentClaim: z.string().min(1),
  doneWhenChecklist: z.array(doneWhenItemSchema),
  implementationStatus: implementationStatusSchema,
  reviewStatus: reviewStatusSchema,
  verificationStatus: verificationStatusSchema,
  closeoutStatus: closeoutStatusSchema,
  knownGaps: z.array(z.string().min(1)),
  finalState: acceptanceFinalStateSchema
});

export type AcceptanceState = z.infer<typeof acceptanceStateSchema>;
export type DoneWhenItem = z.infer<typeof doneWhenItemSchema>;
