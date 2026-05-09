import {
  type AcceptanceState,
  type ActiveWork,
  type ActiveWorkItem,
  type ContinuationBehavior,
  type ExecutionResult,
  type PhaseOwner,
  type ProjectState,
  type WorkflowTransitionId
} from "@threadsmith/domain";
import { buildContextPacket } from "@threadsmith/runtime";
import {
  readAgentRunPacket,
  readAgentRunRecord,
  readAgentRunResult
} from "./agentRuns.ts";
import { recordCommandBridgeRunFinished } from "./commandBridge.ts";
import { writeContinuationPacket } from "./continuationPackets.ts";
import {
  appendEvent,
  readRecentEvents,
  resolveMonotonicEventTimestamp
} from "./events.ts";
import {
  loadProjectState,
  readEvidenceSummary,
  readRepoMap,
  writeCurrentContextPacket,
  writeStateFragment
} from "./fileStore.ts";
import { CONTEXT_FILES, STATE_FILES, THREADSMITH_DIR } from "./paths.ts";
import {
  writeCloseoutArtifact,
  writeVerificationEvidenceArtifact
} from "./workflowArtifacts.ts";
import type { DeckAction } from "./schema.ts";

const ROLE_ORDER: PhaseOwner[] = [
  "planner",
  "executor",
  "reviewer",
  "verifier",
  "closeout",
  "hygiene"
];

const REVIEW_BLOCKED_GAP = "Reviewer 提出了阻塞性发现。";
const VERIFICATION_FAILED_GAP = "当前 claim 未通过 verification。";
const LEGACY_REVIEW_BLOCKED_GAP = "Reviewer surfaced blocking findings.";
const LEGACY_VERIFICATION_FAILED_GAP = "Verification failed on the current claim.";

function makeItem(
  role: PhaseOwner,
  status: ActiveWorkItem["status"],
  taskSummary: string,
  requiresUserDecision = false
): ActiveWorkItem {
  return {
    role,
    status,
    taskSummary,
    requiresUserDecision
  };
}

function mergeActiveWork(
  state: ProjectState,
  overrides: Partial<Record<PhaseOwner, Omit<ActiveWorkItem, "role">>>,
  blockerSummary?: string | null
): ActiveWork {
  const items = new Map(
    state.activeWork.items.map((item) => [item.role, { ...item }] as const)
  );

  for (const role of ROLE_ORDER) {
    const override = overrides[role];
    if (!override) {
      continue;
    }

    items.set(role, {
      role,
      ...override
    });
  }

  return {
    items: ROLE_ORDER.filter((role) => items.has(role)).map(
      (role) => items.get(role)!
    ),
    blockerSummary:
      blockerSummary === undefined ? state.activeWork.blockerSummary : blockerSummary
  };
}

function withoutWorkflowGaps(knownGaps: string[]) {
  return knownGaps.filter(
    (gap) =>
      gap !== REVIEW_BLOCKED_GAP &&
      gap !== VERIFICATION_FAILED_GAP &&
      gap !== LEGACY_REVIEW_BLOCKED_GAP &&
      gap !== LEGACY_VERIFICATION_FAILED_GAP
  );
}

function addKnownGap(knownGaps: string[], gap: string) {
  return withoutWorkflowGaps(knownGaps).includes(gap)
    ? withoutWorkflowGaps(knownGaps)
    : [...withoutWorkflowGaps(knownGaps), gap];
}

function markChecklistPassed(acceptanceState: AcceptanceState) {
  return acceptanceState.doneWhenChecklist.map((item) =>
    item.status === "pass" ? item : { ...item, status: "pass" as const }
  );
}

function ensureRunningRole(state: ProjectState, role: PhaseOwner) {
  const item = state.activeWork.items.find((candidate) => candidate.role === role);
  if (!item || item.status !== "running") {
    throw new Error(`无法应用流转，因为 ${role} 不处于 running 状态`);
  }
}

