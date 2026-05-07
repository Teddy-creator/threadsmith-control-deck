import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  ExecutionPacket,
  ExecutionResult,
  LockedPhaseSnapshot,
  PhaseOwner,
  PhaseRunPause,
  PhaseRunRecord,
  PhaseSliceArtifact,
  ProviderId
} from "@threadsmith/domain";
import {
  STATE_FILES,
  appendPhaseRunEvent,
  applyAgentRunResult,
  createAgentRun,
  createPhaseRun,
  loadProjectState,
  readAgentRunRecord,
  readAgentRunResult,
  readLatestPhaseRun,
  readPhaseRun,
  updatePhaseRun,
  writeStateFragment,
  writeLockedPhaseSnapshot,
  writePhasePause,
  writePhaseSlice
} from "@threadsmith/fs-bridge";
import { launchCodexCliExecutor, type CodexCliLaunch } from "./codexCliExecutor.ts";
import { buildPacketForRole } from "./packetBuilder.ts";
import { buildAutopilotCliCommand } from "./autopilotContinuation.ts";
import { type SpawnProcess } from "./providerTypes.ts";
import { decidePhaseRunNextStep } from "./stopController.ts";

function phaseWorkspacePath(projectRoot: string, phaseRunId: string) {
  return join(projectRoot, ".threadsmith-runtime", phaseRunId);
}

function eventRef(eventId: string) {
  return `.threadsmith/events.ndjson#${eventId}`;
}

function preferredRunArtifact(record: Awaited<ReturnType<typeof readAgentRunRecord>>) {
  return record.summaryPath ?? record.resultPath;
}

function nextSuccessfulRole(
  current: PhaseRunRecord,
  result: ExecutionResult
) {
  return result.outcome === "succeeded" ? result.role : current.latestSuccessfulRole;
}

function recommendedContinuePrompt(projectRoot: string) {
  return `在确认暂停条件已解决后，运行：${buildAutopilotCliCommand(projectRoot, "continue")}`;
}

function plannerSliceId(current: PhaseRunRecord) {
  return current.repairCount > 0 ? `repair-${current.repairCount}` : "primary-1";
}

function plannerSliceKind(current: PhaseRunRecord): PhaseSliceArtifact["kind"] {
  return current.repairCount > 0 ? "repair" : "primary";
}

const ROLE_ORDER: PhaseOwner[] = [
  "planner",
  "executor",
  "reviewer",
  "verifier",
  "closeout",
  "hygiene"
];

function sliceGoalFromResult(
  state: Awaited<ReturnType<typeof loadProjectState>>,
  result: ExecutionResult
) {
  return result.summary.trim() || state.currentPhase.phaseGoal;
}

function resumeTaskSummary(role: PhaseOwner) {
  switch (role) {
    case "planner":
      return "暂停条件已处理，planner 正在重新收束下一条 slice。";
    case "executor":
      return "暂停条件已处理，executor 正在恢复当前实现推进。";
    case "reviewer":
      return "暂停条件已处理，reviewer 正在恢复当前审查。";
    case "verifier":
      return "暂停条件已处理，verifier 正在恢复当前 verification。";
    case "closeout":
      return "暂停条件已处理，closeout 正在恢复最终收口。";
    case "hygiene":
      return "暂停条件已处理，当前正在恢复 thread hygiene。";
  }
}

async function ensureWorkspace(projectRoot: string, phaseRunId: string) {
  const workspacePath = phaseWorkspacePath(projectRoot, phaseRunId);
  await mkdir(workspacePath, { recursive: true });
  return workspacePath;
}

async function appendRunEvent(
  projectRoot: string,
  phaseRun: PhaseRunRecord,
  input: {
    title: string;
    detail: string;
    role?: PhaseOwner;
    artifactPath?: string;
    createdAt?: string;
  }
) {
  const event = await appendPhaseRunEvent(projectRoot, {
    phaseRunId: phaseRun.phaseRunId,
    title: input.title,
    detail: input.detail,
    role: input.role,
    artifactPath: input.artifactPath,
    createdAt: input.createdAt
  });

  return updatePhaseRun(projectRoot, phaseRun.phaseRunId, {
    eventRefs: [...phaseRun.eventRefs, eventRef(event.id)]
  });
}

