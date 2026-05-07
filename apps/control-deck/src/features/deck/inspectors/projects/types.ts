import type { InstallSurfaceState } from "../../installSurface";
import type { RecentProjectEntry } from "../../recentProjects";

export type ProjectsEntryMode = "app-home" | "direct-project";

export interface StartupGuideAction {
  label: string;
  onClick: () => void;
}

export interface StartupGuide {
  tone: string;
  badgeLabel: string;
  title: string;
  detail: string;
  nextStep: string;
  command: string;
  action: StartupGuideAction | null;
  boundaryText: string;
}

export interface OnboardingGuide {
  tone: string;
  badgeLabel: string;
  title: string;
  detail: string;
  steps: Array<{ label: string; state: "done" | "current" | "next" }>;
  hint: string;
  actionLabel: string | null;
}

export interface RecentProjectCard {
  entry: RecentProjectEntry;
  name: string;
  isCurrent: boolean;
  isDefault: boolean;
}

export interface ProjectSourceOption {
  id: "app-home" | "fresh-demo" | "stale-packet-demo" | "custom-project";
  label: string;
  description: string;
}

export const PROJECT_SOURCE_OPTIONS: ProjectSourceOption[] = [
  {
    id: "app-home",
    label: "前门入口",
    description: "产品前门；先决定今天要进入哪个真实项目。"
  },
  {
    id: "fresh-demo",
    label: "最新 packet 示例",
    description: "已接受切片，并带有最新交接点。"
  },
  {
    id: "stale-packet-demo",
    label: "过期 packet 示例",
    description: "已有交接点，但项目真相已经更新。"
  },
  {
    id: "custom-project",
    label: "自定义项目",
    description: "连接你的真实项目目录。"
  }
];

export type { InstallSurfaceState };
