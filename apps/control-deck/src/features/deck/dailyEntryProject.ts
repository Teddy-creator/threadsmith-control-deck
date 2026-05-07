const DAILY_ENTRY_PROJECT_STORAGE_KEY = "threadsmith.dailyEntryProjectRoot";

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem" | "removeItem">;

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function normalizeProjectRoot(projectRoot: string) {
  return projectRoot.trim();
}

export function normalizeDailyEntryProjectRoot(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedProjectRoot = normalizeProjectRoot(value);

  return normalizedProjectRoot || null;
}

export function readDailyEntryProjectRoot(
  storage: StorageReader | null = getBrowserStorage()
) {
  if (!storage) {
    return null;
  }

  try {
    return normalizeDailyEntryProjectRoot(
      storage.getItem(DAILY_ENTRY_PROJECT_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export function writeDailyEntryProjectRoot(
  projectRoot: string,
  storage: StorageWriter | null = getBrowserStorage()
) {
  if (!storage) {
    return;
  }

  const normalizedProjectRoot = normalizeDailyEntryProjectRoot(projectRoot);

  if (!normalizedProjectRoot) {
    storage.removeItem(DAILY_ENTRY_PROJECT_STORAGE_KEY);
    return;
  }

  storage.setItem(DAILY_ENTRY_PROJECT_STORAGE_KEY, normalizedProjectRoot);
}

export function clearDailyEntryProjectRoot(
  storage: StorageWriter | null = getBrowserStorage()
) {
  if (!storage) {
    return;
  }

  storage.removeItem(DAILY_ENTRY_PROJECT_STORAGE_KEY);
}

export { DAILY_ENTRY_PROJECT_STORAGE_KEY };
