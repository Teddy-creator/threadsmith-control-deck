import { access, lstat, readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import type {
  DiscoveredSkill,
  DiscoveredSkillFrontmatter,
  DiscoveredSkillSource,
  SkillDiscoveryRoot
} from "@threadsmith/domain";
import { discoveredSkillSchema } from "@threadsmith/domain";
import { inferSkillCapabilities } from "@threadsmith/runtime";

export interface DiscoverCodexSkillsOptions {
  roots: SkillDiscoveryRoot[];
  generatedAt?: string;
}

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const BODY_PREVIEW_LIMIT = 600;

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function parseFrontmatter(contents: string): {
  frontmatter: DiscoveredSkillFrontmatter;
  body: string;
  warnings: string[];
} {
  const match = contents.match(FRONTMATTER_PATTERN);

  if (!match) {
    return {
      frontmatter: {
        name: null,
        description: null
      },
      body: contents,
      warnings: ["SKILL.md is missing frontmatter."]
    };
  }

  const rawFrontmatter = match[1] ?? "";
  const fields = new Map<string, string>();

  for (const line of rawFrontmatter.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    fields.set(key, value.replace(/^["']|["']$/g, ""));
  }

  return {
    frontmatter: {
      name: fields.get("name") || null,
      description: fields.get("description") || null
    },
    body: contents.slice(match[0].length),
    warnings: []
  };
}

function skillIdFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function scanRootDirectories(root: string) {
  const entries = await readdir(root, { withFileTypes: true });
  const directories = entries.filter((entry) =>
    entry.isDirectory() || entry.isSymbolicLink()
  );

  return directories.map((entry) => join(root, entry.name)).sort();
}

async function readSkillFile(args: {
  skillDirectory: string;
  root: string;
  source: DiscoveredSkillSource;
}): Promise<DiscoveredSkill | null> {
  const skillPath = join(args.skillDirectory, "SKILL.md");

  if (!(await pathExists(skillPath))) {
    return null;
  }

  const warnings: string[] = [];
  const stat = await lstat(args.skillDirectory);

  if (stat.isSymbolicLink()) {
    warnings.push("Skill directory is a symlink; verify it points to trusted skill source.");
  }

  const contents = await readFile(skillPath, "utf8");
  const parsed = parseFrontmatter(contents);
  const name = parsed.frontmatter.name ?? basename(args.skillDirectory);
  const id = skillIdFromName(name);
  const draft: DiscoveredSkill = {
    id,
    name,
    description: parsed.frontmatter.description,
    skillPath,
    source: args.source,
    sourceRoot: args.root,
    relativePath: relative(args.root, skillPath).replace(/\\/g, "/"),
    frontmatter: parsed.frontmatter,
    bodyPreview: parsed.body.trim().slice(0, BODY_PREVIEW_LIMIT),
    capabilities: [],
    health: "available",
    warnings: [...warnings, ...parsed.warnings]
  };

  const capabilities = inferSkillCapabilities(draft);
  return discoveredSkillSchema.parse({
    ...draft,
    capabilities
  });
}

export async function discoverCodexSkills(options: DiscoverCodexSkillsOptions) {
  const skills: DiscoveredSkill[] = [];
  const warnings: string[] = [];

  for (const rootEntry of options.roots) {
    if (!(await pathExists(rootEntry.root))) {
      warnings.push(`Skill root does not exist: ${rootEntry.root}`);
      continue;
    }

    let directories: string[];
    try {
      directories = await scanRootDirectories(rootEntry.root);
    } catch (error) {
      warnings.push(`Unable to scan skill root ${rootEntry.root}: ${(error as Error).message}`);
      continue;
    }

    for (const skillDirectory of directories) {
      try {
        const skill = await readSkillFile({
          skillDirectory,
          root: rootEntry.root,
          source: rootEntry.source
        });

        if (skill) {
          skills.push(skill);
        }
      } catch (error) {
        warnings.push(
          `Unable to read skill at ${skillDirectory}: ${(error as Error).message}`
        );
      }
    }
  }

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    roots: options.roots,
    skills,
    warnings
  };
}
