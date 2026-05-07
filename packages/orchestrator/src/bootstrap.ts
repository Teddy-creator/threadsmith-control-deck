import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type {
  AcceptanceState,
  ActiveWork,
  CurrentPhase,
  ProjectBrief,
  ProjectState,
  ProjectStatus
} from "@threadsmith/domain";
import {
  deriveFallbackProjectStatus,
  projectBriefSchema,
  currentPhaseSchema,
  acceptanceStateSchema,
  activeWorkSchema,
  projectStatusSchema
} from "@threadsmith/domain";
import { initializeProjectState, loadProjectState } from "@threadsmith/fs-bridge";

type BootstrapKind = "existing" | "bootstrapped" | "paused";

interface PackageSignals {
  name: string | null;
  description: string | null;
  testCommands: string[];
  buildCommands: string[];
}

interface RepositorySignals {
  projectLabel: string;
  summary: string | null;
  sourceDirs: string[];
  docsHints: string[];
  testCommands: string[];
  buildCommands: string[];
  missingInfo: string[];
  shouldPause: boolean;
}

export interface BootstrapProjectStateResult {
  kind: BootstrapKind;
  state: ProjectState;
  summary: string;
  missingInfo: string[];
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

async function readTextIfExists(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function extractReadmeInfo(readme: string | null) {
  if (!readme) {
    return { title: null, summary: null };
  }

  const lines = readme.split("\n").map((line) => line.trim());
  const title =
    lines.find((line) => line.startsWith("# "))?.replace(/^# /, "").trim() ?? null;

  const paragraph = compact(
    lines
      .filter(
        (line) =>
          line.length > 0 &&
          !line.startsWith("#") &&
          !line.startsWith("- ") &&
          !line.startsWith("```")
      )
      .slice(0, 2)
      .join(" ")
  );

  return {
    title,
    summary: paragraph.length > 0 ? paragraph : null
  };
}

async function inspectPackageSignals(projectRoot: string): Promise<PackageSignals> {
  const packageJson = await readTextIfExists(join(projectRoot, "package.json"));

  if (!packageJson) {
    return {
      name: null,
      description: null,
      testCommands: [],
      buildCommands: []
    };
  }

  try {
    const parsed = JSON.parse(packageJson) as {
      name?: string;
      description?: string;
      scripts?: Record<string, string>;
    };

    return {
      name: parsed.name?.trim() || null,
      description: parsed.description?.trim() || null,
      testCommands: parsed.scripts?.test ? ["npm test"] : [],
      buildCommands: parsed.scripts?.build ? ["npm run build"] : []
    };
  } catch {
    return {
      name: null,
      description: null,
      testCommands: [],
      buildCommands: []
    };
  }
}

async function inspectRepository(projectRoot: string): Promise<RepositorySignals> {
  const [entries, readme, packageSignals] = await Promise.all([
    readdir(projectRoot, { withFileTypes: true }),
    readTextIfExists(join(projectRoot, "README.md")),
    inspectPackageSignals(projectRoot)
  ]);
  const { title, summary: readmeSummary } = extractReadmeInfo(readme);
  const sourceDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) =>
      ["src", "app", "apps", "packages", "lib", "server", "client", "tests", "test"].includes(name)
    );
  const docsHints = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => ["docs", "specs"].includes(name));
  const projectLabel =
    title ??
    packageSignals.name?.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) ??
    basename(projectRoot.replace(/[\\/]+$/, ""));
  const summary = readmeSummary ?? packageSignals.description ?? null;
  const testCommands = [...new Set(packageSignals.testCommands)];
  const buildCommands = [...new Set(packageSignals.buildCommands)];
  const missingInfo: string[] = [];

  if (!summary) {
    missingInfo.push("仓库里还没有可识别的 README 摘要或 manifest description。");
  }

  if (sourceDirs.length === 0) {
    missingInfo.push("仓库里还没有可识别的源码目录（如 src、app、packages）。");
  }

  if (testCommands.length === 0 && buildCommands.length === 0) {
    missingInfo.push("仓库里还没有可识别的 test/build 命令。");
  }

  return {
    projectLabel,
    summary,
    sourceDirs,
    docsHints,
    testCommands,
    buildCommands,
    missingInfo,
    shouldPause: !summary && sourceDirs.length === 0 && testCommands.length === 0
  };
}

