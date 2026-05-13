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
  const calibratedAt = "2026-05-13T00:00:00.000Z";
  const state = projectStateSchema.parse({
    projectBrief: {
      projectGoal: "打开 Threadsmith 并进入今天的工作",
      currentVersionScope:
        "Threadsmith 前门只负责选择今天要进入的真实项目；实时进度以进入后的项目 `.threadsmith` 为准。当前公开稳定线是 v0.3.2，v0.3.0 是 Skill Orchestrator 功能基线。",
      nonGoals: [
        "替代主聊天面",
        "把现有 web control deck 重写成桌面应用",
        "把前门误读成某个真实项目的实时进度",
        "在前门里直接启动真实项目执行"
      ],
      keyConstraints: [
        "保持 web + launcher 为稳定基座",
        "主要开发对话继续留在外部 conductor surface",
        "前门只展示入口快照；真实项目状态进入项目后再读取"
      ],
      successFrame:
        "用户打开 Threadsmith 前门后，能清楚知道这里是入口页，并能立刻进入真实项目查看实时 truth。",
      priorityOrder: [
        "确认要进入的真实项目",
        "解释 committed truth 与 Context Packet 来源",
        "进入真实项目后再查看 phase、验收、证据和路由",
        "需要推进时回到 conductor surface 或显式调用 $threadsmith"
      ],
      openStrategicQuestions: [
        "v0.3.2 发布后，下一条主线是继续打磨 all-Codex 使用体验，还是重新评估 desktop shell？",
        "什么时候正式开启 desktop shell / macOS wrapper v1"
      ]
    },
    projectStatus: {
      projectLabel: "Threadsmith",
      currentTrack: "Front door / project entry",
      overallState: "stable",
      currentFocus: "选择今天要进入的真实项目；进入后再读取该项目的实时 .threadsmith truth。",
      projectStatusSummary:
        "这个来源不是某个真实项目的开发页，而是 Threadsmith 的产品前门。最新稳定线是 v0.3.2 Harness Skill Orchestrator patch release；v0.3.0 是 Skill Orchestrator 功能基线。",
      latestAcceptedSlice: {
        title: "v0.3.2 release truth schema patch",
        recordedAt: "2026-05-13T00:00:00.000Z"
      },
      nextPlannedSlice: {
        title: "进入真实项目或继续 all-Codex polish",
        recordedAt: null
      },
      currentMilestoneId: "front-door-entry",
      nextMilestoneId: "real-project-truth",
      topRisks: [
        "前门只是入口快照，不代表任何真实项目的实时进度。",
        "如果 conductor 没有写回 `.threadsmith`，页面只能显示旧 truth。",
        "v0.3.2 仍不承诺 multi-provider 自动执行或真实外部 skill 调用。"
      ],
      updatedAt: calibratedAt
    },
    projectRoadmap: {
      versionLabel: "Threadsmith Entry Surface",
      finalGoal:
        "让用户先从一个清楚的前门进入真实项目，再在项目控制台查看 durable workflow truth。",
      milestones: [
        {
          id: "web-control-deck",
          label: "Web deck",
          title: "打开本地 Threadsmith 控制台",
          summary: "通过 npm、macOS command 或 Windows PowerShell 启动本地 web deck。",
          state: "done"
        },
        {
          id: "launcher-parity",
          label: "跨平台入口",
          title: "Windows / macOS launcher parity",
          summary: "macOS 和 Windows 都有前门与项目直达启动脚本。",
          state: "done"
        },
        {
          id: "front-door-entry",
          label: "前门",
          title: "确认今天进入哪个真实项目",
          summary: "前门帮助选择默认项目、最近项目或连接新项目。",
          state: "current"
        },
        {
          id: "real-project-truth",
          label: "真实项目",
          title: "进入项目并查看 `.threadsmith` truth",
          summary: "进入真实项目后，首页和工作台才展示该项目的 phase、验收、证据和路由。",
          state: "next"
        },
        {
          id: "post-release-roadmap",
          label: "后续路线",
          title: "继续打磨 all-Codex 使用体验",
          summary: "v0.3.2 发布后，继续围绕 truth、skill routing、autopilot safety 和使用者路径做小步改进。",
          state: "later"
        }
      ],
      updatedAt: calibratedAt
    },
    currentPhase: {
      phaseName: "选择真实项目入口",
      phaseGoal: "先确认今天要查看或推进哪个真实项目，避免把前门快照误读成项目实时状态。",
      deliverable: "进入一个真实项目，或完成首次项目连接与初始化。",
      inScope: [
        "打开默认项目或最近项目",
        "连接新的项目根目录",
        "解释前门、真实项目 truth、conductor surface 的边界"
      ],
      outOfScope: [
        "在前门直接执行真实项目任务",
        "发布或 tag 新版本",
        "替代 Codex Desktop / Codex CLI 的主聊天入口"
      ],
      stopCondition: "已经进入一个真实项目，或完成首次项目连接与初始化。",
      verificationForThisPhase: [
        "前门能打开",
        "真实项目能连接或初始化",
        "进入真实项目后能读取其 `.threadsmith` truth"
      ],
      activeOwners: ["planner"],
      blockedBy: []
    },
    acceptanceState: {
      currentClaim:
        "当前前门是入口快照，不是真实项目进度；进入项目后才会展示该项目的 phase、验收、证据和路由。",
      doneWhenChecklist: [
        {
          id: "front-door-clear",
          label: "前门清楚说明自己只是入口页",
          status: "pass"
        },
        {
          id: "project-entry",
          label: "用户可以打开默认项目、最近项目或连接新项目",
          status: "pass"
        },
        {
          id: "truth-boundary",
          label: "进入真实项目后才读取项目 `.threadsmith` truth",
          status: "pass"
        },
        {
          id: "version-boundary",
          label: "v0.3.2 稳定补丁版与 v0.3.0 功能基线的边界不混淆",
          status: "pass"
        }
      ],
      implementationStatus: "ready-for-review",
      reviewStatus: "ready-for-verification",
      verificationStatus: "passed",
      closeoutStatus: "done",
      knownGaps: [
        "前门只展示入口快照；真实项目状态仍以项目 `.threadsmith` 为准。",
        "前门不会自动读取聊天线程里的临时讨论；只有写回 `.threadsmith` 的 truth 才会稳定出现。"
      ],
      finalState: "accepted"
    },
    activeWork: {
      items: [
        {
          role: "planner",
          status: "waiting",
          taskSummary: "等待用户选择默认项目、最近项目或连接新项目。",
          requiresUserDecision: true
        }
      ],
      blockerSummary: null
    },
    preferences: createPreferences()
  });

  const projectSupervision = projectSupervisionStateSchema.parse({
    mode: "single-thread",
    modeLabel: "入口选择",
    summary:
      "当前是 Threadsmith 前门，不直接承载真实项目编码执行；请选择项目后进入真实控制台。",
    lines: [
      {
        id: "front-door-planner",
        role: "planner",
        threadLabel: "Front Door",
        provider: providerRouting.planner,
        presence: "logical",
        status: "waiting",
        taskSummary: "等待用户选择默认项目、最近项目或连接新项目。",
        requiresUserDecision: true,
        blockerSummary: null,
        latestEvidenceLabel: "entry surface ready",
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
