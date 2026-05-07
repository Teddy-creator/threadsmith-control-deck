import { useEffect, useState } from "react";
import {
  buildSearchForProjectSelection,
  getPresetProjectSelection,
  resolveInitialProjectSelection,
  resolveProjectSelectionFromRoot
} from "./projectRoots";
import {
  clearDailyEntryProjectRoot,
  readDailyEntryProjectRoot,
  writeDailyEntryProjectRoot
} from "./dailyEntryProject";
import {
  clearEntryModePreference,
  readEntryModePreference,
  writeEntryModePreference,
  type EntryModePreference
} from "./entryModePreference";
import {
  pinRecentProjectEntry,
  readRecentProjectEntries,
  removeRecentProjectEntry,
  unpinRecentProjectEntry,
  updateRecentProjectEntries,
  writeRecentProjectEntries
} from "./recentProjects";
import {
  fetchProjectBridgeState,
  initializeProjectBridgeState,
  ProjectLoadError,
  type ProjectLoadFailureKind
} from "./projectConnection";

function buildInitialControlDeckState() {
  const storedRecentProjects = readRecentProjectEntries();
  const dailyEntryProjectRoot = readDailyEntryProjectRoot();
  const entryModePreference = readEntryModePreference();
  const projectSelection = resolveInitialProjectSelection({
    envProjectRoot: import.meta.env.VITE_THREADSMITH_PROJECT_ROOT,
    preferredProjectRoot: dailyEntryProjectRoot ?? storedRecentProjects[0]?.projectRoot,
    preferredEntryMode: entryModePreference,
    defaultProjectRoot: import.meta.env.VITE_THREADSMITH_SELF_PROJECT_ROOT
  });
  const recentProjects =
    projectSelection.sourceId === "custom-project"
      ? updateRecentProjectEntries(
          storedRecentProjects,
          projectSelection.projectRoot
        )
      : storedRecentProjects;

  return {
    projectSelection,
    dailyEntryProjectRoot,
    entryModePreference,
    recentProjects,
    customProjectDraft:
      projectSelection.sourceId === "custom-project"
        ? projectSelection.projectRoot
        : recentProjects[0]?.projectRoot ?? ""
  };
}