function buildBootstrapBrief(signals: RepositorySignals): ProjectBrief {
  const repoShape =
    signals.sourceDirs.length > 0
      ? `主要目录：${signals.sourceDirs.join(" / ")}`
      : "当前还没有识别到主要源码目录";
  const commands = [...signals.testCommands, ...signals.buildCommands];

  return projectBriefSchema.parse({
    projectGoal:
      signals.summary
        ? `推进 ${signals.projectLabel}：${signals.summary}`
        : `为 ${signals.projectLabel} 补齐足够的仓库信息，再进入第一条 autopilot slice。`,
    currentVersionScope:
      signals.summary
        ? `基于仓库现有信号起草第一条 autopilot slice。${repoShape}。`
        : `当前先停在 bootstrap 澄清阶段。${repoShape}。`,
    nonGoals: [
      "在 bootstrap 阶段自动重写整个仓库",
      "在范围不清晰时直接开始大改",
      "假装仓库信号已经足够"
    ],
    keyConstraints: [
      "bootstrap 只写入最小 Threadsmith truth，不替代后续 task brief",
      commands.length > 0
        ? `优先沿用已识别命令：${commands.join(" / ")}`
        : "当前还没有稳定的 test/build 命令可依赖",
      signals.docsHints.length > 0
        ? `已有文档目录：${signals.docsHints.join(" / ")}`
        : "仓库文档信号较弱，必要时要诚实暂停"
    ],
    successFrame: signals.shouldPause
      ? "Threadsmith 能把 bootstrap 缺口说清楚，而不是伪造一条可执行 phase。"
      : "Threadsmith 已能根据仓库现状起草第一条可自动推进的 phase，并把下一步交给 planner。",
    priorityOrder: [
      "识别仓库当前主线",
      "补齐最小 Threadsmith truth",
      signals.shouldPause ? "记录缺口并等待补充信息" : "把下一步收紧成第一条 autopilot slice"
    ],
    openStrategicQuestions: signals.shouldPause
      ? ["这个项目当前最重要的目标是什么，是否有 README 或任务说明可以作为 bootstrap 输入"]
      : []
  });
}

function buildBootstrapPhase(signals: RepositorySignals): CurrentPhase {
  const verificationForThisPhase = [
    ...signals.testCommands,
    ...signals.buildCommands,
    "项目可以从 deck 正常加载"
  ];

  if (signals.shouldPause) {
    return currentPhaseSchema.parse({
      phaseName: "补齐 bootstrap 缺口",
      phaseGoal: `为 ${signals.projectLabel} 补齐足够的仓库信号，再定义第一条 autopilot slice。`,
      deliverable: "一份可以继续推进的最小项目上下文",
      inScope: [
        "补充项目目标说明",
        "补充 README / manifest / 主要代码目录信号",
        "说明第一条想推进的窄目标"
      ],
      outOfScope: [
        "在缺少目标说明时直接启动 automatic chain",
        "假设不存在的验证命令"
      ],
      stopCondition: "项目目标、主要目录和至少一条验证路径足够清晰，可以安全起草第一条 slice。",
      verificationForThisPhase: verificationForThisPhase.length > 0
        ? verificationForThisPhase
        : ["项目可以从 deck 正常加载"],
      activeOwners: ["planner"],
      blockedBy: signals.missingInfo
    });
  }

  return currentPhaseSchema.parse({
    phaseName: `为 ${signals.projectLabel} 收紧第一条 autopilot slice`,
    phaseGoal: `根据仓库当前信号，为 ${signals.projectLabel} 收紧第一条可以安全推进的 autopilot slice。`,
    deliverable: "一份基于仓库现状的首条 slice draft",
    inScope: [
      signals.summary ?? "提炼当前仓库主线",
      signals.sourceDirs.length > 0
        ? `确认主要代码区域：${signals.sourceDirs.join(" / ")}`
        : "确认主要代码区域",
      "把下一步约束成一条窄 slice"
    ],
    outOfScope: [
      "在 bootstrap 阶段就开始跨模块大改",
      "把后续 review / verification 提前混入当前阶段"
    ],
    stopCondition: "planner 已能基于当前相对可信的仓库信号生成第一条 slice，并把 automatic chain 安全启动。",
    verificationForThisPhase: verificationForThisPhase.length > 0
      ? verificationForThisPhase
      : ["项目可以从 deck 正常加载"],
    activeOwners: ["planner"],
    blockedBy: []
  });
}

function buildBootstrapAcceptance(
  signals: RepositorySignals,
  paused: boolean
): AcceptanceState {
  return acceptanceStateSchema.parse({
    currentClaim: paused
      ? "Bootstrap 已建立最小 Threadsmith truth，但当前仓库信号不足，必须先补充信息后再进入 automatic chain。"
      : "Bootstrap 已根据仓库信号起草最小 Threadsmith truth，planner 可以继续收紧第一条 autopilot slice。",
    doneWhenChecklist: [
      {
        id: "bootstrap-state-written",
        label: "Threadsmith 最小状态文件已写入",
        status: "pass"
      },
      {
        id: "repo-signals-captured",
        label: paused
          ? "已明确记录当前缺失的仓库信号"
          : "已捕获项目目标、主要目录与至少一条验证路径",
        status: "pass"
      },
      {
        id: "next-step-honest",
        label: paused
          ? "下一步被诚实地标记为需要用户补充信息"
          : "下一步已经收紧到 planner 的首条 autopilot slice",
        status: "pass"
      }
    ],
    implementationStatus: "not-started",
    reviewStatus: "not-started",
    verificationStatus: "not-started",
    closeoutStatus: "not-started",
    knownGaps: paused ? signals.missingInfo : [],
    finalState: "not-ready"
  });
}

