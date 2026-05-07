import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  type ProviderRouting,
  providerRoutingSchema
} from "@threadsmith/domain";
import { getProviderRoutingPath } from "./paths.ts";

function formatJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function createDefaultProviderRouting(): ProviderRouting {
  return providerRoutingSchema.parse({});
}

export async function loadProviderRouting(
  projectRoot: string
): Promise<ProviderRouting> {
  try {
    const raw = await readFile(getProviderRoutingPath(projectRoot), "utf8");
    return providerRoutingSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createDefaultProviderRouting();
    }

    throw error;
  }
}

export async function writeProviderRouting(
  projectRoot: string,
  value: ProviderRouting
) {
  const parsed = providerRoutingSchema.parse(value);
  const filePath = getProviderRoutingPath(projectRoot);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, formatJson(parsed), "utf8");
  return parsed;
}