function nextExecutorTask(state: ProjectState) {
  if (state.acceptanceState.verificationStatus === "failed") {
    return "修复 verification 缺口，并准备下一轮 review";
  }

  if (state.acceptanceState.reviewStatus === "review-blocked") {
    return "处理当前 slice 中的阻塞性评审发现";
  }

  return "实现当前这刀 narrow slice";
}

function providerLabel(provider: ExecutionResult["provider"]) {
  switch (provider) {
    case "codex":
      return "Codex";
    case "claude":
      return "Claude";
    default:
      return provider;
  }
}

function automationFailureGap(result: ExecutionResult) {
  return result.blocker?.trim() || result.summary.trim();
}

function isReportingFailureAfterSuccessfulTask(result: ExecutionResult) {
  return (
    result.outcome === "failed" &&
    result.taskOutcome === "succeeded" &&
    result.failureStage === "result-reporting"
  );
}

function executorFailureTaskSummary(result: ExecutionResult) {
  if (isReportingFailureAfterSuccessfulTask(result)) {
    return "任务主体已完成，但结果上报失败，等待修复 bridge / CLI 回流";
  }

  return "自动执行失败，等待修复后重试";
}

function failedRunEventTitle(result: ExecutionResult) {
  if (isReportingFailureAfterSuccessfulTask(result)) {
    return `${providerLabel(result.provider)} 的 ${result.role} 在结果上报阶段失败`;
  }

  return `${providerLabel(result.provider)} 的 ${result.role} 执行失败`;
}

function failedRunEventDetail(
  result: ExecutionResult,
  artifactPath?: string
) {
  if (isReportingFailureAfterSuccessfulTask(result)) {
    return `任务主体已完成，但结果上报失败：${automationFailureGap(result)}${artifactPath ? ` Artifact：${artifactPath}` : ""}`;
  }

  return `失败原因：${automationFailureGap(result)}${artifactPath ? ` Artifact：${artifactPath}` : ""}`;
}

function runArtifactPath(
  summaryPath: string | null,
  resultPath: string | null
) {
  return summaryPath ?? resultPath ?? undefined;
}

function offsetIsoTimestamp(timestamp: string, offsetMs = 1) {
  return new Date(new Date(timestamp).getTime() + offsetMs).toISOString();
}

function isArtifactOnlyRun(
  packet: Awaited<ReturnType<typeof readAgentRunPacket>>
) {
  return packet.workflowEffect === "artifact-only";
}

