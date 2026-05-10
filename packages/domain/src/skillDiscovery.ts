import { z } from "zod";
import {
  skillAdapterAvailabilitySchema,
  skillCapabilitySchema
} from "./skillOrchestrator.ts";

export const discoveredSkillSourceSchema = z.enum([
  "global-codex",
  "project-codex",
  "repo",
  "unknown"
]);

export const discoveredSkillFrontmatterSchema = z.object({
  name: z.string().min(1).nullable(),
  description: z.string().min(1).nullable()
});

export const discoveredSkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1).nullable(),
  skillPath: z.string().min(1),
  source: discoveredSkillSourceSchema,
  sourceRoot: z.string().min(1),
  relativePath: z.string().min(1),
  frontmatter: discoveredSkillFrontmatterSchema,
  bodyPreview: z.string(),
  capabilities: z.array(skillCapabilitySchema),
  health: skillAdapterAvailabilitySchema,
  warnings: z.array(z.string().min(1))
});

export const skillDiscoveryRootSchema = z.object({
  root: z.string().min(1),
  source: discoveredSkillSourceSchema
});

export const skillDiscoverySummarySchema = z.object({
  generatedAt: z.string().min(1),
  roots: z.array(skillDiscoveryRootSchema),
  skills: z.array(discoveredSkillSchema),
  counts: z.object({
    total: z.number().int().nonnegative(),
    available: z.number().int().nonnegative(),
    missing: z.number().int().nonnegative(),
    stale: z.number().int().nonnegative(),
    disabled: z.number().int().nonnegative(),
    unsafe: z.number().int().nonnegative()
  }),
  warnings: z.array(z.string().min(1))
});

export type DiscoveredSkill = z.infer<typeof discoveredSkillSchema>;
export type DiscoveredSkillFrontmatter = z.infer<
  typeof discoveredSkillFrontmatterSchema
>;
export type DiscoveredSkillSource = z.infer<typeof discoveredSkillSourceSchema>;
export type SkillDiscoveryRoot = z.infer<typeof skillDiscoveryRootSchema>;
export type SkillDiscoverySummary = z.infer<typeof skillDiscoverySummarySchema>;
