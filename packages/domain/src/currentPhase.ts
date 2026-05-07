import { z } from "zod";

export const phaseOwnerSchema = z.enum([
  "planner",
  "executor",
  "reviewer",
  "verifier",
  "closeout",
  "hygiene"
]);

export const currentPhaseSchema = z.object({
  phaseName: z.string().min(1),
  phaseGoal: z.string().min(1),
  deliverable: z.string().min(1),
  inScope: z.array(z.string().min(1)),
  outOfScope: z.array(z.string().min(1)),
  stopCondition: z.string().min(1),
  verificationForThisPhase: z.array(z.string().min(1)),
  activeOwners: z.array(phaseOwnerSchema),
  blockedBy: z.array(z.string().min(1))
});

export type CurrentPhase = z.infer<typeof currentPhaseSchema>;
export type PhaseOwner = z.infer<typeof phaseOwnerSchema>;