async function markResumeRoleRunning(projectRoot: string, role: PhaseOwner) {
  const state = await loadProjectState(projectRoot);
  const items = new Map(state.activeWork.items.map((item) => [item.role, { ...item }] as const));
  const current = items.get(role);

  items.set(role, {
    role,
    status: "running",
    taskSummary: current?.taskSummary ?? resumeTaskSummary(role),
    requiresUserDecision: false
  });

  await writeStateFragment(projectRoot, STATE_FILES.activeWork, {
    items: ROLE_ORDER.filter((candidate) => items.has(candidate)).map(
      (candidate) => items.get(candidate)!
    ),
    blockerSummary: null
  });
}

export type PhaseRoleLauncher = (
  packet: ExecutionPacket,
  options?: {
    startedAt?: string;
  }
) => Promise<CodexCliLaunch>;

export interface PhaseRunnerOptions {
  roleLauncher?: PhaseRoleLauncher;
  now?: () => string;
  spawnProcess?: SpawnProcess;
}

export interface PhaseRunnerRequest {
  projectRoot: string;
  phaseRunId?: string;
  provider?: ProviderId;
  startedAt?: string;
}

export class PhaseRunner {
  private readonly now: () => string;

  private readonly roleLauncher: PhaseRoleLauncher;

  constructor(options: PhaseRunnerOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.roleLauncher =
      options.roleLauncher ??
      ((packet, launchOptions) =>
        launchCodexCliExecutor(packet, {
          spawnProcess: options.spawnProcess,
          startedAt: launchOptions?.startedAt
        }));
  }

  async start(input: PhaseRunnerRequest): Promise<PhaseRunRecord> {
    const provider = input.provider ?? "codex";
    const startedAt = input.startedAt ?? this.now();
    const phaseRunId = input.phaseRunId ?? crypto.randomUUID();
    const state = await loadProjectState(input.projectRoot);
    const workspacePath = await ensureWorkspace(input.projectRoot, phaseRunId);
    const lockedPhaseSnapshotRef = `.threadsmith/phase-runs/${phaseRunId}/locked-phase.json`;

    let phaseRun = await createPhaseRun(input.projectRoot, {
      phaseRunId,
      projectRoot: input.projectRoot,
      status: "running",
      currentRole: "planner",
      currentSliceId: null,
      repairCount: 0,
      lockedPhaseSnapshotRef,
      latestSuccessfulRole: null,
      pauseReason: null,
      resumeHint: null,
      workspacePath,
      latestRunRef: null,
      eventRefs: [],
      startedAt,
      finishedAt: null
    });

    const lockedSnapshot: LockedPhaseSnapshot = {
      phaseRunId,
      phase: state.currentPhase,
      capturedAt: startedAt
    };
    await writeLockedPhaseSnapshot(input.projectRoot, phaseRunId, lockedSnapshot);
    phaseRun = await appendRunEvent(input.projectRoot, phaseRun, {
      title: `phase-run ${phaseRunId} started`,
      detail: `Autopilot 已为当前 locked phase 建立 serial run。Workspace：${workspacePath}`,
      role: "planner",
      artifactPath: lockedPhaseSnapshotRef,
      createdAt: startedAt
    });

    return this.runLoop({
      projectRoot: input.projectRoot,
      provider,
      phaseRun
    });
  }

  async resume(input: PhaseRunnerRequest): Promise<PhaseRunRecord> {
    const provider = input.provider ?? "codex";
    const startedAt = input.startedAt ?? this.now();
    const phaseRun =
      input.phaseRunId
        ? await readPhaseRun(input.projectRoot, input.phaseRunId)
        : await readLatestPhaseRun(input.projectRoot);

    if (!phaseRun) {
      throw new Error("当前项目还没有可恢复的 phase run。");
    }

    if (phaseRun.status !== "paused") {
      throw new Error(`当前 phase run 不处于 paused 状态，收到：${phaseRun.status}`);
    }

    await mkdir(phaseRun.workspacePath, { recursive: true });

    let resumed = await updatePhaseRun(input.projectRoot, phaseRun.phaseRunId, {
      status: "running",
      pauseReason: null,
      resumeHint: null,
      finishedAt: null
    });
    await markResumeRoleRunning(input.projectRoot, resumed.currentRole ?? "planner");
    resumed = await appendRunEvent(input.projectRoot, resumed, {
      title: `phase-run ${phaseRun.phaseRunId} resumed`,
      detail: "Autopilot 正在从 committed truth 恢复。",
      role: resumed.currentRole ?? "planner",
      createdAt: startedAt
    });

    return this.runLoop({
      projectRoot: input.projectRoot,
      provider,
      phaseRun: resumed
    });
  }

