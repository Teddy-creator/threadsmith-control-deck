import {
  repoMapSchema,
  type ContextPacketRelevantFile,
  type RepoMap,
  type RepoMapDirectory,
  type RepoMapEntryPoint,
  type RepoMapGit,
  type RepoMapPackageManifest,
  type RepoMapSourceDirectory
} from "@threadsmith/domain";

export interface RepoMapManifestInput {
  path: string;
  contents: unknown;
}

export interface BuildRepoMapOptions {
  generatedAt?: string;
  mapId?: string;
  projectRootLabel: string;
  topLevelDirectories?: string[];
  manifestFiles?: RepoMapManifestInput[];
  existingDirectories?: string[];
  git?: Partial<RepoMapGit>;
  warnings?: string[];
}

const SOURCE_DIRECTORY_CANDIDATES = [
  { path: "src", kind: "source" as const },
  { path: "test", kind: "test" as const },
  { path: "tests", kind: "test" as const },
  { path: "e2e", kind: "e2e" as const },
  { path: "scripts", kind: "script" as const }
];

const ENTRY_FILE_CANDIDATES = [
  "src/index.ts",
  "src/index.tsx",
  "src/main.ts",
  "src/main.tsx",
  "src/App.tsx",
  "server/index.ts",
  "server/app.ts",
  "index.ts",
  "index.js"
];

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/g, "");
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function manifestName(contents: unknown) {
  if (!isRecord(contents) || typeof contents.name !== "string") {
    return null;
  }
  return contents.name;
}

function manifestPrivate(contents: unknown) {
  if (!isRecord(contents) || typeof contents.private !== "boolean") {
    return null;
  }
  return contents.private;
}

function manifestScripts(contents: unknown) {
  if (!isRecord(contents) || !isRecord(contents.scripts)) {
    return [];
  }
  return Object.keys(contents.scripts).sort();
}

function manifestWorkspaces(contents: unknown) {
  if (!isRecord(contents)) {
    return [];
  }

  if (Array.isArray(contents.workspaces)) {
    return asStringArray(contents.workspaces).sort();
  }

  if (isRecord(contents.workspaces) && Array.isArray(contents.workspaces.packages)) {
    return asStringArray(contents.workspaces.packages).sort();
  }

  return [];
}

function toPackageManifest(input: RepoMapManifestInput): RepoMapPackageManifest {
  return {
    name: manifestName(input.contents),
    path: normalizePath(input.path),
    private: manifestPrivate(input.contents),
    scripts: manifestScripts(input.contents),
    workspaces: manifestWorkspaces(input.contents)
  };
}

function directoryRole(path: string): RepoMapDirectory["role"] {
  if (path === "apps") {
    return "app";
  }
  if (path === "packages") {
    return "package";
  }
  if (path === "src") {
    return "source";
  }
  if (path === "test" || path === "tests") {
    return "test";
  }
  if (path === "docs") {
    return "docs";
  }
  if (path === ".threadsmith" || path.endsWith("-runtime")) {
    return "runtime";
  }
  if (path === "scripts" || path === ".github") {
    return "config";
  }
  return "unknown";
}

function buildTopLevelDirectories(paths: string[]): RepoMapDirectory[] {
  return uniqueValues(paths.map(normalizePath))
    .sort()
    .map((path) => ({
      path,
      role: directoryRole(path)
    }));
}

function workspaceRootFromManifest(path: string) {
  const normalized = normalizePath(path);
  return normalized.endsWith("/package.json")
    ? normalized.slice(0, -"/package.json".length)
    : "";
}

function buildSourceDirectories(existingDirectories: string[]) {
  const existing = new Set(existingDirectories.map(normalizePath));
  const sourceDirectories: RepoMapSourceDirectory[] = [];

  for (const candidate of SOURCE_DIRECTORY_CANDIDATES) {
    if (existing.has(candidate.path)) {
      sourceDirectories.push(candidate);
    }
  }

  for (const directoryPath of [...existing].sort()) {
    if (
      directoryPath.endsWith("/src") ||
      directoryPath.endsWith("/test") ||
      directoryPath.endsWith("/tests") ||
      directoryPath.endsWith("/e2e")
    ) {
      const kind = directoryPath.endsWith("/e2e")
        ? "e2e"
        : directoryPath.endsWith("/test") || directoryPath.endsWith("/tests")
          ? "test"
          : "source";
      sourceDirectories.push({ path: directoryPath, kind });
    }
  }

  return sourceDirectories.slice(0, 24);
}

