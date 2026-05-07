import { z } from "zod";

export const continuationBehaviorSchema = z.enum([
  "return-current-thread",
  "smart-continuation",
  "ask-every-time"
]);

export const preferenceScopeSchema = z.enum(["project", "global"]);

export const continuationBehaviorSourceSchema = z.enum([
  "project-default",
  "global-default",
  "fallback"
]);

export const storedPreferencesSchema = z.object({
  continuationBehavior: continuationBehaviorSchema.optional()
});

export const resolvedContinuationPreferenceSchema = z.object({
  continuationBehavior: continuationBehaviorSchema,
  continuationBehaviorSource: continuationBehaviorSourceSchema
});

export const preferencesSchema = z.object({
  projectDefault: continuationBehaviorSchema.nullable(),
  globalDefault: continuationBehaviorSchema.nullable(),
  resolved: resolvedContinuationPreferenceSchema
});

export type ContinuationBehavior = z.infer<typeof continuationBehaviorSchema>;
export type PreferenceScope = z.infer<typeof preferenceScopeSchema>;
export type ContinuationBehaviorSource = z.infer<
  typeof continuationBehaviorSourceSchema
>;
export type StoredPreferences = z.infer<typeof storedPreferencesSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;

export function resolveContinuationBehavior(
  projectDefault?: ContinuationBehavior | null,
  globalDefault?: ContinuationBehavior | null,
  fallback: ContinuationBehavior = "ask-every-time"
) {
  if (projectDefault) {
    return resolvedContinuationPreferenceSchema.parse({
      continuationBehavior: projectDefault,
      continuationBehaviorSource: "project-default"
    });
  }

  if (globalDefault) {
    return resolvedContinuationPreferenceSchema.parse({
      continuationBehavior: globalDefault,
      continuationBehaviorSource: "global-default"
    });
  }

  return resolvedContinuationPreferenceSchema.parse({
    continuationBehavior: fallback,
    continuationBehaviorSource: "fallback"
  });
}

export function createPreferences(
  projectDefault?: ContinuationBehavior | null,
  globalDefault?: ContinuationBehavior | null,
  fallback: ContinuationBehavior = "ask-every-time"
): Preferences {
  return preferencesSchema.parse({
    projectDefault: projectDefault ?? null,
    globalDefault: globalDefault ?? null,
    resolved: resolveContinuationBehavior(projectDefault, globalDefault, fallback)
  });
}
