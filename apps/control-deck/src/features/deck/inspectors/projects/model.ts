import type { SupervisorState } from "@threadsmith/runtime";
import { formatVerificationEvidenceStatus } from "../../../display/labels";
import { buildProjectIdentity } from "../../../display/projectIdentity";
import type { ProjectLoadFailureKind } from "../../projectConnection";
import type { ProjectSourceId } from "../../projectRoots";
import type { RecentProjectEntry } from "../../recentProjects";
import { compactText, pickAcceptanceTone } from "../shared";
import type {
  ProjectsEntryMode,
  RecentProjectCard,
  StartupGuide
} from "./types";

interface BuildProjectsInspectorViewModelArgs {
  currentSourceIsAppHome: boolean;
  currentSourceIsCustomProject: boolean;
  currentProjectSourceId: ProjectSourceId;
  currentProjectSourceLabel: string;
  currentProjectIdentityName: string;
  dailyEntryProjectRoot: string | null;
  dailyEntryProjectIdentityName: string | null;
  effectiveEntryMode: ProjectsEntryMode;
  customProjectErrorKind: ProjectLoadFailureKind | null;
  hasProjectConnectionIssue: boolean;
  normalizedCustomProjectDraft: string;
  projectRoot: string;
  isDailyEntryCurrent: boolean;
  supervisorState: SupervisorState | null;
  primaryRecentProject: RecentProjectEntry | null;
  onConnectCustomProject: (projectRoot: string) => void;
  recentProjects: RecentProjectEntry[];
}

export interface ProjectsInspectorViewModel {
  freshnessText: string;
  startupGuide: StartupGuide;
  recentProjectCards: RecentProjectCard[];
  supervisorSummary: string | null;
  currentPhaseLabel: string | null;
  verificationTone: string | null;
  verificationStatusLabel: string | null;
}

function formatStartupCommand(
  projectRoot: string | null | undefined,
  sourceId?: ProjectSourceId
) {
  if (sourceId === "app-home") {
    return "./Open-Threadsmith-App.command";
  }

  if (!projectRoot) {
    return './Launch-Threadsmith.command "/path/to/your-project"';
  }

  return `./Launch-Threadsmith.command ${JSON.stringify(projectRoot)}`;
}

const committedTruthFiles = [
  ".threadsmith/project-brief.json",
  ".threadsmith/current-phase.json",
  ".threadsmith/acceptance-state.json"
];

function buildSourceFiles(sourceId: ProjectSourceId, hasSupervisorState: boolean) {
  if (sourceId === "app-home") {
    return [
      "Threadsmith 前门快照",
      "浏览器本地默认项目 / 最近项目",
      "进入真实项目后才读取 .threadsmith"
    ];
  }

  if (sourceId === "fresh-demo" || sourceId === "stale-packet-demo") {
    return [
      "examples/project-state/.threadsmith",
      ...committedTruthFiles
    ];
  }

  if (!hasSupervisorState) {
    return [
      "等待项目连接",
      ".threadsmith/project-brief.json",
      ".threadsmith/current-phase.json"
    ];
  }

  return [
    ".threadsmith/project-brief.json",
    ".threadsmith/current-phase.json",
    ".threadsmith/acceptance-state.json",
    ".threadsmith/events.ndjson"
  ];
}

