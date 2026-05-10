import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  type SkillRoutingConfig,
  skillRoutingConfigSchema
} from "@threadsmith/domain";
import { getSkillRoutingPath } from "./paths.ts";

function formatJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function createDefaultSkillRoutingConfig(
  discovery?: {
    generatedAt: string;
    skills: readonly unknown[];
  }
): SkillRoutingConfig {
  return skillRoutingConfigSchema.parse({
    version: 1,
    generatedFrom: {
      discoveryGeneratedAt: discovery?.generatedAt ?? null,
      discoverySkillCount: discovery?.skills.length ?? 0
    },
    notes: [
      "External skills are discovered and routed by Threadsmith v1, but not executed automatically."
    ]
  });
}

export async function loadSkillRoutingConfig(
  projectRoot: string
): Promise<SkillRoutingConfig> {
  try {
    const raw = await readFile(getSkillRoutingPath(projectRoot), "utf8");
    return skillRoutingConfigSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createDefaultSkillRoutingConfig();
    }

    throw error;
  }
}

export async function writeSkillRoutingConfig(
  projectRoot: string,
  value: SkillRoutingConfig
) {
  const parsed = skillRoutingConfigSchema.parse(value);
  const filePath = getSkillRoutingPath(projectRoot);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, formatJson(parsed), "utf8");
  return parsed;
}
