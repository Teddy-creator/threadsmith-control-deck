import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";
import type { ZodType } from "zod";
import {
  alignProjectRoadmapToStatus,
  commandBridgeStateSchema,
  type ContinuationBehavior,
  type PreferenceScope,
  contextPacketSchema,
  type ContextPacket,
  type ProjectSupervisionState,
  type ProjectState,
  activeWorkSchema,
  acceptanceStateSchema,
  createPreferences,
  currentPhaseSchema,
  deriveFallbackProjectRoadmap,
  deriveFallbackProjectStatus,
  providerRoutingSchema,
  projectBriefSchema,
  projectRoadmapSchema,
  projectSupervisionStateSchema,
  projectStatusSchema,
  projectStateSchema,
  storedPreferencesSchema
} from "@threadsmith/domain";
import {
  STATE_FILES,
  CONTEXT_FILES,
  getPhaseRunsDir,
  getContextDir,
  getContextFilePath,
  getGlobalPreferencesPath,
  getProviderRoutingPath,
  getRunsDir,
  getStatePath,
  getThreadsmithDir
} from "./paths.ts";

async function readParsedFile<T>(
  filePath: string,
  schema: ZodType<T>
): Promise<T> {
  const contents = await readFile(filePath, "utf8");
  return schema.parse(JSON.parse(contents));
}

