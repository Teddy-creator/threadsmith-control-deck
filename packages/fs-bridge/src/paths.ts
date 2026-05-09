import { homedir } from "node:os";
import { join } from "node:path";

export const THREADSMITH_DIR = ".threadsmith";

export const STATE_FILES = {
  projectBrief: "project-brief.json",
  projectStatus: "project-status.json",
  projectRoadmap: "project-roadmap.json",
  currentPhase: "current-phase.json",
  acceptanceState: "acceptance-state.json",
  activeWork: "active-work.json",
  projectSupervision: "project-supervision.json",
  preferences: "preferences.json",
  commandBridge: "command-bridge.json",
  actionHistory: "action-queue.ndjson",
  events: "events.ndjson"
} as const;

export const AGENT_RUN_FILES = {
  packet: "packet.json",
  prompt: "prompt.md",
  status: "status.json",
  result: "result.json",
  summary: "result.md",
  stdout: "stdout.log",
  stderr: "stderr.log"
} as const;

export const PHASE_RUN_FILES = {
  record: "phase-run.json",
  lockedPhase: "locked-phase.json",
  pause: "pause.json"
} as const;

export const CONTEXT_FILES = {
  currentPacket: "current-packet.json"
} as const;

export function getThreadsmithDir(projectRoot: string) {
  return join(projectRoot, THREADSMITH_DIR);
}

export function getStatePath(
  projectRoot: string,
  fileName: (typeof STATE_FILES)[keyof typeof STATE_FILES]
) {
  return join(getThreadsmithDir(projectRoot), fileName);
}

export function getGlobalThreadsmithDir() {
  return process.env.THREADSMITH_GLOBAL_DIR ?? join(homedir(), THREADSMITH_DIR);
}

export function getGlobalPreferencesPath(overridePath?: string) {
  return (
    overridePath ??
    process.env.THREADSMITH_GLOBAL_PREFERENCES_PATH ??
    join(getGlobalThreadsmithDir(), STATE_FILES.preferences)
  );
}

export function getRunsDir(projectRoot: string) {
  return join(getThreadsmithDir(projectRoot), "runs");
}

export function getPhaseRunsDir(projectRoot: string) {
  return join(getThreadsmithDir(projectRoot), "phase-runs");
}

export function getContextDir(projectRoot: string) {
  return join(getThreadsmithDir(projectRoot), "context");
}

export function getContextFilePath(
  projectRoot: string,
  fileName: (typeof CONTEXT_FILES)[keyof typeof CONTEXT_FILES]
) {
  return join(getContextDir(projectRoot), fileName);
}

export function getRunDir(projectRoot: string, runId: string) {
  return join(getRunsDir(projectRoot), runId);
}

export function getPhaseRunDir(projectRoot: string, phaseRunId: string) {
  return join(getPhaseRunsDir(projectRoot), phaseRunId);
}

export function getRunFilePath(
  projectRoot: string,
  runId: string,
  fileName: (typeof AGENT_RUN_FILES)[keyof typeof AGENT_RUN_FILES]
) {
  return join(getRunDir(projectRoot, runId), fileName);
}

export function getProviderRoutingPath(projectRoot: string) {
  return join(getThreadsmithDir(projectRoot), "provider-routing.json");
}

export function getCommandBridgeArtifactsDir(projectRoot: string) {
  return join(getThreadsmithDir(projectRoot), "bridges");
}

export function getPhaseResetDraftArtifactsDir(projectRoot: string) {
  return join(getThreadsmithDir(projectRoot), "phase-reset-drafts");
}

export function getPhaseRunFilePath(
  projectRoot: string,
  phaseRunId: string,
  fileName: (typeof PHASE_RUN_FILES)[keyof typeof PHASE_RUN_FILES]
) {
  return join(getPhaseRunDir(projectRoot, phaseRunId), fileName);
}

export function getPhaseRunSlicesDir(projectRoot: string, phaseRunId: string) {
  return join(getPhaseRunDir(projectRoot, phaseRunId), "slices");
}

export function getPhaseRunSlicePath(
  projectRoot: string,
  phaseRunId: string,
  sliceId: string
) {
  return join(getPhaseRunSlicesDir(projectRoot, phaseRunId), `${sliceId}.json`);
}