function buildEntryPoints(args: {
  rootPackage: RepoMapPackageManifest | null;
  workspacePackages: RepoMapPackageManifest[];
  existingDirectories: string[];
}) {
  const entries: RepoMapEntryPoint[] = [];
  const existing = new Set(args.existingDirectories.map(normalizePath));

  if (args.rootPackage) {
    entries.push({
      path: args.rootPackage.path,
      kind: "package-manifest",
      reason: "Root package manifest defines workspace scripts and package manager."
    });
  }

  for (const workspacePackage of args.workspacePackages.slice(0, 12)) {
    entries.push({
      path: workspacePackage.path,
      kind: "workspace-manifest",
      reason: workspacePackage.name
        ? `Workspace manifest for ${workspacePackage.name}.`
        : "Workspace package manifest."
    });

    const workspaceRoot = workspaceRootFromManifest(workspacePackage.path);
    for (const candidate of ENTRY_FILE_CANDIDATES) {
      const entryPath = workspaceRoot ? `${workspaceRoot}/${candidate}` : candidate;
      if (existing.has(entryPath)) {
        entries.push({
          path: entryPath,
          kind: candidate.includes("test") ? "test-entry" : "source-entry",
          reason: "Likely source entry point for this workspace."
        });
        break;
      }
    }
  }

  if (existing.has(".github/workflows/ci.yml")) {
    entries.push({
      path: ".github/workflows/ci.yml",
      kind: "config",
      reason: "CI workflow documents the release verification path."
    });
  }

  return entries.slice(0, 32);
}

function buildGit(git?: Partial<RepoMapGit>): RepoMapGit {
  return {
    status: git?.status ?? "unknown",
    changedFiles: uniqueValues(git?.changedFiles ?? []).slice(0, 48),
    command: git?.command ?? null
  };
}

function buildMapId(projectRootLabel: string, generatedAt: string) {
  const slug =
    projectRootLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project";
  const timestampSlug = generatedAt.replace(/[^0-9TZ]/g, "");
  return `repo-${slug}-${timestampSlug}`;
}

export function buildRepoMap(options: BuildRepoMapOptions): RepoMap {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const manifestFiles = [...(options.manifestFiles ?? [])]
    .map((input) => ({ ...input, path: normalizePath(input.path) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const packageManifests = manifestFiles.map(toPackageManifest);
  const rootPackage =
    packageManifests.find((manifest) => manifest.path === "package.json") ?? null;
  const workspacePackages = packageManifests.filter(
    (manifest) => manifest.path !== "package.json"
  );
  const existingDirectories = uniqueValues([
    ...(options.existingDirectories ?? []),
    ...(options.topLevelDirectories ?? [])
  ]);

  return repoMapSchema.parse({
    mapId: options.mapId ?? buildMapId(options.projectRootLabel, generatedAt),
    generatedAt,
    projectRootLabel: options.projectRootLabel,
    packageManager:
      rootPackage && isRecord(manifestFiles.find((item) => item.path === "package.json")?.contents)
        ? String(
            (manifestFiles.find((item) => item.path === "package.json")
              ?.contents as Record<string, unknown>).packageManager ?? ""
          ) || null
        : null,
    rootPackage,
    workspacePackages,
    topLevelDirectories: buildTopLevelDirectories(options.topLevelDirectories ?? []),
    sourceDirectories: buildSourceDirectories(existingDirectories),
    entryPoints: buildEntryPoints({
      rootPackage,
      workspacePackages,
      existingDirectories
    }),
    git: buildGit(options.git),
    warnings: options.warnings ?? []
  });
}

export function deriveRepoMapRelevantFiles(
  repoMap: RepoMap,
  limit = 8
): ContextPacketRelevantFile[] {
  const changedFiles = repoMap.git.changedFiles.map((path) => ({
    path,
    reason: "Changed file from current git status.",
    source: "repo-map" as const
  }));
  const entryPoints = repoMap.entryPoints.map((entry) => ({
    path: entry.path,
    reason: entry.reason,
    source: "repo-map" as const
  }));
  const packageManifests = [
    repoMap.rootPackage,
    ...repoMap.workspacePackages
  ].flatMap((manifest) =>
    manifest
      ? [{
          path: manifest.path,
          reason: manifest.name
            ? `Package manifest for ${manifest.name}.`
            : "Package manifest.",
          source: "repo-map" as const
        }]
      : []
  );

  const seen = new Set<string>();
  return [...changedFiles, ...entryPoints, ...packageManifests]
    .filter((file) => {
      if (seen.has(file.path)) {
        return false;
      }
      seen.add(file.path);
      return true;
    })
    .slice(0, limit);
}
