import { APP_HOME_PROJECT_ROOT } from "./appHomeSource";
export { APP_HOME_PROJECT_ROOT } from "./appHomeSource";

export type ProjectSourceId =
  | "app-home"
  | "fresh-demo"
  | "stale-packet-demo"
  | "custom-project";

export interface ProjectSourceDefinition {
  id: ProjectSourceId;
  label: string;
  description: string;
  projectRoot: string | null;
  demoFixture: string | null;
}

export const FRESH_DEMO_PROJECT_ROOT =
  import.meta.env.VITE_THREADSMITH_FRESH_DEMO_PROJECT_ROOT;

export const STALE_PACKET_DEMO_PROJECT_ROOT =
  import.meta.env.VITE_THREADSMITH_STALE_PACKET_DEMO_PROJECT_ROOT;

export const PROJECT_SOURCE_CATALOG: ProjectSourceDefinition[] = [
  {
    id: "app-home",
    label: "前门入口",
    description: "产品前门；这是 synthetic front door source，用来先决定今天要进入哪个真实项目。",
    projectRoot: APP_HOME_PROJECT_ROOT,
    demoFixture: null
  },
  {
    id: "fresh-demo",
    label: "Demo：已收口项目",
    description: "学习首页五块和工作台：已验收、可继续、packet 最新。",
    projectRoot: FRESH_DEMO_PROJECT_ROOT,
    demoFixture: null
  },
  {
    id: "stale-packet-demo",
    label: "Demo：过期交接点",
    description: "学习风险态：项目 truth 已更新，但 handoff packet 落后。",
    projectRoot: STALE_PACKET_DEMO_PROJECT_ROOT,
    demoFixture: "stale-packet"
  },
  {
    id: "custom-project",
    label: "自定义项目",
    description: "连接真实项目根目录；如果还没有 .threadsmith，也可以直接初始化。",
    projectRoot: null,
    demoFixture: null
  }
];

export function getProjectSourceDefinition(sourceId: ProjectSourceId) {
  return PROJECT_SOURCE_CATALOG.find((source) => source.id === sourceId) ?? null;
}

export function matchKnownProjectRoot(projectRoot: string) {
  return PROJECT_SOURCE_CATALOG.find((source) => source.projectRoot === projectRoot) ?? null;
}