function buildStartupGuide(args: BuildProjectsInspectorViewModelArgs): StartupGuide {
  const {
    currentSourceIsAppHome,
    currentSourceIsCustomProject,
    currentProjectSourceId,
    currentProjectSourceLabel,
    currentProjectIdentityName,
    dailyEntryProjectRoot,
    dailyEntryProjectIdentityName,
    effectiveEntryMode,
    customProjectErrorKind,
    hasProjectConnectionIssue,
    normalizedCustomProjectDraft,
    projectRoot,
    isDailyEntryCurrent,
    supervisorState,
    primaryRecentProject,
    onConnectCustomProject
  } = args;

  const boundaryText =
    "Threadsmith 负责监督与配置；主要开发对话继续在外部 conductor surface。";
  const primaryRecentProjectIdentityName = primaryRecentProject
    ? buildProjectIdentity(primaryRecentProject.projectRoot, primaryRecentProject.projectRoot).name
    : null;
  const recoveryRecentProject =
    currentSourceIsCustomProject &&
    primaryRecentProject &&
    primaryRecentProject.projectRoot === normalizedCustomProjectDraft
      ? null
      : primaryRecentProject;
  const recoveryRecentProjectIdentityName = recoveryRecentProject
    ? buildProjectIdentity(recoveryRecentProject.projectRoot, recoveryRecentProject.projectRoot).name
    : null;

  if (currentSourceIsAppHome) {
    const nextAction = dailyEntryProjectRoot
      ? {
          label: `打开默认项目 ${dailyEntryProjectIdentityName ?? dailyEntryProjectRoot}`,
          onClick: () => onConnectCustomProject(dailyEntryProjectRoot)
        }
      : primaryRecentProject
        ? {
            label: `继续最近项目 ${primaryRecentProjectIdentityName ?? primaryRecentProject.projectRoot}`,
            onClick: () => onConnectCustomProject(primaryRecentProject.projectRoot)
          }
        : null;

    return {
      tone: "blue",
      badgeLabel: effectiveEntryMode === "app-home" ? "默认前门" : "前门入口",
      title: "先从前门确认今天的进入路径",
      detail: dailyEntryProjectIdentityName
        ? `这里是 Threadsmith 前门，不是实时项目页。默认入口 ${dailyEntryProjectIdentityName} 已经准备好，进入后才会看到它的真实进度。`
        : primaryRecentProjectIdentityName
          ? `这里是 Threadsmith 前门，不是实时项目页。当前还没有默认入口，但可以先回到最近项目 ${primaryRecentProjectIdentityName}，或者连接一个新项目。`
          : "这里是 Threadsmith 前门，不是实时项目页。第一次使用时，先在下面连接真实项目；以后就可以从这里快速回到默认项目或最近项目。",
      nextStep: dailyEntryProjectIdentityName
        ? "如果今天继续主线，就直接打开默认项目；进入后再看该项目的 phase、验收和证据。"
        : "先决定今天要继续哪个真实项目；连接完成后，Threadsmith 会从项目 `.threadsmith` 读取实时状态。",
      command: formatStartupCommand(null, "app-home"),
      action: nextAction,
      boundaryText,
      sourceFiles: buildSourceFiles(currentProjectSourceId, Boolean(supervisorState))
    };
  }

  if (currentSourceIsCustomProject && supervisorState) {
    return {
      tone: "green",
      badgeLabel: isDailyEntryCurrent ? "当前默认项目" : "当前已连接",
      title: `当前正在查看 ${currentProjectIdentityName}`,
      detail:
        "这已经是你的真实项目控制台。接下来只需要在这里确认真相、路由和下一步，再回到 conductor 继续主要开发对话。",
      nextStep: isDailyEntryCurrent
        ? "以后没有显式覆盖时，Threadsmith 会优先回到这个项目。要换项目，可以直接用下面的最近项目，或者输入新的项目根目录。"
        : "如果要换项目，可以直接用下面的最近项目，或者输入新的项目根目录。",
      command: formatStartupCommand(projectRoot, currentProjectSourceId),
      action: null,
      boundaryText,
      sourceFiles: buildSourceFiles(currentProjectSourceId, Boolean(supervisorState))
    };
  }

  if (!currentSourceIsCustomProject && supervisorState) {
    return {
      tone: "purple",
      badgeLabel: "Demo mode",
      title:
        currentProjectSourceId === "stale-packet-demo"
          ? "这是一个交接点过期的学习示例"
          : "这是一个已收口项目的学习示例",
      detail:
        currentProjectSourceId === "stale-packet-demo"
          ? "这个 demo 用来展示：项目 truth 已经继续前进，但最新 handoff packet 落后了。它适合理解为什么 Threadsmith 要区分 fresh / stale。"
          : "这个 demo 用来展示：一个已完成验收和 closeout 的项目，在首页五块和四个工作台里分别会呈现什么。",
      nextStep:
        "先用 demo 看懂页面结构；准备真实开发时，再切到自定义项目并连接你的项目根目录。",
      command:
        currentProjectSourceId === "stale-packet-demo"
          ? "npm run start，然后打开 ?demoFixture=stale-packet"
          : "npm run start，然后打开默认 demo 或前门",
      action: null,
      boundaryText,
      sourceFiles: buildSourceFiles(currentProjectSourceId, true)
    };
  }

  if (currentSourceIsCustomProject && customProjectErrorKind === "missing-state") {
    return {
      tone: "amber",
      badgeLabel: "等待初始化",
      title: "这个目录还没接入 Threadsmith",
      detail: `${compactText(normalizedCustomProjectDraft || projectRoot, 72)} 还缺少最小 .threadsmith 状态，所以当前还不能作为正式项目打开。`,
      nextStep: "下一步：点击下方“初始化 Threadsmith”，为这个目录创建最小状态后再继续进入。",
      command: formatStartupCommand(
        normalizedCustomProjectDraft || projectRoot,
        currentProjectSourceId
      ),
      action: null,
      boundaryText,
      sourceFiles: buildSourceFiles(currentProjectSourceId, false)
    };
  }

  if (currentSourceIsCustomProject && hasProjectConnectionIssue) {
    return {
      tone: "red",
      badgeLabel: "等待修复",
      title: "这个项目暂时无法载入",
      detail:
        "当前目录里的 Threadsmith 状态还不能被正常读取。先修复状态文件，或者临时切回其他项目继续工作。",
      nextStep: recoveryRecentProjectIdentityName
        ? `如果只是先继续工作，推荐先回到最近项目 ${recoveryRecentProjectIdentityName}。`
        : "如果不是这个项目，先在下面输入新的项目根目录再连接。",
      command: formatStartupCommand(
        normalizedCustomProjectDraft || projectRoot,
        currentProjectSourceId
      ),
      action: recoveryRecentProject
        ? {
            label: `继续最近项目 ${recoveryRecentProjectIdentityName ?? recoveryRecentProject.projectRoot}`,
            onClick: () => onConnectCustomProject(recoveryRecentProject.projectRoot)
          }
        : null,
      boundaryText,
      sourceFiles: buildSourceFiles(currentProjectSourceId, false)
    };
  }

  if (dailyEntryProjectIdentityName && dailyEntryProjectRoot) {
    return {
      tone: "blue",
      badgeLabel: "默认进入",
      title: `优先回到默认项目 ${dailyEntryProjectIdentityName}`,
      detail: `当前打开的是 ${currentProjectSourceLabel}。如果你现在要回到平时主要开发的项目，最短路径是先打开这个默认入口。`,
      nextStep: "如果今天要处理别的项目，再在下面切换最近项目，或者输入新的项目根目录。",
      command: formatStartupCommand(dailyEntryProjectRoot),
      action: {
        label: `打开默认项目 ${dailyEntryProjectIdentityName}`,
        onClick: () => onConnectCustomProject(dailyEntryProjectRoot)
      },
      boundaryText,
      sourceFiles: buildSourceFiles(currentProjectSourceId, Boolean(supervisorState))
    };
  }

  if (!currentSourceIsCustomProject && primaryRecentProjectIdentityName && primaryRecentProject) {
    return {
      tone: "blue",
      badgeLabel: "推荐继续",
      title: `优先回到最近项目 ${primaryRecentProjectIdentityName}`,
      detail: `当前打开的是 ${currentProjectSourceLabel}。如果你现在要继续真实开发，最短路径是先回到最近一次工作的项目。`,
      nextStep: "如果不是这个项目，再在下面输入新的项目根目录或改连其他最近项目。",
      command: formatStartupCommand(primaryRecentProject.projectRoot),
      action: {
        label: `继续最近项目 ${primaryRecentProjectIdentityName}`,
        onClick: () => onConnectCustomProject(primaryRecentProject.projectRoot)
      },
      boundaryText,
      sourceFiles: buildSourceFiles(currentProjectSourceId, Boolean(supervisorState))
    };
  }

  return {
    tone: "blue",
    badgeLabel: "推荐开始",
    title: "先连接一个真实项目",
    detail: `当前打开的是 ${currentProjectSourceLabel}。如果你要正式使用 Threadsmith，请在下面输入项目根目录，然后连接或初始化。`,
    nextStep: "连接后，Threadsmith 会负责监督、证据和路由说明；主要开发对话仍然留在 conductor surface。",
    command: formatStartupCommand(null),
    action: null,
    boundaryText,
    sourceFiles: buildSourceFiles(currentProjectSourceId, Boolean(supervisorState))
  };
}

