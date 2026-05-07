const ENTRY_MODE_PREFERENCE_STORAGE_KEY = "threadsmith.entryModePreference";

export type EntryModePreference = "app-home" | "direct-project";

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem" | "removeItem">;

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function normalizeEntryModePreference(value: unknown): EntryModePreference | null {
  if (value === "app-home" || value === "direct-project") {
    return value;
  }

  return null;
}

export function readEntryModePreference(
  storage: StorageReader | null = getBrowserStorage()
) {
  if (!storage) {
    return null;
  }

  try {
    return normalizeEntryModePreference(
      storage.getItem(ENTRY_MODE_PREFERENCE_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export function writeEntryModePreference(
  value: EntryModePreference,
  storage: StorageWriter | null = getBrowserStorage()
) {
  if (!storage) {
    return;
  }

  const normalized = normalizeEntryModePreference(value);

  if (!normalized) {
    storage.removeItem(ENTRY_MODE_PREFERENCE_STORAGE_KEY);
    return;
  }

  storage.setItem(ENTRY_MODE_PREFERENCE_STORAGE_KEY, normalized);
}

export function clearEntryModePreference(
  storage: StorageWriter | null = getBrowserStorage()
) {
  if (!storage) {
    return;
  }

  storage.removeItem(ENTRY_MODE_PREFERENCE_STORAGE_KEY);
}

export { ENTRY_MODE_PREFERENCE_STORAGE_KEY };