function buildBootstrapActiveWork(
  signals: RepositorySignals,
  paused: boolean
): ActiveWork {
  return activeWorkSchema.parse({
    items: [
      {
        role: "planner",
        status: paused ? "blocked" : "running",
        taskSummary: paused
          ? `bootstrap 暂停：请先为 ${signals.projectLabel} 补充项目目标、主要代码入口或验证命令，补完后再继续 autopilot。`
          : `基于 README、manifest 与目录信号，为 ${signals.projectLabel} 起草第一条 autopilot slice。`,
        requiresUserDecision: paused
      }
    ],
    blockerSummary: paused
      ? `bootstrap 信息不足：${signals.missingInfo[0] ?? "请补充当前项目目标。"}`
      : null
  });
}

function buildBootstrapStatus(
  projectLabel: string,
  projectBrief: ProjectBrief,
  currentPhase: CurrentPhase,
  acceptanceState: AcceptanceState,
  paused: boolean
): ProjectStatus {
  const derived = deriveFallbackProjectStatus({
    projectLabel,
    projectBrief,
    currentPhase,
    acceptanceState
  });

  return projectStatusSchema.parse({
    ...derived,
    projectLabel,
    currentTrack: paused ? "bootstrap clarification" : "bootstrap first slice",
    currentFocus: paused
      ? `先补齐 ${projectLabel} 的 bootstrap 缺口`
      : `为 ${projectLabel} 收紧第一条 autopilot slice`,
    projectStatusSummary: paused
      ? `${projectLabel} 已接入 Threadsmith，但仓库信号还不足以安全启动 automatic chain；当前先明确记录缺口并等待补充，补完后再回到 autopilot 主线。`
      : `${projectLabel} 已根据仓库信号写入最小 Threadsmith truth，下一步由 planner 收紧第一条 autopilot slice。`,
    nextPlannedSlice: {
      title: paused ? "补齐 bootstrap 缺口" : `为 ${projectLabel} 起草第一条 autopilot slice`,
      recordedAt: null
    },
    updatedAt: null
  });
}

function summarizeBootstrapResult(
  kind: BootstrapKind,
  signals: RepositorySignals
) {
  switch (kind) {
    case "existing":
      return "当前项目已经有可用的 Threadsmith truth，bootstrap 未改写任何内容。";
    case "paused":
      return `已为 ${signals.projectLabel} 写入最小 truth，但 bootstrap 诚实暂停：${signals.missingInfo[0] ?? "需要更多项目信息。"}`;
    default:
      return `已根据仓库信号为 ${signals.projectLabel} 写入最小 Threadsmith truth，可以继续进入 autopilot。`;
  }
}

export async function bootstrapProjectState(
  projectRoot: string
): Promise<BootstrapProjectStateResult> {
  try {
    const state = await loadProjectState(projectRoot);
    return {
      kind: "existing",
      state,
      summary: summarizeBootstrapResult("existing", {
        projectLabel: state.projectStatus.projectLabel,
        summary: null,
        sourceDirs: [],
        docsHints: [],
        testCommands: [],
        buildCommands: [],
        missingInfo: [],
        shouldPause: false
      }),
      missingInfo: []
    };
  } catch {
    const signals = await inspectRepository(projectRoot);
    const projectBrief = buildBootstrapBrief(signals);
    const currentPhase = buildBootstrapPhase(signals);
    const acceptanceState = buildBootstrapAcceptance(signals, signals.shouldPause);
    const activeWork = buildBootstrapActiveWork(signals, signals.shouldPause);
    const projectStatus = buildBootstrapStatus(
      signals.projectLabel,
      projectBrief,
      currentPhase,
      acceptanceState,
      signals.shouldPause
    );

    const state = await initializeProjectState(projectRoot, {
      seed: {
        projectBrief,
        currentPhase,
        acceptanceState,
        activeWork,
        projectStatus
      },
      overwriteCoreState: true
    });
    const kind: BootstrapKind = signals.shouldPause ? "paused" : "bootstrapped";

    return {
      kind,
      state,
      summary: summarizeBootstrapResult(kind, signals),
      missingInfo: signals.missingInfo
    };
  }
}
