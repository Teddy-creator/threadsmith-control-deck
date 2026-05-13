import {
  type ContextReference,
  type ExecutionPacket,
  type PhaseOwner,
  type ProviderId,
  type SkillCapability,
  type SkillOrchestratorConfig,
  executionPacketSchema
} from "@threadsmith/domain";
import {
  buildMiniProtocolInstruction,
  resolveSkillRoute
} from "@threadsmith/runtime";
import {
  loadProjectState,
  readLatestAgentRuns,
  readLatestPhaseRun,
  readPhasePause,
  readRecentEvents
} from "@threadsmith/fs-bridge";
import type { RoleExecutionRequest } from "./providerTypes.ts";

function baseStateRefs(): ContextReference[] {
  return [
    {
      kind: "state",
      path: ".threadsmith/project-brief.json",
      title: "项目简报"
    },
    {
      kind: "state",
      path: ".threadsmith/project-status.json",
      title: "项目状态"
    },
    {
      kind: "state",
      path: ".threadsmith/current-phase.json",
      title: "当前 phase"
    },
    {
      kind: "state",
      path: ".threadsmith/acceptance-state.json",
      title: "验收状态"
    },
    {
      kind: "state",
      path: ".threadsmith/active-work.json",
      title: "进行中的工作"
    }
  ];
}

function roadmapRef(): ContextReference {
  return {
    kind: "state",
    path: ".threadsmith/project-roadmap.json",
    title: "项目地图"
  };
}

function eventRefs(
  events: Awaited<ReturnType<typeof readRecentEvents>>
): ContextReference[] {
  return events.slice(0, 2).map((event) => ({
    kind: "event",
    path: ".threadsmith/events.ndjson",
    title: `${event.createdAt} ${event.title}`
  }));
}

function currentContextPacketRef(): ContextReference {
  return {
    kind: "state",
    path: ".threadsmith/context/current-packet.json",
    title: "current context packet"
  };
}

function roleContextPacketRef(role: PhaseOwner): ContextReference {
  return {
    kind: "state",
    path: `.threadsmith/context/role-packets/${role}.json`,
    title: `${role} role context packet`
  };
}

function latestRunRefs(
  records: Awaited<ReturnType<typeof readLatestAgentRuns>>
): ContextReference[] {
  return records.slice(0, 2).flatMap((record) => {
    const artifactPath = record.summaryPath ?? record.resultPath;

    if (!artifactPath) {
      return [];
    }

    return [
      {
        kind: "artifact" as const,
        path: artifactPath,
        title: `最近运行：${record.role} / ${record.status}`
      }
    ];
  });
}

function phaseRunRecordPath(phaseRunId: string) {
  return `.threadsmith/phase-runs/${phaseRunId}/phase-run.json`;
}

function phaseRunSlicePath(phaseRunId: string, sliceId: string) {
  return `.threadsmith/phase-runs/${phaseRunId}/slices/${sliceId}.json`;
}

function phaseRunPausePath(phaseRunId: string) {
  return `.threadsmith/phase-runs/${phaseRunId}/pause.json`;
}

async function latestPhaseRunRefs(projectRoot: string): Promise<ContextReference[]> {
  const latestPhaseRun = await readLatestPhaseRun(projectRoot);

  if (!latestPhaseRun) {
    return [];
  }

  const refs: ContextReference[] = [
    {
      kind: "artifact",
      path: phaseRunRecordPath(latestPhaseRun.phaseRunId),
      title: `最新 phase run / ${latestPhaseRun.status}`
    },
    {
      kind: "artifact",
      path: latestPhaseRun.lockedPhaseSnapshotRef,
      title: "locked phase snapshot"
    }
  ];

  if (latestPhaseRun.currentSliceId) {
    refs.push({
      kind: "artifact",
      path: phaseRunSlicePath(latestPhaseRun.phaseRunId, latestPhaseRun.currentSliceId),
      title: `当前 slice / ${latestPhaseRun.currentSliceId}`
    });
  }

  const latestPause = await readPhasePause(projectRoot, latestPhaseRun.phaseRunId);

  if (latestPause) {
    refs.push({
      kind: "artifact",
      path: phaseRunPausePath(latestPhaseRun.phaseRunId),
      title: `pause / ${latestPause.type}`
    });
  }

  return refs;
}

function defaultOutput(runId: string) {
  return {
    resultPath: `.threadsmith/runs/${runId}/result.json`,
    summaryPath: `.threadsmith/runs/${runId}/result.md`
  };
}

