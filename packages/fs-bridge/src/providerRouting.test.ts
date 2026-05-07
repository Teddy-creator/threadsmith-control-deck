import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureStateDir, initializeProjectState } from "./fileStore.ts";
import { getProviderRoutingPath } from "./paths.ts";
import { loadProviderRouting, writeProviderRouting } from "./providerRouting.ts";

const createdRoots: string[] = [];

async function createProjectRoot() {
  const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-routing-"));
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

describe("providerRouting", () => {
  it("falls back to the default all-codex routing when the file is missing", async () => {
    const projectRoot = await createProjectRoot();

    const routing = await loadProviderRouting(projectRoot);

    expect(routing.planner).toBe("codex");
    expect(routing.executor).toBe("codex");
    expect(routing.reviewer).toBe("codex");
    expect(routing.verifier).toBe("codex");
    expect(routing.closeout).toBe("codex");
    expect(routing.conductorSurface).toBe("codex-desktop");
  });

  it("persists a mixed provider routing map", async () => {
    const projectRoot = await createProjectRoot();

    await writeProviderRouting(projectRoot, {
      planner: "claude",
      executor: "codex",
      reviewer: "codex",
      verifier: "claude",
      closeout: "codex",
      conductorSurface: "claude-cli"
    });

    const contents = await readFile(getProviderRoutingPath(projectRoot), "utf8");
    const routing = await loadProviderRouting(projectRoot);

    expect(contents).toContain("\"planner\": \"claude\"");
    expect(routing.planner).toBe("claude");
    expect(routing.verifier).toBe("claude");
    expect(routing.conductorSurface).toBe("claude-cli");
  });

  it("initializes provider-routing.json for a real project", async () => {
    const projectRoot = await createProjectRoot();

    await initializeProjectState(projectRoot);

    const contents = await readFile(getProviderRoutingPath(projectRoot), "utf8");

    expect(contents).toContain("\"planner\": \"codex\"");
    expect(contents).toContain("\"conductorSurface\": \"codex-desktop\"");
  });
});