  private async writePlannerSlice(
    projectRoot: string,
    phaseRun: PhaseRunRecord,
    runId: string,
    result: ExecutionResult
  ) {
    const state = await loadProjectState(projectRoot);
    const sliceId = plannerSliceId(phaseRun);
    const artifact: PhaseSliceArtifact = {
      phaseRunId: phaseRun.phaseRunId,
      sliceId,
      kind: plannerSliceKind(phaseRun),
      goal: sliceGoalFromResult(state, result),
      scope:
        state.currentPhase.inScope.length > 0
          ? state.currentPhase.inScope
          : [state.currentPhase.deliverable],
      doneWhen:
        state.acceptanceState.doneWhenChecklist.length > 0
          ? state.acceptanceState.doneWhenChecklist.map((item) => item.label)
          : [state.currentPhase.stopCondition],
      verification: state.currentPhase.verificationForThisPhase,
      whyNow: result.summary,
      createdByRunId: runId,
      createdAt: this.now()
    };

    await writePhaseSlice(projectRoot, phaseRun.phaseRunId, artifact);
    return artifact;
  }

  private async pausePhaseRun(
    projectRoot: string,
    phaseRun: PhaseRunRecord,
    role: PhaseOwner,
    pause: Omit<PhaseRunPause, "phaseRunId" | "role" | "recommendedPrompt" | "createdAt">
      & {
        recommendedPrompt?: string;
      },
    resumeRole: PhaseOwner,
    latestRunRef: string | null,
    latestSuccessfulRole: PhaseRunRecord["latestSuccessfulRole"]
  ) {
    const createdAt = this.now();
    const pauseRecord: PhaseRunPause = {
      phaseRunId: phaseRun.phaseRunId,
      role,
      type: pause.type,
      summary: pause.summary,
      detail: pause.detail,
      resumeRequirements: pause.resumeRequirements,
      recommendedPrompt: pause.recommendedPrompt ?? recommendedContinuePrompt(projectRoot),
      createdAt
    };

    await writePhasePause(projectRoot, phaseRun.phaseRunId, pauseRecord);

    let paused = await updatePhaseRun(projectRoot, phaseRun.phaseRunId, {
      status: "paused",
      currentRole: resumeRole,
      pauseReason: pause.summary,
      resumeHint: pauseRecord.recommendedPrompt,
      latestRunRef,
      latestSuccessfulRole
    });

    paused = await appendRunEvent(projectRoot, paused, {
      title: `phase-run ${phaseRun.phaseRunId} paused`,
      detail: `${pause.summary} Resume：${pauseRecord.recommendedPrompt}`,
      role,
      artifactPath: `.threadsmith/phase-runs/${phaseRun.phaseRunId}/pause.json`,
      createdAt
    });

    return paused;
  }

