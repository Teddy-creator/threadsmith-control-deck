import type { Tone } from "../shared";

export type LatestRunPathItem = {
  label: string;
  value: string;
};

export type LatestPhaseRunModel = {
  exists: boolean;
  headline: string;
  summary: string;
  statusLabel: string;
  operatorStateLabel: string;
  operatorHeadline: string;
  operatorDetail: string;
  tone: Tone;
  phaseRunId: string | null;
  roleLabel: string | null;
  sliceLabel: string | null;
  repairLabel: string | null;
  latestSuccessfulRoleLabel: string | null;
  timingLine: string;
  lockedPhasePath: string | null;
  workspacePath: string | null;
  resumeHint: string | null;
  pauseHeadline: string | null;
  pauseDetail: string | null;
  pauseRequirements: string[];
};

export type LatestRunModel = {
  exists: boolean;
  headline: string;
  summary: string;
  statusLabel: string;
  tone: Tone;
  providerLabel: string | null;
  roleLabel: string | null;
  threadLabel: string | null;
  timingLine: string;
  truthImpact: string;
  runId: string | null;
  createdAtLabel: string;
  startedAtLabel: string;
  finishedAtLabel: string;
  pathItems: LatestRunPathItem[];
};

export type LatestBridgeModel = {
  visible: boolean;
  headline: string;
  summary: string;
  statusLabel: string;
  tone: Tone;
  providerLabel: string | null;
  roleLabel: string | null;
  surfaceLabel: string | null;
  recordedAtLabel: string;
  artifactPath: string | null;
  handoffLabel: string;
  handoffTone: Tone;
  handoffDetail: string;
};
