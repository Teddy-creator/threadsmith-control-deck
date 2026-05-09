import { createAgentRun } from "@threadsmith/fs-bridge";
import type { PhaseRunRecord } from "@threadsmith/domain";
import { buildExecutorPacket, buildPacketForRole } from "./packetBuilder.ts";
import { launchCodexCliExecutor, type CodexCliLaunch } from "./codexCliExecutor.ts";
import { PhaseRunner } from "./phaseRunner.ts";
import type { RunExecutionRequest, RunLaunchResponse } from "./providerTypes.ts";

export interface RoleRunLaunchResponse extends RunLaunchResponse {
  completion: CodexCliLaunch["completion"];
}

export interface AutopilotRunRequest {
  projectRoot: string;
  phaseRunId?: string;
  startedAt?: string;
}

export async function launchProjectRoleRun(
  input: RunExecutionRequest
): Promise<RoleRunLaunchResponse> {
  const role = input.role ?? "executor";
  const provider = input.provider ?? "codex";
  const runId = input.runId ?? crypto.randomUUID();

  if (provider !== "codex") {
    throw new Error(`当前自动执行桥只支持 Codex provider，收到：${provider}`);
  }

  const packet =
    role === "executor"
      ? await buildExecutorPacket(input.projectRoot, runId, provider)
      : await buildPacketForRole({
          projectRoot: input.projectRoot,
          role,
          provider,
          runId
        });
  const created = await createAgentRun(input.projectRoot, packet, input.startedAt);
  const launched = await launchCodexCliExecutor(created.packet, {
    spawnProcess: input.spawnProcess,
    startedAt: input.startedAt
  });

  return {
    projectRoot: input.projectRoot,
    packet: created.packet,
    run: launched.run,
    completion: launched.completion
  };
}

export async function startProjectRun(
  input: RunExecutionRequest
): Promise<RoleRunLaunchResponse> {
  const role = input.role ?? "executor";

  if (role !== "executor") {
    throw new Error(`当前自动执行桥只支持 executor 角色，收到：${role}`);
  }

  const launched = await launchProjectRoleRun(input);

  return {
    projectRoot: input.projectRoot,
    packet: launched.packet,
    run: launched.run,
    completion: launched.completion
  };
}

export async function startAutopilotPhaseRun(
  input: AutopilotRunRequest
): Promise<PhaseRunRecord> {
  const runner = new PhaseRunner();
  return runner.start(input);
}

export async function resumeAutopilotPhaseRun(
  input: AutopilotRunRequest
): Promise<PhaseRunRecord> {
  const runner = new PhaseRunner();
  return runner.resume(input);
}
