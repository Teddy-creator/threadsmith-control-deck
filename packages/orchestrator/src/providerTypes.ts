import type { spawn } from "node:child_process";
import type {
  AgentRunRecord,
  ExecutionPacket,
  PhaseOwner,
  ProviderId
} from "@threadsmith/domain";

export type SpawnProcess = typeof spawn;

export interface RoleExecutionRequest {
  projectRoot: string;
  role: PhaseOwner;
  provider: ProviderId;
  runId: string;
}

export interface RunExecutionRequest {
  projectRoot: string;
  role?: PhaseOwner;
  provider?: ProviderId;
  runId?: string;
  spawnProcess?: SpawnProcess;
  startedAt?: string;
}

export interface RunLaunchResponse {
  projectRoot: string;
  packet: ExecutionPacket;
  run: AgentRunRecord;
}