async function readOptionalContextArtifact<T>(
  readArtifact: () => Promise<T>
): Promise<T | undefined> {
  try {
    return await readArtifact();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function applyDeckActionState(
  projectRoot: string,
  actionId: DeckAction["actionId"],
  options?: {
    continuationBehavior?: ContinuationBehavior;
  }
) {
  const state = await loadProjectState(projectRoot);

  if (actionId === "advance-phase") {
    const nextAcceptance: AcceptanceState = {
      ...state.acceptanceState,
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      finalState: "not-ready",
      knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
    };
    const nextActiveWork = mergeActiveWork(
      state,
      {
        executor: makeItem(
          "executor",
          "running",
          nextExecutorTask(state)
        ),
        reviewer: makeItem(
          "reviewer",
          "waiting",
          "等待 executor 完成交接后开始 review"
        ),
        verifier: makeItem(
          "verifier",
          "idle",
          "等待 review 通过后开始 verification"
        ),
        closeout: makeItem(
          "closeout",
          "idle",
          "等待 verification 通过后再进入 closeout"
        )
      },
      null
    );

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      kind: "deck-action",
      title: "执行流程已启动",
      detail: nextExecutorTask(state),
      role: "executor",
      actionId
    });
    return;
  }

  if (actionId === "run-verification") {
    const createdAt = await resolveMonotonicEventTimestamp(projectRoot);
    const nextAcceptance: AcceptanceState = {
      ...state.acceptanceState,
      verificationStatus: "running"
    };
    const nextActiveWork = mergeActiveWork(
      state,
      {
        reviewer: makeItem(
          "reviewer",
          "done",
          "已完成 review 交接"
        ),
        verifier: makeItem(
          "verifier",
          "running",
          "对当前 claim 执行 verification"
        ),
        closeout: makeItem(
          "closeout",
          "waiting",
          "等待 verification 结果后再做 closeout"
        )
      },
      null
    );
    const recentEvents = await readRecentEvents(projectRoot);
    const evidenceArtifact = await writeVerificationEvidenceArtifact(projectRoot, {
      state: {
        ...state,
        acceptanceState: nextAcceptance,
        activeWork: nextActiveWork
      },
      recentEvents,
      createdAt,
      status: "running"
    });

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt,
      kind: "deck-action",
      title: "Verification 已开始",
      detail: `verifier 正在根据最新证据检查当前 claim。 Evidence：${evidenceArtifact.relativePath}`,
      role: "verifier",
      actionId,
      artifactPath: evidenceArtifact.relativePath
    });
    return;
  }

  if (actionId === "sync-context") {
    const createdAt = await resolveMonotonicEventTimestamp(projectRoot);
    const repoMap = await readOptionalContextArtifact(() => readRepoMap(projectRoot));
    const evidenceSummary = await readOptionalContextArtifact(() =>
      readEvidenceSummary(projectRoot)
    );
    const packet = await writeCurrentContextPacket(
      projectRoot,
      buildContextPacket(state, {
        generatedAt: createdAt,
        repoMap,
        evidenceSummary,
        recentDiff: repoMap
          ? {
              status: repoMap.git.status,
              changedFiles: repoMap.git.changedFiles,
              command: repoMap.git.command,
              summary:
                repoMap.git.status === "dirty"
                  ? `Repo map reported ${repoMap.git.changedFiles.length} changed file(s).`
                  : repoMap.git.status === "clean"
                    ? "Repo map reports a clean working tree."
                    : "Repo map could not determine git status."
            }
          : undefined
      })
    );
    const packetPath = `${THREADSMITH_DIR}/context/${CONTEXT_FILES.currentPacket}`;

    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt,
      kind: "deck-action",
      title: "Context Packet 已刷新",
      detail: `已从 committed Threadsmith truth 重新生成 current-packet.json（${packet.packetId}）。 Packet：${packetPath}`,
      role: "hygiene",
      actionId,
      artifactPath: packetPath
    });

    return;
  }

  if (actionId === "run-hygiene" || actionId === "create-handoff") {
    const createdAt = await resolveMonotonicEventTimestamp(projectRoot);
    const recentEvents = await readRecentEvents(projectRoot);
    const packet = await writeContinuationPacket(projectRoot, {
      kind: actionId === "create-handoff" ? "handoff" : "hygiene",
      state,
      recentEvents,
      createdAt,
      continuationBehavior: options?.continuationBehavior
    });
    const nextActiveWork = mergeActiveWork(
      state,
      {
        hygiene: makeItem(
          "hygiene",
          "done",
          actionId === "create-handoff"
            ? "已为下一段 slice 创建 continuation packet"
            : "已把当前 Threadsmith truth 收进 hygiene packet"
        )
      }
    );

    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt,
      kind: "deck-action",
      title: packet.title,
      detail: `${packet.detail} Packet：${packet.relativePath}`,
      role: "hygiene",
      actionId
    });
    return;
  }

  await appendEvent(projectRoot, {
    id: crypto.randomUUID(),
    createdAt: await resolveMonotonicEventTimestamp(projectRoot),
    kind: "deck-action",
    title:
      actionId === "run-hygiene" ? "已请求 hygiene" : "已请求 handoff",
    detail:
      actionId === "run-hygiene"
        ? "在继续累积工作之前，先重新锚定 session。"
        : "根据当前 Threadsmith truth 生成一份干净的 continuation packet。",
    role: "hygiene",
    actionId
  });
}

