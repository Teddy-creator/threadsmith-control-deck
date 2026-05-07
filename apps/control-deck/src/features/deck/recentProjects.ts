const RECENT_PROJECTS_STORAGE_KEY = "threadsmith.recentProjectRoots";
const MAX_RECENT_PROJECTS = 5;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

export interface RecentProjectEntry {
  projectRoot: string;
  pinned: boolean;
}

type StoredRecentProjectValue = string | RecentProjectEntry;

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function normalizeProjectRoot(projectRoot: string) {
  return projectRoot.trim();
}

function normalizeRecentProjectEntry(
  value: StoredRecentProjectValue
): RecentProjectEntry | null {
  if (typeof value === "string") {
    const projectRoot = normalizeProjectRoot(value);

    return projectRoot ? { projectRoot, pinned: false } : null;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.projectRoot === "string"
  ) {
    const projectRoot = normalizeProjectRoot(value.projectRoot);

    if (!projectRoot) {
      return null;
    }

    return {
      projectRoot,
      pinned: value.pinned === true
    };
  }

  return null;
}

function sortRecentProjectEntries(recentProjects: RecentProjectEntry[]) {
  const pinned = recentProjects.filter((entry) => entry.pinned);
  const unpinned = recentProjects.filter((entry) => !entry.pinned);

  return [...pinned, ...unpinned].slice(0, MAX_RECENT_PROJECTS);
}

function sanitizeRecentProjectEntries(
  recentProjects: StoredRecentProjectValue[]
): RecentProjectEntry[] {
  const dedupedProjects = new Map<string, RecentProjectEntry>();

  for (const value of recentProjects) {
    const normalizedEntry = normalizeRecentProjectEntry(value);

    if (!normalizedEntry) {
      continue;
    }

    const existingEntry = dedupedProjects.get(normalizedEntry.projectRoot);

    dedupedProjects.set(normalizedEntry.projectRoot, {
      projectRoot: normalizedEntry.projectRoot,
      pinned: existingEntry?.pinned === true || normalizedEntry.pinned
    });
  }

  return sortRecentProjectEntries([...dedupedProjects.values()]);
}

export function updateRecentProjectEntries(
  recentProjects: RecentProjectEntry[],
  projectRoot: string
) {
  const normalizedProjectRoot = normalizeProjectRoot(projectRoot);

  if (!normalizedProjectRoot) {
    return recentProjects;
  }

  const sanitizedProjects = sanitizeRecentProjectEntries(recentProjects);
  const existingEntry = sanitizedProjects.find(
    (entry) => entry.projectRoot === normalizedProjectRoot
  );

  if (existingEntry?.pinned) {
    return sanitizedProjects;
  }

  const pinnedProjects = sanitizedProjects.filter((entry) => entry.pinned);
  const unpinnedProjects = sanitizedProjects.filter(
    (entry) => !entry.pinned && entry.projectRoot !== normalizedProjectRoot
  );

  return sortRecentProjectEntries([
    ...pinnedProjects,
    {
      projectRoot: normalizedProjectRoot,
      pinned: false
    },
    ...unpinnedProjects
  ]);
}

export function pinRecentProjectEntry(
  recentProjects: RecentProjectEntry[],
  projectRoot: string
) {
  const normalizedProjectRoot = normalizeProjectRoot(projectRoot);

  if (!normalizedProjectRoot) {
    return sanitizeRecentProjectEntries(recentProjects);
  }

  const sanitizedProjects = sanitizeRecentProjectEntries(recentProjects).filter(
    (entry) => entry.projectRoot !== normalizedProjectRoot
  );
  const pinnedProjects = sanitizedProjects.filter((entry) => entry.pinned);
  const unpinnedProjects = sanitizedProjects.filter((entry) => !entry.pinned);

  return sortRecentProjectEntries([
    {
      projectRoot: normalizedProjectRoot,
      pinned: true
    },
    ...pinnedProjects,
    ...unpinnedProjects
  ]);
}

export function unpinRecentProjectEntry(
  recentProjects: RecentProjectEntry[],
  projectRoot: string
) {
  const normalizedProjectRoot = normalizeProjectRoot(projectRoot);

  if (!normalizedProjectRoot) {
    return sanitizeRecentProjectEntries(recentProjects);
  }

  const sanitizedProjects = sanitizeRecentProjectEntries(recentProjects).filter(
    (entry) => entry.projectRoot !== normalizedProjectRoot
  );
  const pinnedProjects = sanitizedProjects.filter((entry) => entry.pinned);
  const unpinnedProjects = sanitizedProjects.filter((entry) => !entry.pinned);

  return sortRecentProjectEntries([
    ...pinnedProjects,
    {
      projectRoot: normalizedProjectRoot,
      pinned: false
    },
    ...unpinnedProjects
  ]);
}

export function removeRecentProjectEntry(
  recentProjects: RecentProjectEntry[],
  projectRoot: string
) {
  const normalizedProjectRoot = normalizeProjectRoot(projectRoot);

  return sanitizeRecentProjectEntries(recentProjects).filter(
    (entry) => entry.projectRoot !== normalizedProjectRoot
  );
}

export function readRecentProjectEntries(
  storage: StorageReader | null = getBrowserStorage()
) {
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(RECENT_PROJECTS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sanitizeRecentProjectEntries(parsed);
  } catch {
    return [];
  }
}

export function writeRecentProjectEntries(
  recentProjects: RecentProjectEntry[],
  storage: StorageWriter | null = getBrowserStorage()
) {
  if (!storage) {
    return;
  }

  storage.setItem(
    RECENT_PROJECTS_STORAGE_KEY,
    JSON.stringify(sanitizeRecentProjectEntries(recentProjects))
  );
}

export { MAX_RECENT_PROJECTS, RECENT_PROJECTS_STORAGE_KEY };
