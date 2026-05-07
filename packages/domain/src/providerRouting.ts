import { z } from "zod";
import { providerIdSchema } from "./agentRuns.ts";

export const conductorSurfaceSchema = z.enum([
  "codex-desktop",
  "codex-cli",
  "claude-cli"
]);

export const providerRoutingSchema = z.object({
  planner: providerIdSchema.default("codex"),
  executor: providerIdSchema.default("codex"),
  reviewer: providerIdSchema.default("codex"),
  verifier: providerIdSchema.default("codex"),
  closeout: providerIdSchema.default("codex"),
  conductorSurface: conductorSurfaceSchema.default("codex-desktop")
});

export type ConductorSurface = z.infer<typeof conductorSurfaceSchema>;
export type ProviderRouting = z.infer<typeof providerRoutingSchema>;