export async function applyWorkflowTransition(
  projectRoot: string,
  transitionId: WorkflowTransitionId
) {
  const state = await loadProjectState(projectRoot);
  const createdAt = await resolveMonotonicEventTimestamp(projectRoot);
  let nextAcceptance: AcceptanceState = state.acceptanceState;
  let nextActiveWork: ActiveWork = state.activeWork;
  let eventTitle = "";
  let eventDetail = "";
  let role: PhaseOwner;
  let artifactPath: string | undefined;
  let acceptedHandoffState: ProjectState | null = null;

  switch (transitionId) {
    case "executor-ready-for-review": {
      ensureRunningRole(state, "executor");
      role = "executor";
      nextAcceptance = {
        ...state.acceptanceState,
        implementationStatus: "ready-for-review",
        reviewStatus: "in-review",
        verificationStatus: "not-started",
        finalState: "ready-for-review",
        knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          executor: makeItem(
            "executor",
            "done",
            "已把当前 slice 交给 review"
          ),
          reviewer: makeItem(
            "reviewer",
            "running",
            "根据 project brief 与当前 phase 审查这个 slice"
          ),
          verifier: makeItem(
            "verifier",
            "waiting",
            "等待 review 结果后再运行 verification"
          )
        },
        null
      );
      eventTitle = "Executor 已交接给 reviewer";
      eventDetail = "Acceptance 已进入 ready-for-review。";
      break;
    }
    case "reviewer-blocked": {
      ensureRunningRole(state, "reviewer");
      role = "reviewer";
      nextAcceptance = {
        ...state.acceptanceState,
        reviewStatus: "review-blocked",
        verificationStatus: "not-started",
        finalState: "review-blocked",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          REVIEW_BLOCKED_GAP
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          reviewer: makeItem(
            "reviewer",
            "blocked",
            "在 review 能继续之前，需要先解决阻塞性发现",
            true
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待修复阻塞性评审发现后的下一刀",
            true
          ),
          verifier: makeItem(
            "verifier",
            "idle",
            "在 review 阻塞解除前，verification 暂停"
          )
        },
        "阻塞性评审发现需要被解决"
      );
      eventTitle = "Reviewer 阻塞了这个 slice";
      eventDetail = "Acceptance 已进入 review-blocked。";
      break;
    }
    case "reviewer-ready-for-verification": {
      ensureRunningRole(state, "reviewer");
      role = "reviewer";
      nextAcceptance = {
        ...state.acceptanceState,
        reviewStatus: "ready-for-verification",
        verificationStatus: "ready",
        finalState: "ready-for-verification",
        knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          reviewer: makeItem(
            "reviewer",
            "done",
            "已允许这个 slice 进入 verification"
          ),
          verifier: makeItem(
            "verifier",
            "waiting",
            "现在可以针对当前 claim 启动 verification"
          )
        },
        null
      );
      eventTitle = "Reviewer 已放行这个 slice";
      eventDetail = "Acceptance 已进入 ready-for-verification。";
      break;
    }
    case "verifier-failed": {
      ensureRunningRole(state, "verifier");
      role = "verifier";
      nextAcceptance = {
        ...state.acceptanceState,
        verificationStatus: "failed",
        closeoutStatus: "not-started",
        finalState: "verification-failed",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          VERIFICATION_FAILED_GAP
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          verifier: makeItem(
            "verifier",
            "blocked",
            "当前 claim 未通过 verification",
            true
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待 failed verification 之后的下一刀修复",
            true
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "在 verification 通过之前，closeout 无法开始"
          )
        },
        "当前 claim 未通过 verification"
      );
      const recentEvents = await readRecentEvents(projectRoot);
      const evidenceArtifact = await writeVerificationEvidenceArtifact(projectRoot, {
        state: {
          ...state,
          acceptanceState: nextAcceptance,
          activeWork: nextActiveWork
        },
        recentEvents,
        createdAt,
        status: "failed"
      });
      artifactPath = evidenceArtifact.relativePath;
      eventTitle = "Verifier 未通过当前 claim";
      eventDetail = `Acceptance 已进入 verification-failed。 Evidence：${evidenceArtifact.relativePath}`;
      break;
    }
    case "verifier-accepted": {
      ensureRunningRole(state, "verifier");
      role = "verifier";
      nextAcceptance = {
        ...state.acceptanceState,
        verificationStatus: "passed",
        closeoutStatus: "pending",
        finalState: "accepted-with-closeout-pending",
        knownGaps: [],
        doneWhenChecklist: markChecklistPassed(state.acceptanceState)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          verifier: makeItem(
            "verifier",
            "done",
            "verification 证据支持当前 claim"
          ),
          closeout: makeItem(
            "closeout",
            "running",
            "清理残留工作并完成最终收口"
          )
        },
        null
      );
      const recentEvents = await readRecentEvents(projectRoot);
      const evidenceArtifact = await writeVerificationEvidenceArtifact(projectRoot, {
        state: {
          ...state,
          acceptanceState: nextAcceptance,
          activeWork: nextActiveWork
        },
        recentEvents,
        createdAt,
        status: "passed"
      });
      artifactPath = evidenceArtifact.relativePath;
      eventTitle = "Verifier 已接受当前 claim";
      eventDetail = `最终接受前还需要完成 closeout。 Evidence：${evidenceArtifact.relativePath}`;
      break;
    }
    case "closeout-complete": {
      ensureRunningRole(state, "closeout");
      role = "closeout";
      nextAcceptance = {
        ...state.acceptanceState,
        closeoutStatus: "done",
        finalState: "accepted",
        knownGaps: []
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          closeout: makeItem(
            "closeout",
            "done",
            "closeout 已完成，这个 slice 已被接受"
          ),
          hygiene: makeItem(
            "hygiene",
            "done",
            "accepted handoff 已自动写回，可作为下一段 slice 的 continuation packet"
          )
        },
        null
      );
      acceptedHandoffState = {
        ...state,
        acceptanceState: nextAcceptance,
        activeWork: nextActiveWork
      };
      const recentEvents = await readRecentEvents(projectRoot);
      const closeoutArtifact = await writeCloseoutArtifact(projectRoot, {
        state: acceptedHandoffState,
        recentEvents,
        createdAt
      });
      artifactPath = closeoutArtifact.relativePath;
      eventTitle = "Closeout 已完成";
      eventDetail = `Acceptance 已进入 accepted。 Closeout：${closeoutArtifact.relativePath}`;
      break;
    }
  }

  await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
  await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
  await appendEvent(projectRoot, {
    id: crypto.randomUUID(),
    createdAt,
    kind: "workflow-transition",
    title: eventTitle,
    detail: eventDetail,
    role,
    transitionId,
    artifactPath
  });

  if (acceptedHandoffState) {
    const packetCreatedAt = offsetIsoTimestamp(createdAt);
    const recentEvents = await readRecentEvents(projectRoot);
    const packet = await writeContinuationPacket(projectRoot, {
      kind: "handoff",
      state: acceptedHandoffState,
      recentEvents,
      createdAt: packetCreatedAt,
      continuationBehavior:
        acceptedHandoffState.preferences.resolved.continuationBehavior
    });

    await appendEvent(projectRoot, {
      id: crypto.randomUUID(),
      createdAt: packetCreatedAt,
      kind: "workflow-transition",
      title: packet.title,
      detail: `${packet.detail} Packet：${packet.relativePath}（closeout 自动生成）`,
      role: "hygiene",
      actionId: "create-handoff",
      artifactPath: packet.relativePath
    });
  }
}

