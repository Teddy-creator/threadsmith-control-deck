import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadProjectState, writeStateFragment } from "@threadsmith/fs-bridge";
import { STATE_FILES } from "@threadsmith/fs-bridge";
import { bootstrapProjectState } from "./bootstrap.ts";

const createdRoots: string[] = [];

async function createProjectRoot(prefix = "threadsmith-bootstrap-") {
  const projectRoot = await import("node:fs/promises").then(({ mkdtemp }) =>
    mkdtemp(join(tmpdir(), prefix))
  );
  createdRoots.push(projectRoot);
  return projectRoot;
}

async function seedNodeProject(projectRoot: string, args?: {
  packageName?: string;
  description?: string;
  readmeTitle?: string;
  readmeSummary?: string;
}) {
  await mkdir(join(projectRoot, "src"), { recursive: true });
  await mkdir(join(projectRoot, "tests"), { recursive: true });
  await writeFile(
    join(projectRoot, "package.json"),
    `${JSON.stringify(
      {
        name: args?.packageName ?? "promptpet-ar",
        version: "0.0.1",
        description:
          args?.description ?? "Interactive AR pet prototype for prompt-driven reactions.",
        scripts: {
          test: "vitest run",
          build: "vite build"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    join(projectRoot, "README.md"),
    [
      `# ${args?.readmeTitle ?? "PromptPet AR"}`,
      "",
      args?.readmeSummary ??
        "PromptPet AR is an interactive AR pet prototype with prompt-driven reactions.",
      "",
      "## Development",
      "",
      "- Run tests with `npm test`",
      "- Build with `npm run build`"
    ].join("\n"),
    "utf8"
  );
}

afterEach(async () => {
  await Promise.all(
    createdRoots.splice(0).map((projectRoot) =>
      rm(projectRoot, { recursive: true, force: true })
    )
  );
});

describe("bootstrapProjectState", () => {
  it("bootstraps a project with no .threadsmith directory", async () => {
    const projectRoot = await createProjectRoot();
    await seedNodeProject(projectRoot);

    const result = await bootstrapProjectState(projectRoot);
    const state = await loadProjectState(projectRoot);

    await expect(
      access(join(projectRoot, ".threadsmith", "project-brief.json"))
    ).resolves.toBeUndefined();
    expect(result.kind).toBe("bootstrapped");
    expect(state.projectStatus.projectLabel).toBe("PromptPet AR");
    expect(state.currentPhase.blockedBy).toEqual([]);
  });

  it("derives a minimal draft from repository signals", async () => {
    const projectRoot = await createProjectRoot();
    await seedNodeProject(projectRoot, {
      packageName: "threadsmith-lab",
      description: "Workflow lab for testing bootstrap inference.",
      readmeTitle: "Threadsmith Lab",
      readmeSummary:
        "Threadsmith Lab explores workflow automation and deck-backed supervision."
    });

    const result = await bootstrapProjectState(projectRoot);

    expect(result.kind).toBe("bootstrapped");
    expect(result.state.projectBrief.projectGoal).toContain("workflow automation");
    expect(result.state.projectStatus.projectLabel).toBe("Threadsmith Lab");
    expect(result.state.currentPhase.phaseName).toContain("Threadsmith Lab");
    expect(result.state.currentPhase.verificationForThisPhase).toEqual(
      expect.arrayContaining([
        "npm test",
        "npm run build",
        "项目可以从 deck 正常加载"
      ])
    );
  });

  it("repairs partial or invalid truth with a fresh bootstrap draft", async () => {
    const projectRoot = await createProjectRoot();
    await seedNodeProject(projectRoot);
    await mkdir(join(projectRoot, ".threadsmith"), { recursive: true });
    await writeFile(
      join(projectRoot, ".threadsmith", "project-brief.json"),
      "{\"projectGoal\": 42}\n",
      "utf8"
    );
    await writeStateFragment(projectRoot, STATE_FILES.currentPhase, {
      phaseName: "stale",
      phaseGoal: "stale",
      deliverable: "stale",
      inScope: ["stale"],
      outOfScope: [],
      stopCondition: "stale",
      verificationForThisPhase: [],
      activeOwners: ["planner"],
      blockedBy: []
    });

    const result = await bootstrapProjectState(projectRoot);
    const projectBriefContents = await readFile(
      join(projectRoot, ".threadsmith", "project-brief.json"),
      "utf8"
    );

    expect(result.kind).toBe("bootstrapped");
    expect(projectBriefContents).toContain("PromptPet AR");
    expect(result.state.projectBrief.projectGoal).not.toContain("42");
  });

  it("honestly pauses bootstrap when repository signals are too weak", async () => {
    const projectRoot = await createProjectRoot();
    await mkdir(join(projectRoot, "notes"), { recursive: true });
    await writeFile(join(projectRoot, "notes", "todo.txt"), "figure this out\n", "utf8");

    const result = await bootstrapProjectState(projectRoot);

    expect(result.kind).toBe("paused");
    expect(result.missingInfo.length).toBeGreaterThan(0);
    expect(result.state.currentPhase.blockedBy.length).toBeGreaterThan(0);
    expect(result.state.activeWork.blockerSummary).toContain("bootstrap");
    expect(result.state.activeWork.items[0]?.taskSummary).toContain("补完后再继续 autopilot");
    expect(result.state.projectStatus.overallState).toBe("blocked");
    expect(result.state.activeWork.items[0]?.requiresUserDecision).toBe(true);
    expect(result.state.projectStatus.projectStatusSummary).toContain("补完后再回到 autopilot 主线");
    expect(result.state.projectStatus.projectLabel).toBe(basename(projectRoot));
  });
});
