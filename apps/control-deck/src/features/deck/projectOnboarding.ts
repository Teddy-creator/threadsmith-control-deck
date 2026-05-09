import type { ProjectLoadFailureKind } from "./projectConnection";

export type ProjectOnboardingActionId =
  | "focus-connect"
  | "initialize"
  | "set-default"
  | "open-recent";

export interface ProjectOnboardingStep {
  label: string;
  state: "done" | "current" | "next";
}

export interface ProjectOnboardingGuide {
  tone: "blue" | "amber" | "green" | "red";
  badgeLabel: string;
  title: string;
  detail: string;
  steps: ProjectOnboardingStep[];
  hint: string;
  actionId: ProjectOnboardingActionId | null;
  actionLabel: string | null;
}

export function buildProjectOnboardingGuide(args: {
  currentSourceIsAppHome: boolean;
  currentSourceIsCustomProject: boolean;
  hasRecentProject: boolean;
  recentProjectName?: string | null;
  hasRecoveryProject: boolean;
  recoveryProjectName?: string | null;
  currentProjectName?: string | null;
  normalizedCustomProjectDraft: string;
  dailyEntryProjectRoot: string | null;
  isCurrentProjectDailyEntry: boolean;
  hasSupervisorState: boolean;
  hasProjectConnectionIssue: boolean;
  customProjectErrorKind: ProjectLoadFailureKind | null;
}): ProjectOnboardingGuide | null {
  if (
    args.currentSourceIsAppHome &&
    !args.dailyEntryProjectRoot &&
    !args.hasRecentProject
  ) {
    return {
      tone: "blue",
      badgeLabel: "首次使用",
      title: "先把第一个真实项目接进 Threadsmith",
      detail:
        "第一次使用时，先连上一个真实项目根目录。Threadsmith 会读取这个项目里的 `.threadsmith`，把目标、阶段、验收和证据展示出来；你的主要开发对话仍然回到 Codex Desktop 或 Codex CLI。",
      steps: [
        { label: "填写真实项目根目录", state: "current" },
        { label: "如果缺少 .threadsmith 就初始化", state: "next" },
        { label: "进入项目后回到 Conductor 推进", state: "next" }
      ],
      hint: "可以先打开 demo mode 理解页面含义；正式工作时再连接真实项目。",
      actionId: "focus-connect",
      actionLabel: "填写项目根目录"
    };
  }

  if (
    args.currentSourceIsCustomProject &&
    args.customProjectErrorKind === "missing-state" &&
    args.normalizedCustomProjectDraft.length > 0
  ) {
    return {
      tone: "amber",
      badgeLabel: "只差初始化",
      title: "这个目录已经找到，只差初始化 Threadsmith",
      detail: `${args.normalizedCustomProjectDraft} 还缺少最小 .threadsmith 状态。初始化后，就可以把它当成正式项目控制台继续推进。`,
      steps: [
        { label: "目录已找到", state: "done" },
        { label: "初始化 Threadsmith", state: "current" },
        { label: "返回真实项目控制台继续第一条 slice", state: "next" }
      ],
      hint: "这里不是项目坏掉了，而是第一次接入时还缺少 Threadsmith 的最小状态文件。",
      actionId: "initialize",
      actionLabel: "初始化 Threadsmith"
    };
  }

  if (
    args.currentSourceIsCustomProject &&
    args.hasProjectConnectionIssue &&
    args.customProjectErrorKind !== "missing-state"
  ) {
    return {
      tone: "red",
      badgeLabel: "等待恢复",
      title: "先回到可用项目，或修复当前目录再继续",
      detail: "当前目录里的 Threadsmith 状态暂时不可读。你可以先回到最近项目继续工作，或者修复状态后再重新连接。",
      steps: [
        { label: "当前目录暂时不可用", state: "current" },
        {
          label: args.hasRecoveryProject
            ? `先回到最近项目 ${args.recoveryProjectName ?? "最近项目"}`
            : "先修复当前目录里的状态文件",
          state: "next"
        },
        { label: "修复后再重新连接这个目录", state: "next" }
      ],
      hint: "如果只是想先继续开发，优先回到最近项目通常比当场修状态更稳。",
      actionId: args.hasRecoveryProject ? "open-recent" : null,
      actionLabel:
        args.hasRecoveryProject && args.recoveryProjectName
          ? `继续最近项目 ${args.recoveryProjectName}`
          : null
    };
  }

  if (
    args.currentSourceIsCustomProject &&
    args.hasSupervisorState &&
    !args.dailyEntryProjectRoot &&
    !args.isCurrentProjectDailyEntry
  ) {
    return {
      tone: "green",
      badgeLabel: "首次接入完成",
      title: "这次接入已经成功，建议顺手设成默认进入",
      detail: `${args.currentProjectName ?? "当前项目"} 已经接入 Threadsmith。现在把它设成默认进入，后面就能从前门更快回到这里。`,
      steps: [
        { label: "真实项目已接入", state: "done" },
        { label: "设为默认进入", state: "current" },
        { label: "以后直接从前门回来", state: "next" }
      ],
      hint: "如果这个项目就是你接下来主要要做的那条线，这一步会明显降低后续打开成本。",
      actionId: "set-default",
      actionLabel: "设为默认进入"
    };
  }

  return null;
}
