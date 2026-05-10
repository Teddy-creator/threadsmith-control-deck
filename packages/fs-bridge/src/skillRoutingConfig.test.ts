import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureStateDir, initializeProjectState } from "./fileStore.ts";
import { getSkillRoutingPath } from "./paths.ts";
import {
  createDefaultSkillRoutingConfig,
  loadSkillRoutingConfig,
  writeSkillRoutingConfig
} from "./skillRoutingConfig.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-skill-routing-"));
  createdRoots.push(projectRoot);
  await ensureStateDir(projectRoot);
  return projectRoot;
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map(async (projectRoot) => {
      await import("node:fs/promises").then(({ rm }) =>
        rm(projectRoot, { recursive: true, force: true })
      );
    })
  );
});

describe("skillRoutingConfig", () => {
  it("falls back to a default config when the file is missing", async () => {
    const projectRoot = await createProjectRoot();

    const config = await loadSkillRoutingConfig(projectRoot);

    expect(config.version).toBe(1);
    expect(config.generatedFrom.discoverySkillCount).toBe(0);
    expect(config.routePreferences).toEqual([]);
    expect(config.notes[0]).toContain("not executed automatically");
  });

  it("can seed default metadata from a discovery summary", () => {
    const config = createDefaultSkillRoutingConfig({
      generatedAt: "2026-05-10T12:00:00.000Z",
      skills: [
        {
          id: "task-closeout"
        },
        {
          id: "systematic-debugging"
        }
      ]
    });

    expect(config.generatedFrom.discoveryGeneratedAt).toBe(
      "2026-05-10T12:00:00.000Z"
    );
    expect(config.generatedFrom.discoverySkillCount).toBe(2);
  });

  it("persists project-level skill routing preferences", async () => {
    const projectRoot = await createProjectRoot();

    await writeSkillRoutingConfig(projectRoot, {
      version: 1,
      updatedAt: "2026-05-10T12:00:00.000Z",
      generatedFrom: {
        discoveryGeneratedAt: "2026-05-10T11:58:00.000Z",
        discoverySkillCount: 25
      },
      routePreferences: [
        {
          role: null,
          capability: "debug",
          adapterId: "systematic-debugging",
          reason: "Use the purpose-built debugger."
        }
      ],
      disabledAdapters: [
        {
          adapterId: "legacy-reviewer",
          reason: "Output contract is not stable."
        }
      ],
      fallbackAvailability: "missing",
      notes: ["Discovery route config is committed project truth."]
    });

    const contents = await readFile(getSkillRoutingPath(projectRoot), "utf8");
    const config = await loadSkillRoutingConfig(projectRoot);

    expect(contents).toContain("\"adapterId\": \"systematic-debugging\"");
    expect(config.routePreferences[0]?.capability).toBe("debug");
    expect(config.disabledAdapters[0]?.adapterId).toBe("legacy-reviewer");
  });

  it("initializes skill-routing.json for a real project", async () => {
    const projectRoot = await createProjectRoot();

    await initializeProjectState(projectRoot);

    const contents = await readFile(getSkillRoutingPath(projectRoot), "utf8");

    expect(contents).toContain("\"version\": 1");
    expect(contents).toContain("not executed automatically");
  });
});
