import { describe, expect, it, vi } from "vitest";
import {
  clearEntryModePreference,
  ENTRY_MODE_PREFERENCE_STORAGE_KEY,
  normalizeEntryModePreference,
  readEntryModePreference,
  writeEntryModePreference
} from "./entryModePreference";

describe("entryModePreference", () => {
  it("normalizes only supported modes", () => {
    expect(normalizeEntryModePreference("app-home")).toBe("app-home");
    expect(normalizeEntryModePreference("direct-project")).toBe("direct-project");
    expect(normalizeEntryModePreference("other")).toBeNull();
    expect(normalizeEntryModePreference(null)).toBeNull();
  });

  it("reads the stored mode", () => {
    expect(
      readEntryModePreference({
        getItem: vi.fn(() => "app-home")
      })
    ).toBe("app-home");
  });

  it("ignores malformed stored values", () => {
    expect(
      readEntryModePreference({
        getItem: vi.fn(() => "weird")
      })
    ).toBeNull();
  });

  it("writes the normalized mode", () => {
    const storage = {
      setItem: vi.fn(),
      removeItem: vi.fn()
    };

    writeEntryModePreference("direct-project", storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      ENTRY_MODE_PREFERENCE_STORAGE_KEY,
      "direct-project"
    );
  });

  it("clears the preference when explicitly requested", () => {
    const storage = {
      removeItem: vi.fn()
    };

    clearEntryModePreference(storage);

    expect(storage.removeItem).toHaveBeenCalledWith(
      ENTRY_MODE_PREFERENCE_STORAGE_KEY
    );
  });
});
