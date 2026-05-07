import { describe, expect, it } from "vitest";
import {
  MAX_RECENT_PROJECTS,
  pinRecentProjectEntry,
  readRecentProjectEntries,
  RECENT_PROJECTS_STORAGE_KEY,
  removeRecentProjectEntry,
  unpinRecentProjectEntry,
  updateRecentProjectEntries,
  writeRecentProjectEntries
} from "./recentProjects";

function createStorage(initialValue?: string) {
  const store = new Map<string, string>();

  if (initialValue) {
    store.set(RECENT_PROJECTS_STORAGE_KEY, initialValue);
  }

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    }
  };
}

describe("updateRecentProjectEntries", () => {
  it("moves the newest unpinned root to the top of the unpinned section", () => {
    expect(
      updateRecentProjectEntries(
        [
          { projectRoot: "/tmp/pinned", pinned: true },
          { projectRoot: "/tmp/alpha", pinned: false },
          { projectRoot: "/tmp/beta", pinned: false }
        ],
        "/tmp/beta"
      )
    ).toEqual([
      { projectRoot: "/tmp/pinned", pinned: true },
      { projectRoot: "/tmp/beta", pinned: false },
      { projectRoot: "/tmp/alpha", pinned: false }
    ]);
  });

  it("keeps pinned entries stable and caps the list to five", () => {
    expect(
      updateRecentProjectEntries(
        [
          { projectRoot: "/tmp/p1", pinned: true },
          { projectRoot: "/tmp/p2", pinned: true },
          { projectRoot: "/tmp/a", pinned: false },
          { projectRoot: "/tmp/b", pinned: false },
          { projectRoot: "/tmp/c", pinned: false }
        ],
        "/tmp/new"
      )
    ).toEqual([
      { projectRoot: "/tmp/p1", pinned: true },
      { projectRoot: "/tmp/p2", pinned: true },
      { projectRoot: "/tmp/new", pinned: false },
      { projectRoot: "/tmp/a", pinned: false },
      { projectRoot: "/tmp/b", pinned: false }
    ]);
  });
});

describe("pin / unpin / remove recent project entries", () => {
  it("pins a project to the top of the pinned section", () => {
    expect(
      pinRecentProjectEntry(
        [
          { projectRoot: "/tmp/pinned", pinned: true },
          { projectRoot: "/tmp/alpha", pinned: false },
          { projectRoot: "/tmp/beta", pinned: false }
        ],
        "/tmp/beta"
      )
    ).toEqual([
      { projectRoot: "/tmp/beta", pinned: true },
      { projectRoot: "/tmp/pinned", pinned: true },
      { projectRoot: "/tmp/alpha", pinned: false }
    ]);
  });

  it("unpinned projects return to the top of the unpinned section", () => {
    expect(
      unpinRecentProjectEntry(
        [
          { projectRoot: "/tmp/pinned-a", pinned: true },
          { projectRoot: "/tmp/pinned-b", pinned: true },
          { projectRoot: "/tmp/alpha", pinned: false }
        ],
        "/tmp/pinned-b"
      )
    ).toEqual([
      { projectRoot: "/tmp/pinned-a", pinned: true },
      { projectRoot: "/tmp/pinned-b", pinned: false },
      { projectRoot: "/tmp/alpha", pinned: false }
    ]);
  });

  it("removes projects cleanly", () => {
    expect(
      removeRecentProjectEntry(
        [
          { projectRoot: "/tmp/pinned", pinned: true },
          { projectRoot: "/tmp/alpha", pinned: false }
        ],
        "/tmp/pinned"
      )
    ).toEqual([{ projectRoot: "/tmp/alpha", pinned: false }]);
  });
});

describe("recent project storage", () => {
  it("reads sanitized recent entries from legacy string storage", () => {
    const storage = createStorage(
      JSON.stringify(["/tmp/one", "  /tmp/two  ", "", 5, "/tmp/three"])
    );

    expect(readRecentProjectEntries(storage)).toEqual([
      { projectRoot: "/tmp/one", pinned: false },
      { projectRoot: "/tmp/two", pinned: false },
      { projectRoot: "/tmp/three", pinned: false }
    ]);
  });

  it("reads sanitized recent entries from object storage and keeps pinned items first", () => {
    const storage = createStorage(
      JSON.stringify([
        { projectRoot: "/tmp/alpha", pinned: false },
        { projectRoot: " /tmp/beta ", pinned: true },
        { projectRoot: "/tmp/alpha", pinned: true }
      ])
    );

    expect(readRecentProjectEntries(storage)).toEqual([
      { projectRoot: "/tmp/alpha", pinned: true },
      { projectRoot: "/tmp/beta", pinned: true }
    ]);
  });

  it("returns an empty list for malformed storage payloads", () => {
    const storage = createStorage("{not-json");

    expect(readRecentProjectEntries(storage)).toEqual([]);
  });

  it("writes a unique capped structured list back to storage", () => {
    const storage = createStorage();

    writeRecentProjectEntries(
      [
        { projectRoot: "/tmp/1", pinned: false },
        { projectRoot: "/tmp/2", pinned: true },
        { projectRoot: "/tmp/2", pinned: false },
        { projectRoot: "/tmp/3", pinned: false },
        { projectRoot: "/tmp/4", pinned: false },
        { projectRoot: "/tmp/5", pinned: false },
        { projectRoot: "/tmp/6", pinned: false }
      ],
      storage
    );

    expect(JSON.parse(storage.getItem(RECENT_PROJECTS_STORAGE_KEY) ?? "[]")).toEqual([
      { projectRoot: "/tmp/2", pinned: true },
      { projectRoot: "/tmp/1", pinned: false },
      { projectRoot: "/tmp/3", pinned: false },
      { projectRoot: "/tmp/4", pinned: false },
      { projectRoot: "/tmp/5", pinned: false }
    ]);
    expect(MAX_RECENT_PROJECTS).toBe(5);
  });
});
