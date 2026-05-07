import { appendFile, mkdir, readFile } from "node:fs/promises";
import { type WorkflowEvent, workflowEventSchema } from "@threadsmith/domain";
import { STATE_FILES, getStatePath, getThreadsmithDir } from "./paths.ts";

function offsetIsoTimestamp(timestamp: string, offsetMs = 1) {
  return new Date(new Date(timestamp).getTime() + offsetMs).toISOString();
}

export async function appendEvent(projectRoot: string, event: WorkflowEvent) {
  const parsed = workflowEventSchema.parse(event);
  await mkdir(getThreadsmithDir(projectRoot), { recursive: true });
  await appendFile(
    getStatePath(projectRoot, STATE_FILES.events),
    `${JSON.stringify(parsed)}\n`,
    "utf8"
  );
}

export async function appendPhaseRunEvent(
  projectRoot: string,
  input: {
    phaseRunId: string;
    title: string;
    detail: string;
    role?: WorkflowEvent["role"];
    createdAt?: string;
    artifactPath?: string;
  }
) {
  const event: WorkflowEvent = {
    id: crypto.randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    kind: "phase-run",
    title: input.title,
    detail: input.detail,
    role: input.role,
    runId: input.phaseRunId,
    artifactPath: input.artifactPath
  };

  await appendEvent(projectRoot, event);
  return event;
}

export async function readRecentEvents(projectRoot: string, limit = 8) {
  try {
    const raw = await readFile(getStatePath(projectRoot, STATE_FILES.events), "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => workflowEventSchema.parse(JSON.parse(line)))
      .slice(-limit)
      .reverse();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function resolveMonotonicEventTimestamp(
  projectRoot: string,
  preferredTimestamp?: string
) {
  const baseTimestamp = preferredTimestamp ?? new Date().toISOString();
  const recentEvents = await readRecentEvents(projectRoot, 128);
  const latestRecordedEvent = [...recentEvents].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0];

  if (!latestRecordedEvent) {
    return baseTimestamp;
  }

  return new Date(baseTimestamp).getTime() > new Date(latestRecordedEvent.createdAt).getTime()
    ? baseTimestamp
    : offsetIsoTimestamp(latestRecordedEvent.createdAt);
}
