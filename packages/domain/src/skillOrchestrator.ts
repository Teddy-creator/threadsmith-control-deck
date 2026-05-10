import { z } from "zod";
import { phaseOwnerSchema } from "./currentPhase.ts";

export const miniProtocolIdSchema = z.enum([
  "brief",
  "plan",
  "debug",
  "review",
  "verify",
  "closeout",
  "handoff",
  "recover",
  "research"
]);

export const skillCapabilitySchema = z.enum([
  ...miniProtocolIdSchema.options,
  "implement",
  "frontend",
  "docs"
]);

export const skillAdapterAvailabilitySchema = z.enum([
  "available",
  "missing",
  "stale",
  "disabled",
  "unsafe"
]);

export const skillRouteSourceSchema = z.enum([
  "built-in",
  "external-adapter",
  "fallback"
]);

export const skillAdapterEntryKindSchema = z.enum([
  "codex-skill",
  "cli",
  "human"
]);

export const skillAdapterEntrySchema = z.object({
  kind: skillAdapterEntryKindSchema,
  ref: z.string().min(1)
});

export const skillAdapterSafetySchema = z.object({
  canMutateCommittedTruth: z.boolean(),
  canMutateGlobalSkill: z.boolean(),
  forbiddenPaths: z.array(z.string().min(1)).default([])
});

export const skillAdapterDeclarationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  capabilities: z.array(skillCapabilitySchema).min(1),
  entry: skillAdapterEntrySchema,
  fallbackProtocol: miniProtocolIdSchema,
  availability: skillAdapterAvailabilitySchema.default("available"),
  safety: skillAdapterSafetySchema
});

export const skillRoutePreferenceSchema = z.object({
  role: phaseOwnerSchema.nullable().default(null),
  capability: skillCapabilitySchema,
  adapterId: z.string().min(1),
  reason: z.string().min(1).nullable().default(null)
});

export interface SelfHostingBoundaryInput {
  activeController: "installed-skill" | "repo-source";
  repositorySkillPath: string;
  installedSkillPath: string | null;
  allowGlobalSkillMutation: boolean;
}

function normalizeSkillPathForComparison(path: string): string {
  return path.trim().replaceAll("\\", "/").replace(/\/+$/, "");
}

function looksLikeGlobalCodexSkillPath(path: string): boolean {
  const normalizedPath = normalizeSkillPathForComparison(path);

  return (
    normalizedPath.startsWith("~/.codex/skills/") ||
    normalizedPath.includes("/.codex/skills/")
  );
}

export function getSelfHostingSafetyWarnings(
  selfHosting: SelfHostingBoundaryInput
): string[] {
  const warnings: string[] = [];
  const repositorySkillPath = normalizeSkillPathForComparison(
    selfHosting.repositorySkillPath
  );
  const installedSkillPath = selfHosting.installedSkillPath
    ? normalizeSkillPathForComparison(selfHosting.installedSkillPath)
    : null;

  if (selfHosting.allowGlobalSkillMutation) {
    warnings.push("Self-hosting config must not allow global skill mutation.");
  }

  if (selfHosting.activeController === "installed-skill" && !installedSkillPath) {
    warnings.push("Installed-skill controller requires installedSkillPath.");
  }

  if (installedSkillPath && repositorySkillPath === installedSkillPath) {
    warnings.push(
      "repositorySkillPath must stay separate from installedSkillPath."
    );
  }

  if (
    selfHosting.activeController === "repo-source" &&
    looksLikeGlobalCodexSkillPath(repositorySkillPath)
  ) {
    warnings.push(
      "Repo-source controller must point at repository skill source, not the installed global Codex skill path."
    );
  }

  return warnings;
}

export const skillOrchestratorSelfHostingSchema = z.object({
  activeController: z.enum(["installed-skill", "repo-source"]),
  repositorySkillPath: z.string().min(1),
  installedSkillPath: z.string().min(1).nullable(),
  allowGlobalSkillMutation: z.boolean()
}).superRefine((value, context) => {
  if (value.activeController === "installed-skill" && !value.installedSkillPath) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["installedSkillPath"],
      message: "installed-skill controller requires installedSkillPath"
    });
  }

  if (
    value.installedSkillPath &&
    normalizeSkillPathForComparison(value.repositorySkillPath) ===
      normalizeSkillPathForComparison(value.installedSkillPath)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["repositorySkillPath"],
      message: "repositorySkillPath must not equal installedSkillPath"
    });
  }

  if (
    value.activeController === "repo-source" &&
    looksLikeGlobalCodexSkillPath(value.repositorySkillPath)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["repositorySkillPath"],
      message:
        "repo-source controller must point at repository skill source, not installed global Codex skill path"
    });
  }
});

export const skillOrchestratorConfigSchema = z.object({
  version: z.literal(1),
  builtInProtocols: z.array(miniProtocolIdSchema).min(1),
  adapters: z.array(skillAdapterDeclarationSchema).default([]),
  routePreferences: z.array(skillRoutePreferenceSchema).default([]),
  defaultFallback: miniProtocolIdSchema,
  selfHosting: skillOrchestratorSelfHostingSchema
}).superRefine((value, context) => {
  if (!value.builtInProtocols.includes(value.defaultFallback)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["defaultFallback"],
      message: "defaultFallback must be one of builtInProtocols"
    });
  }

  if (value.selfHosting.allowGlobalSkillMutation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["selfHosting", "allowGlobalSkillMutation"],
      message: "self-hosting defaults must not allow global skill mutation"
    });
  }

  const adapterIds = new Set<string>();
  for (const [index, adapter] of value.adapters.entries()) {
    if (adapterIds.has(adapter.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adapters", index, "id"],
        message: "adapter ids must be unique"
      });
    }
    adapterIds.add(adapter.id);

    if (!value.builtInProtocols.includes(adapter.fallbackProtocol)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adapters", index, "fallbackProtocol"],
        message: "adapter fallbackProtocol must be one of builtInProtocols"
      });
    }
  }

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
});

export const skillRouteDecisionSchema = z.object({
  role: phaseOwnerSchema,
  requestedCapability: skillCapabilitySchema,
  selectedProtocol: miniProtocolIdSchema,
  selectedAdapterId: z.string().min(1).nullable(),
  source: skillRouteSourceSchema,
  availability: skillAdapterAvailabilitySchema,
  reason: z.string().min(1),
  safetyWarnings: z.array(z.string().min(1))
});

export type MiniProtocolId = z.infer<typeof miniProtocolIdSchema>;
export type SkillAdapterAvailability = z.infer<
  typeof skillAdapterAvailabilitySchema
>;
export type SkillAdapterDeclaration = z.infer<
  typeof skillAdapterDeclarationSchema
>;
export type SkillAdapterEntry = z.infer<typeof skillAdapterEntrySchema>;
export type SkillAdapterEntryKind = z.infer<typeof skillAdapterEntryKindSchema>;
export type SkillAdapterSafety = z.infer<typeof skillAdapterSafetySchema>;
export type SkillCapability = z.infer<typeof skillCapabilitySchema>;
export type SkillOrchestratorConfig = z.infer<
  typeof skillOrchestratorConfigSchema
>;
export type SkillOrchestratorSelfHosting = z.infer<
  typeof skillOrchestratorSelfHostingSchema
>;
export type SkillRouteDecision = z.infer<typeof skillRouteDecisionSchema>;
export type SkillRoutePreference = z.infer<typeof skillRoutePreferenceSchema>;
export type SkillRouteSource = z.infer<typeof skillRouteSourceSchema>;
