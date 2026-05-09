import { z } from "zod";

export const repoMapGitStatusSchema = z.enum(["clean", "dirty", "unknown"]);

export const repoMapDirectoryRoleSchema = z.enum([
  "app",
  "package",
  "source",
  "test",
  "docs",
  "config",
  "runtime",
  "unknown"
]);

export const repoMapEntryPointKindSchema = z.enum([
  "package-manifest",
  "workspace-manifest",
  "source-entry",
  "test-entry",
  "script",
  "config"
]);

export const repoMapPackageManifestSchema = z.object({
  name: z.string().min(1).nullable(),
  path: z.string().min(1),
  private: z.boolean().nullable(),
  scripts: z.array(z.string().min(1)),
  workspaces: z.array(z.string().min(1))
});

export const repoMapDirectorySchema = z.object({
  path: z.string().min(1),
  role: repoMapDirectoryRoleSchema
});

export const repoMapSourceDirectorySchema = z.object({
  path: z.string().min(1),
  kind: z.enum(["source", "test", "e2e", "script", "app", "package"])
});

export const repoMapEntryPointSchema = z.object({
  path: z.string().min(1),
  kind: repoMapEntryPointKindSchema,
  reason: z.string().min(1)
});

export const repoMapGitSchema = z.object({
  status: repoMapGitStatusSchema,
  changedFiles: z.array(z.string().min(1)),
  command: z.string().min(1).nullable()
});

export const repoMapSchema = z.object({
  mapId: z.string().min(1),
  generatedAt: z.string().min(1),
  projectRootLabel: z.string().min(1),
  packageManager: z.string().min(1).nullable(),
  rootPackage: repoMapPackageManifestSchema.nullable(),
  workspacePackages: z.array(repoMapPackageManifestSchema),
  topLevelDirectories: z.array(repoMapDirectorySchema),
  sourceDirectories: z.array(repoMapSourceDirectorySchema),
  entryPoints: z.array(repoMapEntryPointSchema),
  git: repoMapGitSchema,
  warnings: z.array(z.string().min(1))
});

export type RepoMap = z.infer<typeof repoMapSchema>;
export type RepoMapDirectory = z.infer<typeof repoMapDirectorySchema>;
export type RepoMapEntryPoint = z.infer<typeof repoMapEntryPointSchema>;
export type RepoMapGit = z.infer<typeof repoMapGitSchema>;
export type RepoMapPackageManifest = z.infer<
  typeof repoMapPackageManifestSchema
>;
export type RepoMapSourceDirectory = z.infer<
  typeof repoMapSourceDirectorySchema
>;