  private async runLoop(input: {
    projectRoot: string;
    provider: ProviderId;
    phaseRun: PhaseRunRecord;
  }): Promise<PhaseRunRecord> {
    let phaseRun = input.phaseRun;
    const transientRetryCounts = new Map<PhaseOwner, number>();

    while (phaseRun.status === "running") {
      const role = phaseRun.currentRole ?? "planner";
      const runId = crypto.randomUUID();
      const packet = await buildPacketForRole({
        projectRoot: input.projectRoot,
        role,
        provider: input.provider,
        runId
      });
      await createAgentRun(input.projectRoot, packet, this.now());
      const launch = await this.roleLauncher(packet, {
        startedAt: this.now()
      });
      const launchEventPhaseRun = await appendRunEvent(input.projectRoot, phaseRun, {
        title: `phase-run ${phaseRun.phaseRunId} launched ${role}`,
        detail: `当前角色已启动，runId=${runId}`,
        role,
        artifactPath: packet.output.resultPath,
        createdAt: this.now()
      });

      phaseRun = await updatePhaseRun(input.projectRoot, launchEventPhaseRun.phaseRunId, {
        currentRole: role,
        latestRunRef: packet.output.resultPath
      });

      await launch.completion;
      if (!launch.resultAppliedByLauncher) {
        await applyAgentRunResult(input.projectRoot, runId);
      }

      const [result, record] = await Promise.all([
        readAgentRunResult(input.projectRoot, runId),
        readAgentRunRecord(input.projectRoot, runId)
      ]);
      const latestRunRef = preferredRunArtifact(record) ?? packet.output.resultPath;
      const latestSuccessfulRole = nextSuccessfulRole(phaseRun, result);
      let currentSliceId = phaseRun.currentSliceId;

      if (role === "planner" && result.outcome === "succeeded" && result.decision === "slice-ready") {
        const slice = await this.writePlannerSlice(input.projectRoot, phaseRun, runId, result);
        currentSliceId = slice.sliceId;
      }

      const nextStep = decidePhaseRunNextStep({
        role,
        result,
        repairCount: phaseRun.repairCount,
        transientRetryCount: transientRetryCounts.get(role) ?? 0
      });

      if (nextStep.kind === "retry") {
        transientRetryCounts.set(role, nextStep.transientRetryCount);
        phaseRun = await updatePhaseRun(input.projectRoot, phaseRun.phaseRunId, {
          latestRunRef,
          latestSuccessfulRole,
          currentSliceId
        });
        phaseRun = await appendRunEvent(input.projectRoot, phaseRun, {
          title: `phase-run ${phaseRun.phaseRunId} retrying ${role}`,
          detail: `基础设施失败，准备重试：${nextStep.detail}`,
          role,
          artifactPath: latestRunRef,
          createdAt: this.now()
        });
        continue;
      }

      transientRetryCounts.set(role, 0);

      if (nextStep.kind === "continue") {
        phaseRun = await updatePhaseRun(input.projectRoot, phaseRun.phaseRunId, {
          latestRunRef,
          latestSuccessfulRole,
          currentSliceId,
          currentRole: nextStep.nextRole
        });
        phaseRun = await appendRunEvent(input.projectRoot, phaseRun, {
          title: `phase-run ${phaseRun.phaseRunId} completed ${role}`,
          detail: `${role} 已完成，下一角色：${nextStep.nextRole}`,
          role,
          artifactPath: latestRunRef,
          createdAt: this.now()
        });
        continue;
      }

      if (nextStep.kind === "repair") {
        phaseRun = await updatePhaseRun(input.projectRoot, phaseRun.phaseRunId, {
          latestRunRef,
          latestSuccessfulRole,
          currentSliceId,
          repairCount: nextStep.repairCount,
          currentRole: nextStep.nextRole
        });
        phaseRun = await appendRunEvent(input.projectRoot, phaseRun, {
          title: `phase-run ${phaseRun.phaseRunId} entered repair #${nextStep.repairCount}`,
          detail: `当前将回到 planner 生成 repair slice：${nextStep.detail}`,
          role,
          artifactPath: latestRunRef,
          createdAt: this.now()
        });
        continue;
      }

      if (nextStep.kind === "accepted") {
        phaseRun = await updatePhaseRun(input.projectRoot, phaseRun.phaseRunId, {
          status: "accepted",
          currentRole: null,
          latestRunRef,
          latestSuccessfulRole,
          currentSliceId,
          pauseReason: null,
          resumeHint: null,
          finishedAt: this.now()
        });
        phaseRun = await appendRunEvent(input.projectRoot, phaseRun, {
          title: `phase-run ${phaseRun.phaseRunId} accepted`,
          detail: "当前 locked phase 已完成 closeout 并进入 accepted。",
          role,
          artifactPath: latestRunRef,
          createdAt: this.now()
        });
        return phaseRun;
      }

      phaseRun = await this.pausePhaseRun(
        input.projectRoot,
        phaseRun,
        role,
        nextStep.pause,
        nextStep.resumeRole,
        latestRunRef,
        latestSuccessfulRole
      );
      return phaseRun;
    }

    return phaseRun;
  }
}
