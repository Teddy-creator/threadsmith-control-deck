import {
  commandBridgeStateSchema,
  createPreferences,
  projectStateSchema,
  projectSupervisionStateSchema,
  type ProviderRouting
} from "@threadsmith/domain";
import { APP_HOME_PROJECT_ROOT } from "../src/features/deck/appHomeSource";

export function createAppHomeBridgeResponse(providerRouting: ProviderRouting) {
  const calibratedAt = "2026-04-11T16:55:18.000Z";
  const state = projectStateSchema.parse({
    projectBrief: {
      projectGoal: "打开 Threadsmith 并进入今天的工作",
      currentVersionScope:
        "Threadsmith 前门只负责选择今天要进入的真实项目；实时进度以进入后的项目 `.threadsmith` 为准",
      nonGoals: [
        "替代主聊天面",
        "把现有 web control deck 重写成桌面应用",
        "在当前 freeze 里直接切 public"
      ],
      keyConstraints: [
        "保持 web + launcher 为稳定基座",
        "主要开发对话继续留在外部 conductor surface",
        "桌面壳和 public 发布都不混入当前 freeze 基线"
      ],
      successFrame:
        "用户打开 Threadsmith 前门后，能清楚知道这里是入口页，并能立刻进入真实项目查看实时 truth",
      priorityOrder: [
        "保持前门和项目入口稳定",
        "保持当前 web freeze 基线",
        "把桌面壳留作后续独立阶段",
        "公开发布动作按需要单独处理"
      ],
      openStrategicQuestions: [
        "什么时候正式开启 desktop shell / macOS wrapper v1",
        "何时把当前 private 仓库切到 public"
      ]
    },
    projectStatus: {
      projectLabel: "Threadsmith",
      currentTrack: "front door / project entry",
      overallState: "stable",
      currentFocus: "前门页只显示入口快照；进入真实项目后才展示该项目的实时 `.threadsmith` 状态",
      projectStatusSummary:
        "这个来源不是某个真实项目的开发页，而是 Threadsmith 的产品前门。它用于选择默认项目、最近项目或新项目；真正的 phase、acceptance、run 和 evidence 会在进入真实项目后从该项目 `.threadsmith` 读取。",
      latestAcceptedSlice: {
        title: "front door entry surface",
        recordedAt: calibratedAt
      },
      nextPlannedSlice: {
        title: "desktop shell / macOS wrapper v1",
        recordedAt: null
      },
      currentMilestoneId: null,
      nextMilestoneId: "desktop-shell",
      topRisks: [
        "如果把前门状态误认为真实项目状态，会导致用户误判当前进度。",
        "desktop shell 与长期桌面分发仍未定义，不应混进当前前门边界。",
        "仓库仍保持 private，公开发布动作尚未执行。"
      ],
      updatedAt: calibratedAt
    },
    projectRoadmap: {
      versionLabel: "Threadsmith 前门",
      finalGoal:
        "让 Threadsmith 既保留稳定的 web control deck，又拥有更像产品的日常打开入口。",
      milestones: [
        {
          id: "front-door",
          label: "前门入口",
          title: "建立 Threadsmith 的产品前门",
          summary: "让用户先从产品入口理解 Threadsmith，再决定进入哪个真实项目。",
          state: "done"
        },
        {
          id: "daily-entry",
          label: "日常进入",
          title: "收口默认项目、最近项目与重新打开路径",
          summary: "让 Threadsmith 真正适合作为每天都会打开的控制台入口。",
          state: "done"
        },
        {
          id: "project-entry",
          label: "项目进入",
          title: "让前门能够清楚跳去真实项目",
          summary: "从默认项目、最近项目和首次连接这三条路径里，选对今天的进入路线。",
          state: "done"
        },
        {
          id: "install-surface",
          label: "安装感",
          title: "让 Threadsmith 能被感知成可安装、可固定的入口",
          summary: "让产品自己说明安装与固定方式，而不只是被动依赖 manifest 和 launcher。",
          state: "done"
        },
        {
          id: "open-source-surface",
          label: "开源表面",
          title: "让仓库和产品说明适合公开展示与上手",
          summary: "README、截图、release note 和贡献说明已经具备公开交付表面。",
          state: "done"
        },
        {
          id: "release-hygiene",
          label: "发布收口",
          title: "把 v0.1 release hygiene 做完整",
          summary: "版本、changelog、release note、CI 和 launcher 校验已经完成。",
          state: "done"
        },
        {
          id: "web-surface",
          label: "Web 基座",
          title: "保持 web control deck 作为长期稳定基座",
          summary: "桌面壳不会替代这条路径，而是在它之上加一个更自然的入口。",
          state: "done"
        },
        {
          id: "desktop-shell",
          label: "桌面壳",
          title: "评估并落地一个很薄的 macOS wrapper",
          summary: "先做独立窗口与稳定启动，不提前跳进签名、更新和重度原生能力。",
          state: "next"
        }
      ],
      updatedAt: calibratedAt
    },
    currentPhase: {
      phaseName: "front door entry snapshot",
      phaseGoal: "把 Threadsmith 前门清楚表达为入口页，而不是某个真实项目的实时开发状态",
      deliverable: "可进入默认项目、最近项目或新项目的前门快照",
      inScope: [
        "Threadsmith 前门与项目直达路径",
        "web control deck 的当前交付表面",
        "release hygiene 与 truth boundary",
        "self-host smoke 的隔离 workspace 默认行为"
      ],
      outOfScope: [
        "desktop shell / macOS wrapper v1",
        "原生桌面分发、签名与自动更新",
        "把当前仓库切到 public"
      ],
      stopCondition: "用户能从前门进入真实项目，并理解实时状态以真实项目 `.threadsmith` 为准。",
      verificationForThisPhase: [
        "npm run verify:release",
        "npm run smoke:self-host"
      ],
      activeOwners: [],
      blockedBy: []
    },
    acceptanceState: {
      currentClaim: "Threadsmith 前门只是入口快照；真实项目的实时进度必须进入对应项目后读取。",
      doneWhenChecklist: [
        {
          id: "web-surface",
          label: "前门、项目入口和安装感已经稳定",
          status: "pass"
        },
        {
          id: "boundaries",
          label: "已经明确 web control deck 仍是当前稳定基座",
          status: "pass"
        },
        {
          id: "smoke-boundary",
          label: "self-host smoke 默认在隔离 workspace 运行，且真实 bridge 能稳定收口",
          status: "pass"
        },
        {
          id: "deferred-boundary",
          label: "桌面壳与 public 发布没有混进当前 web v0.1 基线",
          status: "pass"
        },
        {
          id: "non-goals",
          label: "前门继续清楚说明 Threadsmith 不是主聊天面",
          status: "pass"
        }
      ],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [
        "desktop shell / 原生分发仍在后续 backlog，不属于当前 web v0.1 的 blocker。",
        "仓库暂时保持 private；是否切 public 由你后续单独决定。"
      ],
      finalState: "accepted"
    },
    activeWork: {
      items: [
        {
          role: "planner",
          status: "idle",
          taskSummary: "前门等待用户选择今天要进入的真实项目",
          requiresUserDecision: false
        },
        {
          role: "executor",
          status: "idle",
          taskSummary: "前门不直接执行真实项目任务；进入项目后再由项目 truth 驱动",
          requiresUserDecision: false
        },
        {
          role: "reviewer",
          status: "done",
          taskSummary: "已复核 freeze 边界，确认 desktop shell 与 public 发布没有混进当前基线",
          requiresUserDecision: false
        },
        {
          role: "verifier",
          status: "done",
          taskSummary: "`npm run verify:release` 与 `npm run smoke:self-host` 已通过",
          requiresUserDecision: false
        },
        {
          role: "closeout",
          status: "done",
          taskSummary: "前门边界已明确：入口页不等于真实项目实时页",
          requiresUserDecision: false
        }
      ],
      blockerSummary: null
    },
    preferences: createPreferences()
  });

  const projectSupervision = projectSupervisionStateSchema.parse({
    mode: "multi-thread",
    modeLabel: "前门引导",
    summary:
      "当前是 Threadsmith 前门，不直接承载某个真实项目的编码执行；它只负责选择入口，真实进度进入项目后从该项目 `.threadsmith` 读取。",
    lines: [
      {
        id: "planner",
        role: "planner",
        threadLabel: "Front Door",
        provider: providerRouting.planner,
        presence: "logical",
        status: "done",
        taskSummary: "当前前门只负责稳定进入；真实项目页才展示实时 truth。",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "verify:release + smoke:self-host 已通过",
        updatedAt: calibratedAt
      },
      {
        id: "executor",
        role: "executor",
        threadLabel: "Project Entry",
        provider: providerRouting.executor,
        presence: "logical",
        status: "idle",
        taskSummary: "当前没有新的实现任务；desktop shell 与 public 发布都留待后续阶段。",
        requiresUserDecision: false,
        blockerSummary: null,
        latestEvidenceLabel: "web surface remains stable",
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
