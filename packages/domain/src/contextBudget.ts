import { z } from "zod";

export const contextBudgetLevelSchema = z.enum([
  "compact",
  "watch",
  "heavy",
  "over-budget"
]);

export const contextBudgetSectionSchema = z.object({
  section: z.string().min(1),
  estimatedChars: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  level: contextBudgetLevelSchema,
  advice: z.string().min(1).nullable()
});

export const contextBudgetLedgerSchema = z.object({
  estimatedChars: z.number().int().nonnegative(),
  estimatedTokens: z.number().int().nonnegative(),
  budgetLevel: contextBudgetLevelSchema,
  method: z.literal("heuristic-json-char-estimate-v1"),
  limits: z.object({
    watchChars: z.number().int().positive(),
    heavyChars: z.number().int().positive(),
    overBudgetChars: z.number().int().positive()
  }),
  sections: z.array(contextBudgetSectionSchema),
  heaviestSections: z.array(contextBudgetSectionSchema),
  warnings: z.array(z.string().min(1)),
  compressionAdvice: z.array(z.string().min(1))
});

export type ContextBudgetLedger = z.infer<typeof contextBudgetLedgerSchema>;
export type ContextBudgetLevel = z.infer<typeof contextBudgetLevelSchema>;
export type ContextBudgetSection = z.infer<typeof contextBudgetSectionSchema>;