function builtInOnlyOrchestratorConfig(): SkillOrchestratorConfig {
  return {
    version: 1,
    builtInProtocols: [
      "brief",
      "plan",
      "debug",
      "review",
      "verify",
      "closeout",
      "handoff",
      "recover",
      "research"
    ],
    adapters: [],
    routePreferences: [],
    defaultFallback: "plan",
    selfHosting: {
      activeController: "installed-skill",
      repositorySkillPath: "codex/skills/threadsmith/SKILL.md",
      installedSkillPath: "~/.codex/skills/threadsmith/SKILL.md",
      allowGlobalSkillMutation: false
    }
  };
}

function protocolCapabilityForRole(role: PhaseOwner): SkillCapability {
  switch (role) {
    case "planner":
    case "executor":
      return "plan";
    case "reviewer":
      return "review";
    case "verifier":
      return "verify";
    case "closeout":
      return "closeout";
    case "hygiene":
      return "recover";
  }
}

function packetContextLines(contextRefs: ContextReference[]) {
  return contextRefs.length > 0
    ? contextRefs
        .map((ref) => `- [${ref.kind}] ${ref.path}${ref.title ? ` (${ref.title})` : ""}`)
        .join("\n")
    : "- 无额外上下文引用";
}

function packetProtocolLines(packet: ExecutionPacket) {
  const instruction = packet.protocolInstruction;

  if (!instruction) {
    return ["- 未附加 mini protocol instruction"];
  }

  const route = instruction.route;
  return [
    `- Protocol: ${instruction.protocol.id} (${instruction.protocol.label})`,
    `- Source: ${route.source}`,
    `- Adapter: ${route.selectedAdapterId ?? "none"}`,
    `- Availability: ${route.availability}`,
    `- Route reason: ${route.reason}`,
    `- Stop condition: ${instruction.stopCondition}`,
    `- Continuation hint: ${instruction.continuationHint}`,
    "- Required inputs:",
    ...instruction.inputChecklist.map((item) => `  - ${item}`),
    "- Required outputs:",
    ...instruction.outputChecklist.map((item) => `  - ${item}`),
    "- Protocol guardrails:",
    ...instruction.guardrails.map((item) => `  - ${item}`),
    ...(route.safetyWarnings.length > 0
      ? [
          "- Safety warnings:",
          ...route.safetyWarnings.map((item) => `  - ${item}`)
        ]
      : [])
  ];
}

function packetListLines(items: string[], emptyText: string) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

function planningMode(finalState: string) {
  return finalState === "review-blocked" || finalState === "verification-failed"
    ? "repair"
    : "primary";
}

function plannerDoneWhen(mode: "primary" | "repair") {
  return [
    `产出一条不超出当前 phase 的 ${mode} slice 建议`,
    "明确 slice 的 scope、done when 与 verification",
    "如果当前真相不足以安全继续，则改为给出 pause recommendation"
  ];
}

function roleRules(role: PhaseOwner) {
  switch (role) {
    case "planner":
      return {
        contract: [
          "只允许在当前锁定 phase 内收窄下一条最小 slice。",
          "不要改写 locked phase contract，不要直接修改代码。",
          "如果无法安全继续，使用 pauseRecommendation 而不是硬推。"
        ],
        decisions: ["slice-ready", "pause-recommended"]
      };
    case "executor":
      return {
        contract: [
          "只推进当前 slice，不要扩大范围。",
          "先阅读 committed truth 和必要文件，再开始修改。",
          "完成后如实填写 changedFiles、verification、evidenceRefs。"
        ],
        decisions: ["ready-for-review"]
      };
    case "reviewer":
      return {
        contract: [
          "只判断当前输出能否进入 verification，不要自己补代码。",
          "遇到阻塞时明确指出 blocker 与关键发现。",
          "不要把不确定性包装成通过。"
        ],
        decisions: ["ready-for-verification", "review-blocked"]
      };
    case "verifier":
      return {
        contract: [
          "只根据证据做 verification 结论，不要把缺失证据当成通过。",
          "需要时运行或复核 verification 命令，并如实回填结果。",
          "不要直接给最终 accepted。"
        ],
        decisions: [
          "verification-failed",
          "accepted-with-closeout-pending"
        ]
      };
    case "closeout":
      return {
        contract: [
          "只在 verification 已通过的前提下执行 closeout。",
          "清理临时痕迹、记录 residual risks、补齐必要文档。",
          "不要掩盖尚未解决的问题。"
        ],
        decisions: ["accepted"]
      };
    case "hygiene":
      return {
        contract: [
          "重新锚定 committed truth，区分 verified facts 与 assumptions。",
          "只提出下一步最小动作，不要重开整个任务。",
          "不要伪造验证结论。"
        ],
        decisions: []
      };
  }
}

