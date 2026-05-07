import { appendFile, mkdir, readFile } from "node:fs/promises";
import { deckActionSchema, type DeckAction } from "./schema.ts";
import { STATE_FILES, getStatePath, getThreadsmithDir } from "./paths.ts";

export async function appendActionHistoryEntry(
  projectRoot: string,
  action: DeckAction
) {
  const parsed = deckActionSchema.parse(action);
  await mkdir(getThreadsmithDir(projectRoot), { recursive: true });
  await appendFile(
    getStatePath(projectRoot, STATE_FILES.actionHistory),
    `${JSON.stringify(parsed)}\n`,
    "utf8"
  );
}

export async function readActionHistory(projectRoot: string) {
  try {
    const raw = await readFile(
      getStatePath(projectRoot, STATE_FILES.actionHistory),
      "utf8"
    );
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => deckActionSchema.parse(JSON.parse(line)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