export function buildProjectsInspectorViewModel(
  args: BuildProjectsInspectorViewModelArgs
): ProjectsInspectorViewModel {
  return {
    freshnessText: args.supervisorState
      ? args.supervisorState.latestContinuationState.freshness === "fresh"
        ? "继续点最新"
        : args.supervisorState.latestContinuationState.freshness === "stale"
          ? "继续点已过时"
          : "缺少继续点"
      : "未连接",
    startupGuide: buildStartupGuide(args),
    recentProjectCards: args.recentProjects.map((entry) => {
      const identity = buildProjectIdentity(entry.projectRoot, entry.projectRoot);
      const isCurrent =
        args.currentSourceIsCustomProject &&
        args.projectRoot === entry.projectRoot &&
        args.currentProjectSourceId === "custom-project";

      return {
        entry,
        name: identity.name,
        isCurrent,
        isDefault: args.dailyEntryProjectRoot === entry.projectRoot
      };
    }),
    supervisorSummary: args.supervisorState
      ? compactText(
          args.supervisorState.projectState.projectStatus?.projectStatusSummary
            ?? args.supervisorState.projectState.projectBrief.projectGoal,
          104
        )
      : null,
    currentPhaseLabel: args.supervisorState?.projectState.currentPhase.phaseName ?? null,
    verificationTone: args.supervisorState
      ? pickAcceptanceTone(args.supervisorState.latestVerificationEvidence.status)
      : null,
    verificationStatusLabel: args.supervisorState
      ? formatVerificationEvidenceStatus(args.supervisorState.latestVerificationEvidence.status)
      : null
  };
}
