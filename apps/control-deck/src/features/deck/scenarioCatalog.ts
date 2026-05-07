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
    label: "最新 packet 示例",
    description: "已接受的 slice，并带有最新的 handoff packet。",
    projectRoot: FRESH_DEMO_PROJECT_ROOT,
    demoFixture: null
  },
  {
    id: "stale-packet-demo",
    label: "过期 packet 示例",
    description: "已接受的 slice，但当前 packet 之后又出现了更新的 truth。",
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
