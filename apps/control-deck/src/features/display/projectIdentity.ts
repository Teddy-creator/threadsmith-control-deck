export interface ProjectIdentity {
  name: string;
  path: string;
}

function normalizeProjectRoot(projectRoot: string) {
  return projectRoot.trim();
}

export function getProjectDisplayName(
  projectRoot: string,
  fallback = "未命名项目"
) {
  const normalized = normalizeProjectRoot(projectRoot).replace(/[\\/]+$/, "");

  if (!normalized) {
    return fallback;
  }

  const segments = normalized.split(/[\\/]/).filter(Boolean);

  return segments.at(-1) ?? fallback;
}

export function buildProjectIdentity(
  projectRoot: string,
  fallback = "未命名项目",
  preferredDisplayName?: string
): ProjectIdentity {
  const path = normalizeProjectRoot(projectRoot);

  return {
    name: preferredDisplayName?.trim() || getProjectDisplayName(path, fallback),
    path
  };
}
