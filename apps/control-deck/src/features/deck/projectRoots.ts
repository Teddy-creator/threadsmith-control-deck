import {
  APP_HOME_PROJECT_ROOT,
  FRESH_DEMO_PROJECT_ROOT,
  STALE_PACKET_DEMO_PROJECT_ROOT,
  getProjectSourceDefinition,
  matchKnownProjectRoot,
  type ProjectSourceId
} from "./scenarioCatalog";
import type { EntryModePreference } from "./entryModePreference";

export {
  APP_HOME_PROJECT_ROOT,
  FRESH_DEMO_PROJECT_ROOT,
  STALE_PACKET_DEMO_PROJECT_ROOT
};
export type { ProjectSourceId } from "./scenarioCatalog";

export interface ProjectSelection {
  sourceId: ProjectSourceId;
  label: string;
  projectRoot: string;
}

function buildProjectSelection(
  sourceId: ProjectSourceId,
  projectRoot: string
): ProjectSelection {
  const source = getProjectSourceDefinition(sourceId);

  return {
    sourceId,
    label: source?.label ?? "自定义项目",
    projectRoot
  };
}

export function getPresetProjectSelection(
  sourceId: "app-home" | "fresh-demo" | "stale-packet-demo"
) {
  const source = getProjectSourceDefinition(sourceId);

  if (!source?.projectRoot) {
    throw new Error(`来源 "${sourceId}" 缺少项目根目录`);
  }

  return buildProjectSelection(sourceId, source.projectRoot);
}

export function getDemoProjectSelection(
  sourceId: "fresh-demo" | "stale-packet-demo"
) {
  return getPresetProjectSelection(sourceId);
}

export function resolveProjectSelectionFromRoot(projectRoot: string) {
  const matchedSource = matchKnownProjectRoot(projectRoot);

  if (matchedSource) {
    return buildProjectSelection(matchedSource.id, projectRoot);
  }

  return buildProjectSelection("custom-project", projectRoot);
}

export function resolveInitialProjectSelection(
  options: {
    envProjectRoot?: string;
    preferredProjectRoot?: string;
    preferredEntryMode?: EntryModePreference | null;
    defaultProjectRoot?: string;
    search?: string;
  } = {}
) {
  if (options.envProjectRoot) {
    return resolveProjectSelectionFromRoot(options.envProjectRoot);
  }

  const search =
    options.search ?? (typeof window !== "undefined" ? window.location.search : "");
  const params = new URLSearchParams(search);
  const explicitProjectRoot = params.get("projectRoot");

  if (explicitProjectRoot) {
    return resolveProjectSelectionFromRoot(explicitProjectRoot);
  }

  if (params.get("appHome") === "1") {
    return getPresetProjectSelection("app-home");
  }

  const demoFixture = params.get("demoFixture");

  if (demoFixture === "stale-packet") {
    return getPresetProjectSelection("stale-packet-demo");
  }

  if (options.preferredEntryMode === "app-home") {
    return getPresetProjectSelection("app-home");
  }

  if (options.preferredEntryMode === "direct-project") {
    if (options.preferredProjectRoot) {
      return resolveProjectSelectionFromRoot(options.preferredProjectRoot);
    }

    if (options.defaultProjectRoot) {
      return resolveProjectSelectionFromRoot(options.defaultProjectRoot);
    }

    return getPresetProjectSelection("app-home");
  }

  if (options.preferredProjectRoot) {
    return resolveProjectSelectionFromRoot(options.preferredProjectRoot);
  }

  if (options.defaultProjectRoot) {
    return resolveProjectSelectionFromRoot(options.defaultProjectRoot);
  }

  return getPresetProjectSelection("fresh-demo");
}

export function buildSearchForProjectSelection(
  selection: ProjectSelection,
  currentSearch = ""
) {
  const params = new URLSearchParams(currentSearch);

  params.delete("projectRoot");
  params.delete("demoFixture");
  params.delete("appHome");

  if (selection.sourceId === "app-home") {
    params.set("appHome", "1");
  }

  if (selection.sourceId === "stale-packet-demo") {
    params.set("demoFixture", "stale-packet");
  }

  if (selection.sourceId === "custom-project") {
    params.set("projectRoot", selection.projectRoot);
  }

  const nextSearch = params.toString();

  return nextSearch ? `?${nextSearch}` : "";
}
