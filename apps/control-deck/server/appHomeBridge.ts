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
        "在 v0.2.0 里引入 multi-provider 自动执行"
      ],
      keyConstraints: [
        "保持 web + launcher 为稳定基座",
        "主要开发对话继续留在外部 conductor surface",
        "v0.2.0 只发布 Context OS 能力，不扩大到桌面壳"
      ],
      successFrame:
        "用户打开 Threadsmith 前门后，能清楚知道这里是入口页，并能立刻进入真实项目查看实时 truth",
      priorityOrder: [
        "对齐版本表述",
        "解释 Context Packet 和 truth 来源",
        "让 sync-context 与 recovery 边界更清楚",
        "补齐 v0.2.0 release notes"
      ],
      openStrategicQuestions: [
        "什么时候正式开启 desktop shell / macOS wrapper v1",
        "何时重启 multi-provider 自动执行路线"
      ]
    },
    projectStatus: {
      projectLabel: "Threadsmith",
      currentTrack: "v0.2.0 Context OS release hardening",
      overallState: "in-progress",
      currentFocus: "对齐 Context Packet、truth sync、context recovery 和 release docs 的公开发布面",
      projectStatusSummary:
        "这个来源不是某个真实项目的开发页，而是 Threadsmith 的产品前门。v0.2.0 的重点是让用户理解 Context Packet 从 committed truth 来、sync-context 何时刷新 packet、以及何时回到 Codex/CLI 继续对话。",
      latestAcceptedSlice: {
        title: "v0.1.1 public release",
        recordedAt: calibratedAt
      },
      nextPlannedSlice: {
        title: "v0.2.0 Context OS release hardening",
        recordedAt: null
      },
      currentMilestoneId: "version-surface",
      nextMilestoneId: "v0-2-0-release",
      topRisks: [
        "版本与文档表述不一致会让公开仓库显得不稳。",
        "如果不知道 Context Packet 与 committed truth 的边界，会误以为页面会读取聊天里的临时想法。",
        "v0.2.0 仍需避免把 provider routing 误读成 multi-provider 已完成。"
      ],
      updatedAt: calibratedAt
    },
    projectRoadmap: {
      versionLabel: "Threadsmith v0.2.0",
      finalGoal:
        "让 Threadsmith v0.2.0 成为一个 Context OS 清楚、packet 可恢复、文档可发布的 public web release。",
      milestones: [
        {
          id: "v0-1-1-release",
          label: "v0.1.1",
          title: "发布 onboarding polish 版本",
          summary: "public repo、README、release note、CI 与首次上手路径已公开。",
          state: "done"
        },
        {
          id: "version-surface",
          label: "版本对齐",
          title: "对齐公开版本与 README",
          summary: "README、usage guide、release docs 和 package version 需要一致。",
          state: "current"
        },
        {
          id: "context-os-surface",
          label: "Context OS",
          title: "打磨 Context Packet、recovery 与 truth 来源",
          summary: "让用户知道 packet 从哪里来、何时刷新、何时回到 conductor。",
          state: "next"
        },
        {
          id: "docs-skill",
          label: "release docs",
          title: "补齐 v0.2.0 release notes 与 checklist",
          summary: "讲清 Context OS 已交付能力与 deferred non-goals。",
          state: "later"
        },
        {
          id: "v0-2-0-release",
          label: "v0.2.0",
          title: "发布 Context OS 版本",
          summary: "创建 tag、GitHub Release 和公开发布说明。",
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
      phaseName: "v0.2.0 Context OS release hardening",
      phaseGoal: "把 Threadsmith 的公开发布面打磨到版本表述一致、Context OS 能力清楚、验证路径可信",
      deliverable: "v0.2.0 Context OS release hardening PR",
      inScope: [
        "README / usage guide / release note 版本表述对齐",
        "Context Packet / sync-context / truth source 说明",
        "release checklist 与验证命令对齐",
        "Threadsmith skill 和 conductor 边界保持清楚",
        "v0.2.0 release surface"
      ],
      outOfScope: [
        "multi-provider 自动执行",
        "native desktop shell",
        "替代 Codex Desktop / Codex CLI 的主聊天入口"
      ],
      stopCondition: "公开文档能清楚解释 v0.2.0 Context OS，验证命令通过，并且不承诺 multi-provider 或桌面壳。",
      verificationForThisPhase: [
        "npm run test",
        "npm run build",
        "npm run test:e2e",
        "npm run verify:launchers",
        "npm run smoke:self-host",
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
      currentClaim: "Threadsmith v0.2.0 正在打磨 Context OS 发布面；当前前门仍只是入口快照，真实进度以进入项目后的 `.threadsmith` 为准。",
      doneWhenChecklist: [
        {
          id: "ci-green",
          label: "release verification 和 GitHub Actions CI 变绿",
          status: "unknown"
        },
        {
          id: "first-run",
          label: "公开说明清楚解释 .threadsmith、Context Packet 与 conductor 边界",
          status: "unknown"
        },
        {
          id: "refresh-truth",
          label: "sync-context、刷新状态和 truth 来源边界清楚",
          status: "unknown"
        },
        {
          id: "demo-mode",
          label: "前门和 demo mode 不会伪装成真实项目进度",
          status: "unknown"
        },
        {
          id: "release-surface",
          label: "README、usage guide、release note 和 share 文案对齐 v0.2.0",
          status: "unknown"
        }
      ],
      implementationStatus: "implementing",
      reviewStatus: "not-started",
      verificationStatus: "not-started",
      closeoutStatus: "not-started",
      knownGaps: [
        "multi-provider automatic execution 仍不属于 v0.2.0 交付范围。",
        "desktop shell 仍在后续 backlog，不作为当前发布 blocker。"
      ],
      finalState: "not-ready"
    },
    activeWork: {
      items: [
        {
          role: "planner",
          status: "done",
          taskSummary: "定义 v0.2.0 Context OS release hardening 的发布修复范围",
          requiresUserDecision: false
        },
        {
          role: "executor",
          status: "running",
          taskSummary: "对齐版本、release docs、Context OS 说明和验证路径",
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
          taskSummary: "等待 v0.2.0 PR closeout 与 release notes",
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
      "当前是 Threadsmith 前门，不直接承载某个真实项目的编码执行；v0.2.0 正在对齐 Context OS 发布面。",
    lines: [
      {
        id: "planner",
        role: "planner",
        threadLabel: "Release Planner",
        provider: providerRouting.planner,
        presence: "logical",
        status: "done",
        taskSummary: "v0.2.0 聚焦 Context Packet、recovery、docs、checklist 与 release surface。",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "scope accepted by user",
        updatedAt: calibratedAt
      },
      {
        id: "executor",
        role: "executor",
        threadLabel: "Release Surface",
        provider: providerRouting.executor,
        presence: "logical",
        status: "running",
        taskSummary: "正在把 Context OS 发布面做成可发布的 v0.2.0 版本。",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "Context OS release surface in progress",
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
