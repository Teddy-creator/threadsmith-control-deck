import { describe, expect, it } from "vitest";
import {
  clearDailyEntryProjectRoot,
  DAILY_ENTRY_PROJECT_STORAGE_KEY,
  normalizeDailyEntryProjectRoot,
  readDailyEntryProjectRoot,
  writeDailyEntryProjectRoot
} from "./dailyEntryProject";

function createStorage(initialValue?: string) {
  const store = new Map<string, string>();

  if (initialValue !== undefined) {
    store.set(DAILY_ENTRY_PROJECT_STORAGE_KEY, initialValue);
  }

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    }
  };
}

describe("normalizeDailyEntryProjectRoot", () => {
  it("trims a valid project root", () => {
    expect(normalizeDailyEntryProjectRoot("  /tmp/threadsmith  ")).toBe(
      "/tmp/threadsmith"
    );
  });

  it("returns null for empty or invalid payloads", () => {
    expect(normalizeDailyEntryProjectRoot("   ")).toBeNull();
    expect(normalizeDailyEntryProjectRoot(42)).toBeNull();
  });
});

describe("daily entry project storage", () => {
  it("reads a sanitized project root", () => {
    const storage = createStorage(" /tmp/daily-entry ");

    expect(readDailyEntryProjectRoot(storage)).toBe("/tmp/daily-entry");
  });

  it("writes a normalized project root", () => {
    const storage = createStorage();

    writeDailyEntryProjectRoot(" /tmp/daily-entry ", storage);

    expect(storage.getItem(DAILY_ENTRY_PROJECT_STORAGE_KEY)).toBe(
      "/tmp/daily-entry"
    );
  });

  it("clears storage when writing an empty value", () => {
    const storage = createStorage("/tmp/daily-entry");

    writeDailyEntryProjectRoot("   ", storage);

    expect(storage.getItem(DAILY_ENTRY_PROJECT_STORAGE_KEY)).toBeNull();
  });

  it("can clear the stored project explicitly", () => {
    const storage = createStorage("/tmp/daily-entry");

    clearDailyEntryProjectRoot(storage);

    expect(storage.getItem(DAILY_ENTRY_PROJECT_STORAGE_KEY)).toBeNull();
  });
});
