import {
  commandBridgeStateSchema,
  createPreferences,
  projectStateSchema,
  projectSupervisionStateSchema,
  type ProviderRouting
} from "@threadsmith/domain";
import { APP_HOME_PROJECT_ROOT } from "../src/features/deck/appHomeSource";

export function createAppHomeBridgeResponse(providerRouting: ProviderRouting) {
  const calibratedAt = "2026-05-09T11:20:00.000Z";
  const state = projectStateSchema.parse({
    projectBrief: {
      projectGoal: "打开 Threadsmith 并进入今天的工作",
      currentVersionScope:
        "Threadsmith 前门只负责选择今天要进入的真实项目；实时进度以进入后的项目 `.threadsmith` 为准",
      nonGoals: [
        "替代主聊天面",
        "把现有 web control deck 重写成桌面应用",
        "在 v0.1.1 发布修复里引入 multi-provider 自动执行"
      ],
      keyConstraints: [
        "保持 web + launcher 为稳定基座",
        "主要开发对话继续留在外部 conductor surface",
        "v0.1.1 只打磨公开上手路径，不扩大到桌面壳"
      ],
      successFrame:
        "用户打开 Threadsmith 前门后，能清楚知道这里是入口页，并能立刻进入真实项目查看实时 truth",
      priorityOrder: [
        "修复 CI 绿灯",
        "解释 first-run 和 demo mode",
        "让刷新状态与 truth 来源更清楚",
        "补齐 v0.1.1 发布说明"
      ],
      openStrategicQuestions: [
        "什么时候正式开启 desktop shell / macOS wrapper v1",
        "何时重启 multi-provider 自动执行路线"
      ]
    },
    projectStatus: {
      projectLabel: "Threadsmith",
      currentTrack: "v0.1.1 onboarding polish",
      overallState: "in-progress",
      currentFocus: "先修复 GitHub Actions 红灯，再让首次使用、demo mode、刷新状态和 skill/docs 说明更清楚",
      projectStatusSummary:
        "这个来源不是某个真实项目的开发页，而是 Threadsmith 的产品前门。v0.1.1 的重点是让新用户知道怎么连接真实项目、demo mode 是什么、刷新状态读了哪些 truth，以及何时回到 Codex/CLI 继续对话。",
      latestAcceptedSlice: {
        title: "v0.1.0 public release",
        recordedAt: calibratedAt
      },
      nextPlannedSlice: {
        title: "v0.1.1 onboarding polish",
        recordedAt: null
      },
      currentMilestoneId: "onboarding-polish",
      nextMilestoneId: "v0-1-1-release",
      topRisks: [
        "GitHub Actions 红灯会让公开仓库显得不稳。",
        "首次使用时如果不知道 .threadsmith 和 conductor 边界，会误以为页面是聊天入口。",
        "demo 与真实项目的区别需要在产品内更清楚。"
      ],
      updatedAt: calibratedAt
    },
    projectRoadmap: {
      versionLabel: "Threadsmith v0.1.1",
      finalGoal:
        "让 Threadsmith v0.1.1 成为一个 CI 绿灯、首次上手清楚、demo 可解释、文档可发布的 public web release。",
      milestones: [
        {
          id: "v0-1-0-release",
          label: "v0.1.0",
          title: "发布初始公开版本",
          summary: "public repo、README、release note 和基础 web control deck 已公开。",
          state: "done"
        },
        {
          id: "ci-health",
          label: "CI 绿灯",
          title: "修复 GitHub Actions 线上验证",
          summary: "Ubuntu runner 需要安装 zsh，避免 launcher verification 红灯。",
          state: "current"
        },
        {
          id: "onboarding-polish",
          label: "上手打磨",
          title: "打磨 first-run、demo mode、刷新状态与 truth 来源",
          summary: "让用户第一次打开时知道该连接什么、看什么、回到哪里继续。",
          state: "next"
        },
        {
          id: "docs-skill",
          label: "文档说明",
          title: "补齐 Threadsmith skill 与 conductor 边界说明",
          summary: "讲清什么时候调用 skill，什么时候只正常和 Codex/CLI 对话。",
          state: "later"
        },
        {
          id: "v0-1-1-release",
          label: "v0.1.1",
          title: "发布 onboarding polish 修复版本",
          summary: "更新 release note、README 顶部和 share/demo 材料。",
          state: "later"
        },
        {
          id: "desktop-shell",
          label: "桌面壳",
          title: "评估并落地一个很薄的 macOS wrapper",
          summary: "先做独立窗口与稳定启动，不提前跳进签名、更新和重度原生能力。",
          state: "later"
        }
      ],
      updatedAt: calibratedAt
    },
    currentPhase: {
      phaseName: "v0.1.1 onboarding polish",
      phaseGoal: "把 Threadsmith 的公开上手体验打磨到 CI 绿、first-run 清楚、demo 可理解、刷新状态可信",
      deliverable: "v0.1.1 onboarding polish PR",
      inScope: [
        "CI zsh launcher verification 修复",
        "first-run / demo mode / truth source 说明",
        "状态刷新与最近读取时间可理解",
        "Threadsmith skill 和 conductor 边界文档",
        "v0.1.1 release surface"
      ],
      outOfScope: [
        "multi-provider 自动执行",
        "native desktop shell",
        "替代 Codex Desktop / Codex CLI 的主聊天入口"
      ],
      stopCondition: "GitHub Actions 变绿，新用户能跑起来、看懂 demo、连接真实项目，并知道何时回到 conductor。",
      verificationForThisPhase: [
        "npm run test",
        "npm run build",
        "npm run verify:launchers",
        "CI run on PR"
      ],
      activeOwners: [
        "planner",
        "executor",
        "reviewer",
        "verifier",
        "closeout"
      ],
      blockedBy: []
    },
    acceptanceState: {
      currentClaim: "Threadsmith v0.1.1 正在打磨公开上手路径；当前前门仍只是入口快照，真实进度以进入项目后的 `.threadsmith` 为准。",
      doneWhenChecklist: [
        {
          id: "ci-green",
          label: "GitHub Actions 线上 CI 变绿",
          status: "unknown"
        },
        {
          id: "first-run",
          label: "首次使用说明清楚解释项目连接、.threadsmith 与 conductor 边界",
          status: "unknown"
        },
        {
          id: "refresh-truth",
          label: "刷新状态、上次读取时间和当前信息来源可见",
          status: "unknown"
        },
        {
          id: "demo-mode",
          label: "内置 demo mode 能帮助新用户理解首页五块与工作台",
          status: "unknown"
        },
        {
          id: "release-surface",
          label: "README、usage guide、release note 和 share 文案对齐 v0.1.1",
          status: "unknown"
        }
      ],
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      knownGaps: [
        "multi-provider automatic execution 仍不属于 v0.1.1 交付范围。",
        "desktop shell 仍在后续 backlog，不作为当前发布 blocker。"
      ],
      finalState: "not-ready"
    },
    activeWork: {
      items: [
        {
          role: "planner",
          status: "done",
          taskSummary: "定义 v0.1.1 onboarding polish 的发布修复范围",
          requiresUserDecision: false
        },
        {
          role: "executor",
          status: "running",
          taskSummary: "修复 CI 并打磨 first-run、demo mode、refresh 和 docs",
          requiresUserDecision: false
        },
        {
          role: "reviewer",
          status: "waiting",
          taskSummary: "等待实现完成后检查公开发布 claims 是否准确",
          requiresUserDecision: false
        },
        {
          role: "verifier",
          status: "waiting",
          taskSummary: "等待本地验证与 GitHub Actions 回流",
          requiresUserDecision: false
        },
        {
          role: "closeout",
          status: "waiting",
          taskSummary: "等待 v0.1.1 PR closeout 与 release notes",
          requiresUserDecision: false
        }
      ],
      blockerSummary: null
    },
    preferences: createPreferences()
  });

  const projectSupervision = projectSupervisionStateSchema.parse({
    mode: "multi-thread",
    modeLabel: "发布打磨",
    summary:
      "当前是 Threadsmith 前门，不直接承载某个真实项目的编码执行；v0.1.1 正在修复 CI 与首次上手路径。",
    lines: [
      {
        id: "planner",
        role: "planner",
        threadLabel: "Release Planner",
        provider: providerRouting.planner,
        presence: "logical",
        status: "done",
        taskSummary: "v0.1.1 聚焦 CI、first-run、refresh、demo、docs 与 release surface。",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "scope accepted by user",
        updatedAt: calibratedAt
      },
      {
        id: "executor",
        role: "executor",
        threadLabel: "Onboarding Polish",
        provider: providerRouting.executor,
        presence: "logical",
        status: "running",
        taskSummary: "正在把公开上手路径做成可发布的 v0.1.1 修复版。",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "CI zsh fix + UI copy pass in progress",
        updatedAt: calibratedAt
      }
    ],
    updatedAt: calibratedAt
  });

  return {
    projectRoot: APP_HOME_PROJECT_ROOT,
    state,
    providerRouting,
    projectSupervision,
    recentEvents: [],
    latestRun: null,
    latestPhaseRun: null,
    latestPhasePause: null,
    commandBridgeState: commandBridgeStateSchema.parse({
      latestRoute: null,
      latestRun: null,
      updatedAt: null
    }),
    actionHistoryLength: 0
  };
}