function renderRoleHeader(packet: ExecutionPacket) {
  return [
    `你正在执行一条 Threadsmith ${packet.role} packet。`,
    "",
    "通用要求：",
    "- 先阅读引用的 committed truth 与必要文件，再行动。",
    "- 不要输出阶段性自然语言汇报；读取、执行、验证后直接结束。",
    "- 最后一条消息必须是符合 schema 的结构化 JSON。",
    "- 不要宣称成功，除非你真的得到了对应证据。"
  ];
}

export function renderRolePrompt(packet: ExecutionPacket) {
  const rules = roleRules(packet.role);
  const decisionLines =
    rules.decisions.length > 0
      ? rules.decisions.map((item) => `- ${item}`)
      : ["- 本角色不要求额外 decision 字段"];

  return [
    ...renderRoleHeader(packet),
    "",
    "角色边界：",
    ...rules.contract.map((line) => `- ${line}`),
    "",
    `Run ID: ${packet.runId}`,
    `Project Root: ${packet.projectRoot}`,
    `Role: ${packet.role}`,
    `Provider: ${packet.provider}`,
    "",
    "Objective:",
    packet.objective,
    "",
    "Scope:",
    packetListLines(packet.scope, "本轮没有额外 scope"),
    "",
    "Done When:",
    packetListLines(packet.doneWhen, "本轮没有额外 done when"),
    "",
    "Verification:",
    packetListLines(packet.verification, "本轮没有额外验证命令"),
    "",
    "Context Refs:",
    packetContextLines(packet.contextRefs),
    "",
    "Mini Protocol Instruction:",
    ...packetProtocolLines(packet),
    "",
    "Allowed decision values:",
    ...decisionLines,
    "",
    "Final output contract:",
    "- 必填：summary、changedFiles、verification、evidenceRefs。",
    "- `decision`、`sliceRef`、`pauseRecommendation`、`riskHits`、`blocker` 这几个 key 也会出现在 JSON 里；如果不适用请显式填 `null`。",
    `- 结果会保存到 ${packet.output.resultPath}。`,
    "- 只有在确有需要时才填写具体值；否则填 `null`。"
  ].join("\n");
}

function buildPlannerObjective(
  phaseGoal: string,
  mode: "primary" | "repair"
) {
  return mode === "repair"
    ? `为当前锁定 phase 收束下一条 repair slice，并基于失败信号缩小范围。当前 phase goal：${phaseGoal}`
    : `为当前锁定 phase 收束下一条 primary slice。当前 phase goal：${phaseGoal}`;
}

function buildRolePacket(input: {
  projectRoot: string;
  runId: string;
  provider: ProviderId;
  role: PhaseOwner;
  objective: string;
  scope: string[];
  doneWhen: string[];
  verification: string[];
  contextRefs: ContextReference[];
}): ExecutionPacket {
  const route = resolveSkillRoute({
    role: input.role,
    requestedCapability: protocolCapabilityForRole(input.role),
    config: builtInOnlyOrchestratorConfig()
  });

  return executionPacketSchema.parse({
    runId: input.runId,
    projectRoot: input.projectRoot,
    role: input.role,
    provider: input.provider,
    objective: input.objective,
    scope: input.scope,
    doneWhen: input.doneWhen,
    verification: input.verification,
    protocolInstruction: buildMiniProtocolInstruction({
      route,
      role: input.role,
      objective: input.objective
    }),
    contextRefs: [
      currentContextPacketRef(),
      roleContextPacketRef(input.role),
      ...input.contextRefs
    ],
    output: defaultOutput(input.runId)
  });
}

