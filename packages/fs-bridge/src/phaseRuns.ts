import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import {
  lockedPhaseSnapshotSchema,
  phaseRunPauseSchema,
  phaseRunRecordSchema,
  phaseSliceArtifactSchema,
  type LockedPhaseSnapshot,
  type PhaseRunPause,
  type PhaseRunRecord,
  type PhaseSliceArtifact
} from "@threadsmith/domain";
import {
  PHASE_RUN_FILES,
  getPhaseRunDir,
  getPhaseRunFilePath,
  getPhaseRunSlicePath,
  getPhaseRunSlicesDir,
  getPhaseRunsDir
} from "./paths.ts";

function formatJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writePhaseRunRecord(
  projectRoot: string,
  value: PhaseRunRecord
) {
  const parsed = phaseRunRecordSchema.parse(value);
  await mkdir(getPhaseRunDir(projectRoot, parsed.phaseRunId), { recursive: true });
  await writeFile(
    getPhaseRunFilePath(projectRoot, parsed.phaseRunId, PHASE_RUN_FILES.record),
    formatJson(parsed),
    "utf8"
  );
  return parsed;
}

export async function createPhaseRun(
  projectRoot: string,
  value: PhaseRunRecord,
  startedAt = value.startedAt
) {
  return writePhaseRunRecord(projectRoot, {
    ...value,
    startedAt
  });
}

export async function readPhaseRun(projectRoot: string, phaseRunId: string) {
  const raw = await readFile(
    getPhaseRunFilePath(projectRoot, phaseRunId, PHASE_RUN_FILES.record),
    "utf8"
  );
  return phaseRunRecordSchema.parse(JSON.parse(raw));
}

export async function updatePhaseRun(
  projectRoot: string,
  phaseRunId: string,
  update: Partial<PhaseRunRecord>
) {
  const current = await readPhaseRun(projectRoot, phaseRunId);
  return writePhaseRunRecord(projectRoot, {
    ...current,
    ...update,
    phaseRunId: current.phaseRunId,
    projectRoot: current.projectRoot
  });
}

export async function writeLockedPhaseSnapshot(
  projectRoot: string,
  phaseRunId: string,
  value: LockedPhaseSnapshot
) {
  const parsed = lockedPhaseSnapshotSchema.parse({
    ...value,
    phaseRunId
  });
  await mkdir(getPhaseRunDir(projectRoot, phaseRunId), { recursive: true });
  await writeFile(
    getPhaseRunFilePath(projectRoot, phaseRunId, PHASE_RUN_FILES.lockedPhase),
    formatJson(parsed),
    "utf8"
  );
  return parsed;
}

export async function writePhaseSlice(
  projectRoot: string,
  phaseRunId: string,
  value: PhaseSliceArtifact
) {
  const parsed = phaseSliceArtifactSchema.parse({
    ...value,
    phaseRunId
  });
  await mkdir(getPhaseRunSlicesDir(projectRoot, phaseRunId), { recursive: true });
  await writeFile(
    getPhaseRunSlicePath(projectRoot, phaseRunId, parsed.sliceId),
    formatJson(parsed),
    "utf8"
  );
  return parsed;
}

export async function readPhaseSlice(
  projectRoot: string,
  phaseRunId: string,
  sliceId: string
) {
  const raw = await readFile(
    getPhaseRunSlicePath(projectRoot, phaseRunId, sliceId),
    "utf8"
  );
  return phaseSliceArtifactSchema.parse(JSON.parse(raw));
}

export async function writePhasePause(
  projectRoot: string,
  phaseRunId: string,
  value: PhaseRunPause
) {
  const parsed = phaseRunPauseSchema.parse({
    ...value,
    phaseRunId
  });
  await mkdir(getPhaseRunDir(projectRoot, phaseRunId), { recursive: true });
  await writeFile(
    getPhaseRunFilePath(projectRoot, phaseRunId, PHASE_RUN_FILES.pause),
    formatJson(parsed),
    "utf8"
  );
  return parsed;
}

export async function readPhasePause(projectRoot: string, phaseRunId: string) {
  try {
    const raw = await readFile(
      getPhaseRunFilePath(projectRoot, phaseRunId, PHASE_RUN_FILES.pause),
      "utf8"
    );
    return phaseRunPauseSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readLatestPhaseRun(projectRoot: string) {
  try {
    const phaseRunIds = await readdir(getPhaseRunsDir(projectRoot));
    const records = await Promise.all(
      phaseRunIds.map(async (phaseRunId) => {
        try {
          return await readPhaseRun(projectRoot, phaseRunId);
        } catch {
          return null;
        }
      })
    );

    return records
      .filter((record): record is PhaseRunRecord => record !== null)
      .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0] ?? null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