async function readOptionalParsedFile<T>(
  filePath: string,
  schema: ZodType<T>,
  fallback: T
): Promise<T> {
  try {
    return await readParsedFile(filePath, schema);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export interface LoadProjectStateOptions {
  globalPreferencesPath?: string;
  seed?: InitialProjectStateSeed;
  overwriteCoreState?: boolean;
}

export interface InitialProjectStateSeed {
  projectBrief?: unknown;
  projectStatus?: unknown;
  projectRoadmap?: unknown;
  currentPhase?: unknown;
  acceptanceState?: unknown;
  activeWork?: unknown;
  projectSupervision?: unknown;
  preferences?: unknown;
}

export async function ensureStateDir(projectRoot: string) {
  await mkdir(getThreadsmithDir(projectRoot), { recursive: true });
  await mkdir(getRunsDir(projectRoot), { recursive: true });
  await mkdir(getPhaseRunsDir(projectRoot), { recursive: true });
  await mkdir(getContextDir(projectRoot), { recursive: true });
}

function formatStateFileContents(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeFileIfMissing(filePath: string, contents: string) {
  try {
    await access(filePath);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

function deriveProjectLabel(projectRoot: string) {
  const trimmedRoot = projectRoot.replace(/[\\/]+$/, "");
  return basename(trimmedRoot) || "当前项目";
}

function defaultSupervisionThreadLabel(role: string) {
  switch (role) {
    case "planner":
      return "Conductor";
    case "executor":
      return "Builder";
    case "reviewer":
      return "Critic";
    case "verifier":
      return "Verifier";
    case "closeout":
      return "Closeout";
    default:
      return "Hygiene";
  }
}

function defaultSupervisionTaskSummary(projectLabel: string, role: string) {
  switch (role) {
    case "planner":
      return `负责为 ${projectLabel} 收束当前阶段目标与下一条最小 slice。`;
    case "executor":
      return "负责推进当前实现并把结果回写到 committed truth。";
    case "reviewer":
      return "负责复核当前输出并判断是否可以进入 verification。";
    case "verifier":
      return "负责独立验证当前结果并补齐证据。";
    case "closeout":
      return "负责清理临时痕迹并补齐 closeout artifact。";
    default:
      return "负责帮助当前线程重新对齐最新真相。";
  }
}

function deriveFallbackProjectSupervision(args: {
  projectLabel: string;
  currentPhase: Awaited<ReturnType<typeof currentPhaseSchema.parse>>;
  activeWork: Awaited<ReturnType<typeof activeWorkSchema.parse>>;
}): ProjectSupervisionState {
  const ownerIds = [
    ...new Set([
      ...args.currentPhase.activeOwners,
      ...args.activeWork.items.map((item) => item.role)
    ])
  ];

  const lines = ownerIds.map((role) => {
    const workItem = args.activeWork.items.find((item) => item.role === role);

    return {
      id: role,
      role,
      threadLabel: defaultSupervisionThreadLabel(role),
      provider: null,
      presence: "logical" as const,
      status: workItem?.status ?? "idle",
      taskSummary:
        workItem?.taskSummary ?? defaultSupervisionTaskSummary(args.projectLabel, role),
      requiresUserDecision: workItem?.requiresUserDecision ?? false,
      blockerSummary:
        workItem?.status === "blocked"
          ? args.activeWork.blockerSummary ?? workItem.taskSummary
          : null,
      latestEvidenceLabel: null,
      updatedAt: null
    };
  });

  const mode = lines.length <= 1 ? "single-thread" : "multi-thread";
  const modeLabel = lines.length <= 1 ? "单线推进" : "多角色协作";
  const summary =
    lines.length === 0
      ? "当前还没有记录项目级监督线。"
      : lines.length === 1
        ? "当前先按一条逻辑监督线推进；是否已有真实线程归属以 committed supervision truth 为准。"
        : `当前先按 ${lines.length} 条角色监督线推进；是否已有真实线程归属以 committed supervision truth 为准。`;

  return projectSupervisionStateSchema.parse({
    mode,
    modeLabel,
    summary,
    lines,
    updatedAt: null
  });
}

function buildInitialProjectState(projectRoot: string) {
  const projectLabel = deriveProjectLabel(projectRoot);

  return {
    projectBrief: projectBriefSchema.parse({
      projectGoal: `让 ${projectLabel} 接入 Threadsmith 工作流`,
      currentVersionScope: "真实项目已接入 Threadsmith，等待定义第一条可执行 slice。",
      nonGoals: [
        "在初始化阶段自动推断整个仓库的需求",
        "直接开始大范围实现"
      ],
      keyConstraints: [
        "初始化只补齐最小状态文件，不覆盖已有 Threadsmith truth",
        "先定义一个窄 phase，再推进真实编码工作"
      ],
      successFrame:
        "你能在 deck 里看到这个真实项目，并且下一最佳动作已经指向第一条可执行 slice。",
      priorityOrder: [
        "建立项目简报",
        "定义当前 phase",
        "开始第一条窄实现线"
      ],
      openStrategicQuestions: []
    }),
    projectStatus: projectStatusSchema.parse({
      projectLabel,
      currentTrack: "Threadsmith workflow 接入",
      overallState: "planning",
      currentFocus: `为 ${projectLabel} 定义第一条可执行 phase 与 task brief`,
      projectStatusSummary: `${projectLabel} 已接入 Threadsmith，正在准备第一条真实开发线。`,
      latestAcceptedSlice: null,
      nextPlannedSlice: {
        title: "定义第一个 Threadsmith slice",
        recordedAt: null
      },
      topRisks: [
        "还没有针对当前项目的具体 task brief",
        "还没有第一轮实现与验证证据"
      ],
      updatedAt: null
    }),
    projectRoadmap: projectRoadmapSchema.parse({
      versionLabel: `${projectLabel} v1`,
      finalGoal: `让 ${projectLabel} 从刚接入 Threadsmith 进入可持续推进的真实开发节奏。`,
      milestones: [
        {
          id: "project-connected",
          label: "项目接入",
          title: `连接 ${projectLabel} 并初始化 Threadsmith`,
          summary: "项目目录已经建立最小 Threadsmith 真相文件。",
          state: "done"
        },
        {
          id: "define-first-scope",
          label: "任务定界",
          title: "明确首条 task brief 与 phase contract",
          summary: "先收紧范围，再开始真实开发。",
          state: "current"
        },
        {
          id: "first-slice",
          label: "首轮实现",
          title: "完成第一条真实开发切片",
          summary: "让项目从初始化状态进入第一条可执行实现线。",
          state: "next"
        },
        {
          id: "verify-closeout",
          label: "验证收口",
          title: "补齐验证证据与 closeout",
          summary: "让第一轮实现具备独立验证与收尾结果。",
          state: "later"
        },
        {
          id: "steady-loop",
          label: "稳定节奏",
          title: "形成可持续推进的 AI coding 工作流",
          summary: "让项目可以稳定地继续下一轮 slice。",
          state: "later"
        }
      ],
      updatedAt: null
    }),
    currentPhase: currentPhaseSchema.parse({
      phaseName: "定义第一个 Threadsmith slice",
      phaseGoal: `为 ${projectLabel} 写出第一条可执行的 phase contract`,
      deliverable: "一个可以继续推进的首个 slice brief",
      inScope: [
        "明确当前目标",
        "收紧本轮范围",
        "补齐第一版 done when"
      ],
      outOfScope: [
        "自动分析整个仓库",
        "在未收紧范围前直接开始编码"
      ],
      stopCondition: "项目简报和当前 phase 已足够清晰，可以进入第一条真实实现线。",
      verificationForThisPhase: [
        "项目可以从 deck 正常加载",
        "下一最佳动作与当前 phase 一致",
        "用户可以基于这份初始状态继续推进"
      ],
      activeOwners: ["planner"],
      blockedBy: []
    }),
    acceptanceState: acceptanceStateSchema.parse({
      currentClaim: "Threadsmith 初始化完成，项目已经准备好定义第一条真实开发切片。",
      doneWhenChecklist: [
        {
          id: "state-bootstrap",
          label: "Threadsmith 基础状态文件已初始化",
          status: "pass"
        },
        {
          id: "phase-contract",
          label: "第一条可执行 phase 已定义",
          status: "pass"
        },
        {
          id: "execution-ready",
          label: "下一最佳动作已经可以继续推进",
          status: "pass"
        }
      ],
      implementationStatus: "not-started",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      knownGaps: [
        "还没有针对当前项目的具体 task brief",
        "还没有第一轮实现与验证证据"
      ],
      finalState: "not-ready"
    }),
    activeWork: activeWorkSchema.parse({
      items: [
        {
          role: "planner",
          status: "running",
          taskSummary: `为 ${projectLabel} 起草第一条 task brief 与 phase contract`,
          requiresUserDecision: true
        }
      ],
      blockerSummary: null
    }),
    preferences: storedPreferencesSchema.parse({})
  };
}

function composeInitialProjectState(
  projectRoot: string,
  seed: InitialProjectStateSeed = {}
) {
  const defaults = buildInitialProjectState(projectRoot);
  const projectBrief = projectBriefSchema.parse(
    seed.projectBrief ?? defaults.projectBrief
  );
  const currentPhase = currentPhaseSchema.parse(
    seed.currentPhase ?? defaults.currentPhase
  );
  const acceptanceState = acceptanceStateSchema.parse(
    seed.acceptanceState ?? defaults.acceptanceState
  );
  const activeWork = activeWorkSchema.parse(seed.activeWork ?? defaults.activeWork);
  const projectStatus = projectStatusSchema.parse(
    seed.projectStatus
      ?? deriveFallbackProjectStatus({
        projectLabel: deriveProjectLabel(projectRoot),
        projectBrief,
        currentPhase,
        acceptanceState
      })
  );
  const projectRoadmap = projectRoadmapSchema.parse(
    seed.projectRoadmap
      ?? deriveFallbackProjectRoadmap({
        projectLabel: projectStatus.projectLabel,
        projectBrief,
        projectStatus,
        currentPhase,
        acceptanceState
      })
  );
  const projectSupervision = projectSupervisionStateSchema.parse(
    seed.projectSupervision
      ?? deriveFallbackProjectSupervision({
        projectLabel: projectStatus.projectLabel,
        currentPhase,
        activeWork
      })
  );
  const preferences = storedPreferencesSchema.parse(
    seed.preferences ?? defaults.preferences
  );

  return {
    projectBrief,
    projectStatus,
    projectRoadmap,
    currentPhase,
    acceptanceState,
    activeWork,
    projectSupervision,
    preferences
  };
}

function buildInitialProjectSupervision(
  projectRoot: string,
  initialState: ReturnType<typeof buildInitialProjectState>
) {
  return deriveFallbackProjectSupervision({
    projectLabel: deriveProjectLabel(projectRoot),
    currentPhase: currentPhaseSchema.parse(initialState.currentPhase),
    activeWork: activeWorkSchema.parse(initialState.activeWork)
  });
}

export async function initializeProjectState(
  projectRoot: string,
  options: LoadProjectStateOptions = {}
) {
  const initialState = composeInitialProjectState(projectRoot, options.seed);
  const writeStateFile = async (
    filePath: string,
    value: unknown,
    overwrite = false
  ) => {
    if (!overwrite) {
      await writeFileIfMissing(filePath, formatStateFileContents(value));
      return;
    }

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, formatStateFileContents(value), "utf8");
  };

  await ensureStateDir(projectRoot);
  await Promise.all([
    writeStateFile(
      getStatePath(projectRoot, STATE_FILES.projectBrief),
      initialState.projectBrief,
      options.overwriteCoreState
    ),
    writeStateFile(
      getStatePath(projectRoot, STATE_FILES.projectStatus),
      initialState.projectStatus,
      options.overwriteCoreState
    ),
    writeStateFile(
      getStatePath(projectRoot, STATE_FILES.projectRoadmap),
      initialState.projectRoadmap,
      options.overwriteCoreState
    ),
    writeStateFile(
      getStatePath(projectRoot, STATE_FILES.currentPhase),
      initialState.currentPhase,
      options.overwriteCoreState
    ),
    writeStateFile(
      getStatePath(projectRoot, STATE_FILES.acceptanceState),
      initialState.acceptanceState,
      options.overwriteCoreState
    ),
    writeStateFile(
      getStatePath(projectRoot, STATE_FILES.activeWork),
      initialState.activeWork,
      options.overwriteCoreState
    ),
    writeStateFile(
      getStatePath(projectRoot, STATE_FILES.projectSupervision),
      initialState.projectSupervision,
      options.overwriteCoreState
    ),
    writeStateFile(
      getStatePath(projectRoot, STATE_FILES.preferences),
      initialState.preferences,
      false
    ),
    writeFileIfMissing(
      getProviderRoutingPath(projectRoot),
      formatStateFileContents(providerRoutingSchema.parse({}))
    ),
    writeFileIfMissing(
      getStatePath(projectRoot, STATE_FILES.commandBridge),
      formatStateFileContents(commandBridgeStateSchema.parse({
        latestRoute: null,
        latestRun: null,
        updatedAt: null
      }))
    ),
    writeFileIfMissing(getStatePath(projectRoot, STATE_FILES.actionHistory), ""),
    writeFileIfMissing(getStatePath(projectRoot, STATE_FILES.events), "")
  ]);

  return loadProjectState(projectRoot, options);
}

export async function loadProjectSupervisionState(
  projectRoot: string,
  state?: Pick<ProjectState, "projectStatus" | "currentPhase" | "activeWork">
): Promise<ProjectSupervisionState> {
  const currentPhase = state?.currentPhase
    ?? (await readParsedFile(
      getStatePath(projectRoot, STATE_FILES.currentPhase),
      currentPhaseSchema
    ));
  const activeWork = state?.activeWork
    ?? (await readParsedFile(
      getStatePath(projectRoot, STATE_FILES.activeWork),
      activeWorkSchema
    ));
  const fallback = deriveFallbackProjectSupervision({
    projectLabel: state?.projectStatus.projectLabel ?? deriveProjectLabel(projectRoot),
    currentPhase,
    activeWork
  });

  return readOptionalParsedFile(
    getStatePath(projectRoot, STATE_FILES.projectSupervision),
    projectSupervisionStateSchema,
    fallback
  );
}

export async function loadProjectState(
  projectRoot: string,
  options: LoadProjectStateOptions = {}
): Promise<ProjectState> {
  const projectPreferences = await readOptionalParsedFile(
    getStatePath(projectRoot, STATE_FILES.preferences),
    storedPreferencesSchema,
    storedPreferencesSchema.parse({})
  );
  const globalPreferences = await readOptionalParsedFile(
    getGlobalPreferencesPath(options.globalPreferencesPath),
    storedPreferencesSchema,
    storedPreferencesSchema.parse({})
  );
  const projectBrief = await readParsedFile(
    getStatePath(projectRoot, STATE_FILES.projectBrief),
    projectBriefSchema
  );
  const currentPhase = await readParsedFile(
    getStatePath(projectRoot, STATE_FILES.currentPhase),
    currentPhaseSchema
  );
  const acceptanceState = await readParsedFile(
    getStatePath(projectRoot, STATE_FILES.acceptanceState),
    acceptanceStateSchema
  );
  const activeWork = await readParsedFile(
    getStatePath(projectRoot, STATE_FILES.activeWork),
    activeWorkSchema
  );
  const projectStatus = await readOptionalParsedFile(
    getStatePath(projectRoot, STATE_FILES.projectStatus),
    projectStatusSchema,
    deriveFallbackProjectStatus({
      projectLabel: deriveProjectLabel(projectRoot),
      projectBrief,
      currentPhase,
      acceptanceState
    })
  );
  const projectRoadmap = await readOptionalParsedFile(
    getStatePath(projectRoot, STATE_FILES.projectRoadmap),
    projectRoadmapSchema,
    deriveFallbackProjectRoadmap({
      projectLabel: deriveProjectLabel(projectRoot),
      projectBrief,
      projectStatus,
      currentPhase,
      acceptanceState
    })
  );
  const normalizedProjectRoadmap = alignProjectRoadmapToStatus(
    projectRoadmap,
    projectStatus
  );

  return projectStateSchema.parse({
    projectBrief,
    projectStatus,
    projectRoadmap: normalizedProjectRoadmap,
    currentPhase,
    acceptanceState,
    activeWork,
    preferences: createPreferences(
      projectPreferences.continuationBehavior,
      globalPreferences.continuationBehavior
    )
  });
}

export async function writeCurrentContextPacket(
  projectRoot: string,
  packet: ContextPacket
) {
  await ensureStateDir(projectRoot);
  const parsedPacket = contextPacketSchema.parse(packet);
  await writeFile(
    getContextFilePath(projectRoot, CONTEXT_FILES.currentPacket),
    formatStateFileContents(parsedPacket),
    "utf8"
  );
  return parsedPacket;
}

export async function readCurrentContextPacket(projectRoot: string) {
  return readParsedFile(
    getContextFilePath(projectRoot, CONTEXT_FILES.currentPacket),
    contextPacketSchema
  );
}

export async function persistContinuationPreference(
  projectRoot: string,
  scope: PreferenceScope,
  continuationBehavior: ContinuationBehavior,
  options: LoadProjectStateOptions = {}
) {
  const targetPath =
    scope === "project"
      ? getStatePath(projectRoot, STATE_FILES.preferences)
      : getGlobalPreferencesPath(options.globalPreferencesPath);

  if (scope === "project") {
    await ensureStateDir(projectRoot);
  } else {
    await mkdir(dirname(targetPath), { recursive: true });
  }

  const nextValue = storedPreferencesSchema.parse({
    continuationBehavior
  });

  await writeFile(targetPath, `${JSON.stringify(nextValue, null, 2)}\n`, "utf8");
}

export async function writeStateFragment(
  projectRoot: string,
  fileName: (typeof STATE_FILES)[
    | "projectBrief"
    | "projectStatus"
    | "projectRoadmap"
    | "currentPhase"
    | "acceptanceState"
    | "activeWork"
    | "projectSupervision"
    | "preferences"
    | "commandBridge"]
  ,
  value: unknown
) {
  await ensureStateDir(projectRoot);
  await writeFile(
    getStatePath(projectRoot, fileName),
    formatStateFileContents(value),
    "utf8"
  );
}