export async function buildPacketForRole(
  input: RoleExecutionRequest
): Promise<ExecutionPacket> {
  const state = await loadProjectState(input.projectRoot);
  const recentEvents = await readRecentEvents(input.projectRoot, 4);
  const latestRuns = await readLatestAgentRuns(input.projectRoot, 4);
  const phaseRefs = await latestPhaseRunRefs(input.projectRoot);
  const sharedRefs = [...baseStateRefs(), ...eventRefs(recentEvents)];
  const downstreamRefs = latestRunRefs(latestRuns);

  switch (input.role) {
    case "planner": {
      const mode = planningMode(state.acceptanceState.finalState);

      return buildRolePacket({
        projectRoot: input.projectRoot,
        runId: input.runId,
        provider: input.provider,
        role: "planner",
        objective: buildPlannerObjective(state.currentPhase.phaseGoal, mode),
        scope:
          state.currentPhase.inScope.length > 0
            ? state.currentPhase.inScope
            : [state.currentPhase.deliverable],
        doneWhen: plannerDoneWhen(mode),
        verification: [],
        contextRefs: [...sharedRefs, roadmapRef(), ...phaseRefs, ...downstreamRefs]
      });
    }
    case "executor":
      return buildRolePacket({
        projectRoot: input.projectRoot,
        runId: input.runId,
        provider: input.provider,
        role: "executor",
        objective: state.currentPhase.phaseGoal,
        scope:
          state.currentPhase.inScope.length > 0
            ? state.currentPhase.inScope
            : [state.currentPhase.deliverable],
        doneWhen:
          state.acceptanceState.doneWhenChecklist.length > 0
            ? state.acceptanceState.doneWhenChecklist.map((item) => item.label)
            : [state.currentPhase.stopCondition],
        verification: state.currentPhase.verificationForThisPhase,
        contextRefs: [...sharedRefs, ...phaseRefs, ...downstreamRefs]
      });
    case "reviewer":
      return buildRolePacket({
        projectRoot: input.projectRoot,
        runId: input.runId,
        provider: input.provider,
        role: "reviewer",
        objective: "复核当前 slice 输出是否符合 Project Brief、当前 phase 与当前 claim。",
        scope: [
          "检查当前输出是否仍在 locked phase 范围内",
          "判断当前结果是否可以进入 verification"
        ],
        doneWhen: [
          "只给出 ready-for-verification 或 review-blocked",
          "如果阻塞，明确 blocker 与关键发现"
        ],
        verification: [],
        contextRefs: [...sharedRefs, ...phaseRefs, ...downstreamRefs]
      });
    case "verifier":
      return buildRolePacket({
        projectRoot: input.projectRoot,
        runId: input.runId,
        provider: input.provider,
        role: "verifier",
        objective: "独立检查当前 claim 是否已被证据支持，并给出 verification 结论。",
        scope: [
          "复核当前 claim 与 done when",
          "检查已有证据是否足够支撑通过"
        ],
        doneWhen: [
          "只给出 verification-failed 或 accepted-with-closeout-pending",
          "如果失败，明确证据缺口或失败命令"
        ],
        verification: state.currentPhase.verificationForThisPhase,
        contextRefs: [...sharedRefs, ...phaseRefs, ...downstreamRefs]
      });
    case "closeout":
      return buildRolePacket({
        projectRoot: input.projectRoot,
        runId: input.runId,
        provider: input.provider,
        role: "closeout",
        objective: "对当前已通过 verification 的结果做收尾，准备 accepted 状态。",
        scope: [
          "清理临时调试痕迹",
          "记录 residual risks 与必要文档更新"
        ],
        doneWhen: [
          "说明完成了哪些 closeout 动作",
          "只在可以安全收尾时给出 accepted"
        ],
        verification: [],
        contextRefs: [...sharedRefs, ...phaseRefs, ...downstreamRefs]
      });
    case "hygiene":
      return buildRolePacket({
        projectRoot: input.projectRoot,
        runId: input.runId,
        provider: input.provider,
        role: "hygiene",
        objective: "清理会话惯性，重新锚定 committed truth，并给出下一步最小动作。",
        scope: [
          "区分 verified facts、assumptions、stale inferences",
          "给出当前最小可继续动作"
        ],
        doneWhen: ["产出一份可信的 session hygiene 结果"],
        verification: [],
        contextRefs: [...sharedRefs, ...phaseRefs, ...downstreamRefs]
      });
  }
}

export async function buildPlannerPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "planner"
  });
}

export async function buildExecutorPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "executor"
  });
}

export async function buildReviewerPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "reviewer"
  });
}

export async function buildVerifierPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "verifier"
  });
}

export async function buildCloseoutPacket(
  projectRoot: string,
  runId: string,
  provider: ProviderId = "codex"
) {
  return buildPacketForRole({
    projectRoot,
    runId,
    provider,
    role: "closeout"
  });
}

export const renderExecutorPrompt = renderRolePrompt;
