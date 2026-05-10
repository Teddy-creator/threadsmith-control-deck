import {
  commandBridgeStateSchema,
  createPreferences,
  projectStateSchema,
  projectSupervisionStateSchema,
  skillRoutingConfigSchema,
  type ProviderRouting,
  type SkillRoutingConfig
} from "@threadsmith/domain";
import { APP_HOME_PROJECT_ROOT } from "../src/features/deck/appHomeSource";

export function createAppHomeBridgeResponse(
  providerRouting: ProviderRouting,
  skillRouting: SkillRoutingConfig = skillRoutingConfigSchema.parse({})
) {
  const calibratedAt = "2026-05-09T18:39:39.000Z";
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
        "确认要进入的真实项目",
        "解释 Context Packet 和 committed truth 来源",
        "让 sync-context 与 recovery 边界更清楚",
        "等待最终人工发布决定"
      ],
      openStrategicQuestions: [
        "什么时候正式开启 desktop shell / macOS wrapper v1",
        "何时重启 multi-provider 自动执行路线"
      ]
    },
    projectStatus: {
      projectLabel: "Threadsmith",
      currentTrack: "v0.2.0 Context OS",
      overallState: "stable",
      currentFocus: "v0.2.0 release hardening 已本地验收，等待最终人工 review 与 GitHub Release 发布决定。",
      projectStatusSummary:
        "这个来源不是某个真实项目的开发页，而是 Threadsmith 的产品前门。当前 v0.2.0 Context OS 发布面已经完成本地验收；最终 tag、GitHub Release 和公开发布仍需要人工确认。",
      latestAcceptedSlice: {
        title: "v0.2.0 release hardening",
        recordedAt: calibratedAt
      },
      nextPlannedSlice: {
        title: "v0.2.0 GitHub Release publish",
        recordedAt: null
      },
      currentMilestoneId: "v0-2-0-release",
      nextMilestoneId: "v0-2-0-release",
      topRisks: [
        "发布前仍需人工确认 README、release copy 和截图观感。",
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
          state: "done"
        },
        {
          id: "context-os-surface",
          label: "Context OS",
          title: "打磨 Context Packet、recovery 与 truth 来源",
          summary: "让用户知道 packet 从哪里来、何时刷新、何时回到 conductor。",
          state: "done"
        },
        {
          id: "docs-skill",
          label: "release docs",
          title: "补齐 v0.2.0 release notes 与 checklist",
          summary: "讲清 Context OS 已交付能力与 deferred non-goals。",
          state: "done"
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
      phaseName: "v0.2.0 final release review",
      phaseGoal: "在真正创建 tag 和 GitHub Release 前，人工复核公开页面、release copy、启动路径和 Context OS 边界是否都清楚。",
      deliverable: "v0.2.0 final release decision",
      inScope: [
        "人工复核 README / release notes / release copy",
        "确认 start message、front door 和 social copy 不再停留在旧版本",
        "确认 Context Packet / sync-context / truth source 说明清楚",
        "确认 Threadsmith skill 和 conductor 边界保持清楚",
        "确认是否进入 v0.2.0 GitHub Release publish"
      ],
      outOfScope: [
        "multi-provider 自动执行",
        "native desktop shell",
        "替代 Codex Desktop / Codex CLI 的主聊天入口"
      ],
      stopCondition: "用户完成最终人工验收，并明确同意进入 tag / GitHub Release 发布动作。",
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
      currentClaim: "Threadsmith v0.2.0 Context OS 的 release hardening 已本地验收；当前前门是入口快照，真实项目进度以进入项目后的 `.threadsmith` 为准。",
      doneWhenChecklist: [
        {
          id: "ci-green",
          label: "release verification 和 GitHub Actions CI 变绿",
          status: "pass"
        },
        {
          id: "first-run",
          label: "公开说明清楚解释 .threadsmith、Context Packet 与 conductor 边界",
          status: "pass"
        },
        {
          id: "refresh-truth",
          label: "sync-context、刷新状态和 truth 来源边界清楚",
          status: "pass"
        },
        {
          id: "demo-mode",
          label: "前门和 demo mode 不会伪装成真实项目进度",
          status: "pass"
        },
        {
          id: "release-surface",
          label: "README、usage guide、release note 和 share 文案对齐 v0.2.0",
          status: "pass"
        }
      ],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [
        "最终 tag 和 GitHub Release 尚未发布，需要用户明确确认。",
        "multi-provider automatic execution 仍不属于 v0.2.0 交付范围。",
        "desktop shell 仍在后续 backlog，不作为当前发布 blocker。"
      ],
      finalState: "accepted"
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
          status: "done",
          taskSummary: "已对齐版本、release docs、Context OS 说明和验证路径",
          requiresUserDecision: false
        },
        {
          role: "reviewer",
          status: "done",
          taskSummary: "已检查公开发布 claims 仍保持 web-first / Codex-only 边界",
          requiresUserDecision: false
        },
        {
          role: "verifier",
          status: "done",
          taskSummary: "已通过本地验证与 GitHub Actions 回流",
          requiresUserDecision: false
        },
        {
          role: "closeout",
          status: "waiting",
          taskSummary: "等待用户最终确认是否进入 v0.2.0 GitHub Release publish",
          requiresUserDecision: true
        }
      ],
      blockerSummary: null
    },
    preferences: createPreferences()
  });

  const projectSupervision = projectSupervisionStateSchema.parse({
    mode: "multi-thread",
    modeLabel: "发布候场",
    summary:
      "当前是 Threadsmith 前门，不直接承载某个真实项目的编码执行；v0.2.0 Context OS 已完成本地发布准备，等待最终人工发布决定。",
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
        latestEvidenceLabel: "release scope accepted",
        updatedAt: calibratedAt
      },
      {
        id: "executor",
        role: "executor",
        threadLabel: "Release Surface",
        provider: providerRouting.executor,
        presence: "logical",
        status: "done",
        taskSummary: "已把 Context OS 发布面收口到可人工复核的 v0.2.0 候场状态。",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "local release verification passed",
        updatedAt: calibratedAt
      },
      {
        id: "closeout",
        role: "closeout",
        threadLabel: "Release Decision",
        provider: providerRouting.closeout,
        presence: "logical",
        status: "waiting",
        taskSummary: "等待用户确认是否创建 v0.2.0 tag 和 GitHub Release。",
        requiresUserDecision: true,
        blockerSummary: null,
        latestEvidenceLabel: "manual publish decision pending",
        updatedAt: calibratedAt
      }
    ],
    updatedAt: calibratedAt
  });

  return {
    projectRoot: APP_HOME_PROJECT_ROOT,
    state,
    providerRouting,
    skillRouting,
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
