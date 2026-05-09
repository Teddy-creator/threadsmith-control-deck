import { describe, expect, it } from "vitest";
import {
  buildRepoMap,
  deriveRepoMapRelevantFiles
} from "./repoMap.ts";

describe("buildRepoMap", () => {
  it("builds a lightweight map from manifests, directories, and git status", () => {
    const repoMap = buildRepoMap({
      generatedAt: "2026-05-09T14:10:00.000Z",
      projectRootLabel: "Threadsmith",
      topLevelDirectories: ["apps", "packages", "scripts", "docs"],
      existingDirectories: [
        "apps/control-deck/src",
        "apps/control-deck/server",
        "packages/runtime/src",
        "packages/fs-bridge/src",
        "tests/e2e",
        ".github/workflows/ci.yml"
      ],
      manifestFiles: [
        {
          path: "package.json",
          contents: {
            name: "threadsmith",
            private: true,
            packageManager: "npm@11.11.0",
            workspaces: ["apps/*", "packages/*"],
            scripts: {
              test: "npm run test --workspaces --if-present",
              build: "npm run build --workspaces --if-present"
            }
          }
        },
        {
          path: "packages/runtime/package.json",
          contents: {
            name: "@threadsmith/runtime",
            private: true,
            scripts: {
              test: "vitest run"
            }
          }
        }
      ],
      git: {
        status: "dirty",
        changedFiles: ["packages/runtime/src/repoMap.ts"],
        command: "git status --short"
      }
    });

    expect(repoMap.mapId).toBe("repo-threadsmith-20260509T141000000Z");
    expect(repoMap.packageManager).toBe("npm@11.11.0");
    expect(repoMap.rootPackage?.workspaces).toEqual(["apps/*", "packages/*"]);
    expect(repoMap.workspacePackages[0]?.name).toBe("@threadsmith/runtime");
    expect(repoMap.topLevelDirectories).toContainEqual({
      path: "packages",
      role: "package"
    });
    expect(repoMap.sourceDirectories).toContainEqual({
      path: "packages/runtime/src",
      kind: "source"
    });
    expect(repoMap.entryPoints).toContainEqual({
      path: "package.json",
      kind: "package-manifest",
      reason: "Root package manifest defines workspace scripts and package manager."
    });
    expect(repoMap.git.status).toBe("dirty");
    expect(repoMap.git.changedFiles).toEqual(["packages/runtime/src/repoMap.ts"]);
  });

  it("degrades when package or git signals are unavailable", () => {
    const repoMap = buildRepoMap({
      generatedAt: "2026-05-09T14:11:00.000Z",
      projectRootLabel: "bare-project",
      topLevelDirectories: ["src"],
      existingDirectories: ["src"],
      warnings: ["git status unavailable"]
    });

    expect(repoMap.rootPackage).toBeNull();
    expect(repoMap.packageManager).toBeNull();
    expect(repoMap.git.status).toBe("unknown");
    expect(repoMap.git.changedFiles).toEqual([]);
    expect(repoMap.sourceDirectories).toContainEqual({
      path: "src",
      kind: "source"
    });
    expect(repoMap.warnings).toEqual(["git status unavailable"]);
  });
});

describe("deriveRepoMapRelevantFiles", () => {
  it("prioritizes changed files before static entry points", () => {
    const repoMap = buildRepoMap({
      generatedAt: "2026-05-09T14:12:00.000Z",
      projectRootLabel: "Threadsmith",
      topLevelDirectories: ["packages"],
      existingDirectories: ["packages/runtime/src"],
      manifestFiles: [
        {
          path: "package.json",
          contents: {
            name: "threadsmith",
            workspaces: ["packages/*"]
          }
        },
        {
          path: "packages/runtime/package.json",
          contents: {
            name: "@threadsmith/runtime"
          }
        }
      ],
      git: {
        status: "dirty",
        changedFiles: [
          "packages/runtime/src/repoMap.ts",
          "package.json"
        ],
        command: "git status --short"
      }
    });

    const relevantFiles = deriveRepoMapRelevantFiles(repoMap, 4);

    expect(relevantFiles.map((file) => file.path)).toEqual([
      "packages/runtime/src/repoMap.ts",
      "package.json",
      "packages/runtime/package.json"
    ]);
    expect(relevantFiles[0]?.source).toBe("repo-map");
  });
});