export async function applyAgentRunResult(projectRoot: string, runId: string) {
  const state = await loadProjectState(projectRoot);
  const packet = await readAgentRunPacket(projectRoot, runId);
  const result = await readAgentRunResult(projectRoot, runId);
  const record = await readAgentRunRecord(projectRoot, runId);
  const createdAt = record.finishedAt ?? new Date().toISOString();
  const artifactPath = runArtifactPath(record.summaryPath, record.resultPath);
  const artifactOnly = isArtifactOnlyRun(packet);

  await recordCommandBridgeRunFinished(projectRoot, runId);

  let nextAcceptance: AcceptanceState = state.acceptanceState;
  let nextActiveWork: ActiveWork = state.activeWork;
  let writeDirectState = false;
  let handledByTransition = false;

  if (!artifactOnly && result.role === "planner") {
    if (result.outcome === "succeeded" && result.decision === "slice-ready") {
      nextAcceptance = {
        ...state.acceptanceState,
        implementationStatus: "implementing",
        reviewStatus: "not-started",
        verificationStatus: "not-started",
        closeoutStatus: "not-started",
        finalState: "not-ready",
        knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          planner: makeItem(
            "planner",
            "done",
            "已为当前 locked phase 选出下一条 slice"
          ),
          executor: makeItem(
            "executor",
            "running",
            nextExecutorTask(state)
          ),
          reviewer: makeItem(
            "reviewer",
            "waiting",
            "等待 executor 完成当前 slice 后开始 review"
          ),
          verifier: makeItem(
            "verifier",
            "idle",
            "等待 review 放行后再开始 verification"
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "等待 verification 通过后再进入 closeout"
          )
        },
        null
      );
      writeDirectState = true;
    } else {
      const failureGap = automationFailureGap(result);
      nextActiveWork = mergeActiveWork(
        state,
        {
          planner: makeItem(
            "planner",
            "blocked",
            result.decision === "pause-recommended"
              ? "Planner 建议暂停，等待补齐条件后再继续"
              : "Planner 没有给出可继续的 slice"
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待 planner 重新收束下一条 slice",
            true
          )
        },
        failureGap
      );
      writeDirectState = true;
    }
  }

  if (!artifactOnly && result.role === "executor") {
    if (result.outcome === "succeeded") {
      nextAcceptance = {
        ...state.acceptanceState,
        implementationStatus: "ready-for-review",
        reviewStatus: "in-review",
        verificationStatus: "not-started",
        finalState: "ready-for-review",
        knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          executor: makeItem(
            "executor",
            "done",
            "自动执行已完成，等待 reviewer 接手"
          ),
          reviewer: makeItem(
            "reviewer",
            "running",
            "根据最新结果审查当前 slice"
          ),
          verifier: makeItem(
            "verifier",
            "waiting",
            "等待 review 放行后再运行 verification"
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "等待 verification 通过后再进入 closeout"
          )
        },
        null
      );
    } else {
      const failureGap = automationFailureGap(result);
      nextAcceptance = {
        ...state.acceptanceState,
        implementationStatus: "implementing",
        reviewStatus: "not-started",
        verificationStatus: "not-started",
        closeoutStatus: "not-started",
        finalState: "not-ready",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          failureGap
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          executor: makeItem(
            "executor",
            "blocked",
            executorFailureTaskSummary(result)
          ),
          reviewer: makeItem(
            "reviewer",
            "waiting",
            "等待新的 executor 结果后再开始 review"
          ),
          verifier: makeItem(
            "verifier",
            "idle",
            "当前还不能进入 verification"
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "在实现重新稳定前，closeout 暂不开始"
          )
        },
        failureGap
      );
    }

    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
  }

  if (!artifactOnly && result.role === "reviewer") {
    if (result.outcome === "succeeded" && result.decision === "review-blocked") {
      await applyWorkflowTransition(projectRoot, "reviewer-blocked");
      handledByTransition = true;
    } else if (
      result.outcome === "succeeded" &&
      result.decision === "ready-for-verification"
    ) {
      nextAcceptance = {
        ...state.acceptanceState,
        reviewStatus: "ready-for-verification",
        verificationStatus: "running",
        finalState: "ready-for-verification",
        knownGaps: withoutWorkflowGaps(state.acceptanceState.knownGaps)
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          reviewer: makeItem(
            "reviewer",
            "done",
            "已允许这个 slice 进入 verification"
          ),
          verifier: makeItem(
            "verifier",
            "running",
            "正在对当前 claim 执行 verification"
          ),
          closeout: makeItem(
            "closeout",
            "idle",
            "等待 verification 通过后再进入 closeout"
          )
        },
        null
      );
      writeDirectState = true;
    } else {
      const failureGap = automationFailureGap(result);
      nextAcceptance = {
        ...state.acceptanceState,
        reviewStatus: "review-blocked",
        verificationStatus: "not-started",
        finalState: "review-blocked",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          failureGap
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          reviewer: makeItem(
            "reviewer",
            "blocked",
            "Reviewer 没有给出可放行的结论",
            true
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待下一条 repair slice 再继续",
            true
          )
        },
        failureGap
      );
      writeDirectState = true;
    }
  }

  if (!artifactOnly && result.role === "verifier") {
    if (result.outcome === "succeeded" && result.decision === "verification-failed") {
      await applyWorkflowTransition(projectRoot, "verifier-failed");
      handledByTransition = true;
    } else if (
      result.outcome === "succeeded" &&
      result.decision === "accepted-with-closeout-pending"
    ) {
      await applyWorkflowTransition(projectRoot, "verifier-accepted");
      handledByTransition = true;
    } else {
      const failureGap = automationFailureGap(result);
      nextAcceptance = {
        ...state.acceptanceState,
        verificationStatus: "failed",
        closeoutStatus: "not-started",
        finalState: "verification-failed",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          failureGap
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          verifier: makeItem(
            "verifier",
            "blocked",
            "Verifier 没有给出可继续的结果",
            true
          ),
          executor: makeItem(
            "executor",
            "waiting",
            "等待新的 repair slice 再继续",
            true
          )
        },
        failureGap
      );
      writeDirectState = true;
    }
  }

  if (!artifactOnly && result.role === "closeout") {
    if (
      result.outcome === "succeeded" &&
      (result.decision === "accepted" || result.decision === undefined)
    ) {
      await applyWorkflowTransition(projectRoot, "closeout-complete");
      handledByTransition = true;
    } else {
      const failureGap = automationFailureGap(result);
      nextAcceptance = {
        ...state.acceptanceState,
        closeoutStatus: "pending",
        finalState: "accepted-with-closeout-pending",
        knownGaps: addKnownGap(
          withoutWorkflowGaps(state.acceptanceState.knownGaps),
          failureGap
        )
      };
      nextActiveWork = mergeActiveWork(
        state,
        {
          closeout: makeItem(
            "closeout",
            "blocked",
            "Closeout 还没有完成，等待处理残留项",
            true
          )
        },
        failureGap
      );
      writeDirectState = true;
    }
  }

  if (writeDirectState && !handledByTransition && result.role !== "executor") {
    await writeStateFragment(projectRoot, STATE_FILES.acceptanceState, nextAcceptance);
    await writeStateFragment(projectRoot, STATE_FILES.activeWork, nextActiveWork);
  }

  await appendEvent(projectRoot, {
    id: crypto.randomUUID(),
    createdAt,
    kind: "agent-run",
    title:
      result.outcome === "succeeded"
        ? `${providerLabel(result.provider)} 完成 ${result.role} 执行`
        : failedRunEventTitle(result),
    detail:
      result.outcome === "succeeded"
        ? `结果：${result.summary}${artifactPath ? ` Artifact：${artifactPath}` : ""}`
        : failedRunEventDetail(result, artifactPath),
    role: result.role,
    runId,
    provider: result.provider,
    outcome: result.outcome,
    artifactPath
  });
}