export function useControlDeckSessionState() {
  const [initialState] = useState(buildInitialControlDeckState);
  const [projectSelection, setProjectSelection] = useState(initialState.projectSelection);
  const [customProjectError, setCustomProjectError] = useState<string | null>(null);
  const [customProjectErrorKind, setCustomProjectErrorKind] =
    useState<ProjectLoadFailureKind | null>(null);
  const [isConnectingCustomProject, setIsConnectingCustomProject] = useState(false);
  const [isInitializingCustomProject, setIsInitializingCustomProject] = useState(false);
  const [recentProjects, setRecentProjects] = useState(initialState.recentProjects);
  const [dailyEntryProjectRoot, setDailyEntryProjectRoot] = useState<string | null>(
    initialState.dailyEntryProjectRoot
  );
  const [entryModePreference, setEntryModePreference] =
    useState<EntryModePreference | null>(initialState.entryModePreference);
  const [customProjectDraft, setCustomProjectDraft] = useState(initialState.customProjectDraft);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextSearch = buildSearchForProjectSelection(
      projectSelection,
      window.location.search
    );
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, [projectSelection]);

  useEffect(() => {
    writeRecentProjectEntries(recentProjects);
  }, [recentProjects]);

  useEffect(() => {
    if (dailyEntryProjectRoot) {
      writeDailyEntryProjectRoot(dailyEntryProjectRoot);
      return;
    }

    clearDailyEntryProjectRoot();
  }, [dailyEntryProjectRoot]);

  useEffect(() => {
    if (entryModePreference) {
      writeEntryModePreference(entryModePreference);
      return;
    }

    clearEntryModePreference();
  }, [entryModePreference]);

  useEffect(() => {
    if (projectSelection.sourceId === "custom-project") {
      setCustomProjectDraft(projectSelection.projectRoot);
    }
  }, [projectSelection]);

  function clearCustomProjectIssue() {
    setCustomProjectError(null);
    setCustomProjectErrorKind(null);
  }

  function selectProjectSource(sourceId: typeof projectSelection.sourceId) {
    clearCustomProjectIssue();

    if (sourceId === "custom-project") {
      return;
    }

    setProjectSelection(getPresetProjectSelection(sourceId));
  }

  function updateCustomProjectDraftValue(value: string) {
    clearCustomProjectIssue();
    setCustomProjectDraft(value);
  }

  async function connectCustomProject(projectRoot: string) {
    const normalizedProjectRoot = projectRoot.trim();

    if (!normalizedProjectRoot) {
      return;
    }

    clearCustomProjectIssue();
    setIsConnectingCustomProject(true);
    setCustomProjectDraft(normalizedProjectRoot);

    try {
      await fetchProjectBridgeState(normalizedProjectRoot);
      setProjectSelection(resolveProjectSelectionFromRoot(normalizedProjectRoot));
      setRecentProjects((currentProjects) =>
        updateRecentProjectEntries(currentProjects, normalizedProjectRoot)
      );
    } catch (reason) {
      setCustomProjectError(
        reason instanceof Error ? reason.message : "未知项目连接错误"
      );
      setCustomProjectErrorKind(
        reason instanceof ProjectLoadError ? reason.kind : null
      );
    } finally {
      setIsConnectingCustomProject(false);
    }
  }

  async function initializeCustomProject(
    projectRoot: string,
    options?: { onReloadCurrentProject?: () => Promise<void> }
  ) {
    const normalizedProjectRoot = projectRoot.trim();

    if (!normalizedProjectRoot) {
      return;
    }

    clearCustomProjectIssue();
    setIsInitializingCustomProject(true);
    setCustomProjectDraft(normalizedProjectRoot);

    try {
      await initializeProjectBridgeState(normalizedProjectRoot);
      const isCurrentCustomTarget =
        projectSelection.sourceId === "custom-project" &&
        projectSelection.projectRoot === normalizedProjectRoot;

      if (isCurrentCustomTarget) {
        await options?.onReloadCurrentProject?.();
      }

      setProjectSelection(resolveProjectSelectionFromRoot(normalizedProjectRoot));
      setRecentProjects((currentProjects) =>
        updateRecentProjectEntries(currentProjects, normalizedProjectRoot)
      );
    } catch (reason) {
      setCustomProjectError(
        reason instanceof Error ? reason.message : "未知初始化错误"
      );
      setCustomProjectErrorKind(null);
    } finally {
      setIsInitializingCustomProject(false);
    }
  }

  function pinRecentProject(projectRoot: string) {
    setRecentProjects((currentProjects) =>
      pinRecentProjectEntry(currentProjects, projectRoot)
    );
  }

  function unpinRecentProject(projectRoot: string) {
    setRecentProjects((currentProjects) =>
      unpinRecentProjectEntry(currentProjects, projectRoot)
    );
  }

  function removeRecentProject(projectRoot: string) {
    const nextProjects = removeRecentProjectEntry(recentProjects, projectRoot);

    setRecentProjects(nextProjects);
    if (dailyEntryProjectRoot === projectRoot) {
      setDailyEntryProjectRoot(null);
    }

    if (
      projectSelection.sourceId !== "custom-project" &&
      customProjectDraft.trim() === projectRoot
    ) {
      setCustomProjectDraft(nextProjects[0]?.projectRoot ?? "");
    }
  }

  function setDailyEntryProject(projectRoot: string) {
    const normalizedProjectRoot = projectRoot.trim();

    if (!normalizedProjectRoot) {
      return;
    }

    setDailyEntryProjectRoot(normalizedProjectRoot);
    setRecentProjects((currentProjects) =>
      updateRecentProjectEntries(currentProjects, normalizedProjectRoot)
    );
  }

  function clearDailyEntryProject() {
    setDailyEntryProjectRoot(null);
  }

  function updateEntryModePreference(value: EntryModePreference) {
    setEntryModePreference(value);
  }

  return {
    projectSelection,
    customProjectDraft,
    customProjectError,
    customProjectErrorKind,
    isConnectingCustomProject,
    isInitializingCustomProject,
    recentProjects,
    dailyEntryProjectRoot,
    entryModePreference,
    selectProjectSource,
    updateCustomProjectDraftValue,
    connectCustomProject,
    initializeCustomProject,
    pinRecentProject,
    unpinRecentProject,
    removeRecentProject,
    setDailyEntryProject,
    clearDailyEntryProject,
    updateEntryModePreference
  };
}
