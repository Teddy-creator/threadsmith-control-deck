import { z } from "zod";
import {
  skillAdapterAvailabilitySchema,
  skillRoutePreferenceSchema
} from "./skillOrchestrator.ts";

export const skillRoutingGeneratedFromSchema = z.object({
  discoveryGeneratedAt: z.string().min(1).nullable().default(null),
  discoverySkillCount: z.number().int().nonnegative().default(0)
});

export const disabledSkillAdapterSchema = z.object({
  adapterId: z.string().min(1),
  reason: z.string().min(1).nullable().default(null)
});

export const skillRoutingConfigSchema = z.object({
  version: z.literal(1).default(1),
  updatedAt: z.string().min(1).nullable().default(null),
  generatedFrom: skillRoutingGeneratedFromSchema.default({
    discoveryGeneratedAt: null,
    discoverySkillCount: 0
  }),
  routePreferences: z.array(skillRoutePreferenceSchema).default([]),
  disabledAdapters: z.array(disabledSkillAdapterSchema).default([]),
  fallbackAvailability: skillAdapterAvailabilitySchema.default("missing"),
  notes: z.array(z.string().min(1)).default([])
}).superRefine((value, context) => {
  const preferenceKeys = new Set<string>();
  for (const [index, preference] of value.routePreferences.entries()) {
    const key = `${preference.role ?? "*"}:${preference.capability}`;
    if (preferenceKeys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["routePreferences", index],
        message: "routePreferences must be unique per role/capability"
      });
    }
    preferenceKeys.add(key);
  }

  const disabledAdapterIds = new Set<string>();
  for (const [index, disabledAdapter] of value.disabledAdapters.entries()) {
    if (disabledAdapterIds.has(disabledAdapter.adapterId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["disabledAdapters", index, "adapterId"],
        message: "disabledAdapters must be unique"
      });
    }
    disabledAdapterIds.add(disabledAdapter.adapterId);
  }
});

export type DisabledSkillAdapter = z.infer<typeof disabledSkillAdapterSchema>;
export type SkillRoutingConfig = z.infer<typeof skillRoutingConfigSchema>;
export type SkillRoutingGeneratedFrom = z.infer<
  typeof skillRoutingGeneratedFromSchema
>;
