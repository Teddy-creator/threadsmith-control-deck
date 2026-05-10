import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { discoverCodexSkills } from "./skillDiscovery.ts";

async function writeSkill(root: string, name: string, contents: string) {
  const skillDir = join(root, name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, "SKILL.md"), contents, "utf8");
  return skillDir;
}

describe("discoverCodexSkills", () => {
  it("discovers Codex skills from one-level skill roots", async () => {
    const root = await mkdtemp(join(tmpdir(), "threadsmith-skills-"));
    await writeSkill(
      root,
      "systematic-debugging",
      [
        "---",
        "name: systematic-debugging",
        "description: Use when encountering any bug or unexpected behavior.",
        "---",
        "",
        "# Systematic Debugging"
      ].join("\n")
    );

    const discovery = await discoverCodexSkills({
      generatedAt: "2026-05-10T11:00:00.000Z",
      roots: [
        {
          root,
          source: "global-codex"
        }
      ]
    });

    expect(discovery.skills).toHaveLength(1);
    expect(discovery.skills[0]).toMatchObject({
      id: "systematic-debugging",
      name: "systematic-debugging",
      capabilities: ["debug"],
      health: "available"
    });
  });

  it("falls back to directory names when frontmatter is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "threadsmith-skills-"));
    await writeSkill(
      root,
      "custom-reviewer",
      "# Review Skill\n\nReview implementation changes and regressions."
    );

    const discovery = await discoverCodexSkills({
      roots: [
        {
          root,
          source: "project-codex"
        }
      ]
    });

    expect(discovery.skills[0]?.name).toBe("custom-reviewer");
    expect(discovery.skills[0]?.capabilities).toContain("review");
    expect(discovery.skills[0]?.warnings).toContain("SKILL.md is missing frontmatter.");
  });

  it("records missing roots as warnings instead of crashing", async () => {
    const discovery = await discoverCodexSkills({
      roots: [
        {
          root: "/tmp/threadsmith-missing-skills-root",
          source: "global-codex"
        }
      ]
    });

    expect(discovery.skills).toEqual([]);
    expect(discovery.warnings[0]).toContain("does not exist");
  });

  it("keeps multiple roots separated by source", async () => {
    const globalRoot = await mkdtemp(join(tmpdir(), "threadsmith-global-skills-"));
    const projectRoot = await mkdtemp(join(tmpdir(), "threadsmith-project-skills-"));
    await writeSkill(
      globalRoot,
      "task-closeout",
      [
        "---",
        "name: task-closeout",
        "description: Clean up and stabilize a finished task.",
        "---"
      ].join("\n")
    );
    await writeSkill(
      projectRoot,
      "writing-plans",
      [
        "---",
        "name: writing-plans",
        "description: Create implementation plans before touching code.",
        "---"
      ].join("\n")
    );

    const discovery = await discoverCodexSkills({
      roots: [
        {
          root: globalRoot,
          source: "global-codex"
        },
        {
          root: projectRoot,
          source: "project-codex"
        }
      ]
    });

    expect(discovery.skills.map((skill) => skill.source).sort()).toEqual([
      "global-codex",
      "project-codex"
    ]);
  });
});
