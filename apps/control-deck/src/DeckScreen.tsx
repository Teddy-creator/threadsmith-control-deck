import { useEffect, useRef, useState } from "react";
import type { ProviderRouting, WorkflowTransitionId } from "@threadsmith/domain";
import {
  describeRouteSupport,
  type ActionRecommendation,
  type RuntimeActionId,
  type SupervisorState
} from "@threadsmith/runtime";
import type { ActionExecutionOptions } from "./features/actions/ActionPreviewPanel";
import { ActionPreviewPanel } from "./features/actions/ActionPreviewPanel";
import type { EntryModePreference } from "./features/deck/entryModePreference";
import {
  buildHomepageCommandCardModel,
  buildHomepageOverviewModel,
  buildLatestBridgeModel,
  buildLatestPhaseRunModel,
  buildLatestRunModel,
  formatTruthWritebackStatus,
  pickTruthWritebackTone
} from "./features/deck/deckViewModels";
import { HomepageOverviewGrid } from "./features/deck/HomepageOverviewGrid";
import { ActionInspector } from "./features/deck/inspectors/ActionInspector";
import { AcceptanceInspector } from "./features/deck/inspectors/AcceptanceInspector";
import { EventsInspector } from "./features/deck/inspectors/EventsInspector";
import { ObjectsInspector } from "./features/deck/inspectors/ObjectsInspector";
import { ProjectInspector } from "./features/deck/inspectors/ProjectInspector";
import { ProjectsInspector } from "./features/deck/inspectors/ProjectsInspector";
import {
  buildAppHomeActionInspectorModel,
  buildProjectActionInspectorModel
} from "./features/deck/inspectors/action";
import { buildAcceptanceInspectorModel } from "./features/deck/inspectors/acceptance";
import { buildEventsInspectorModel } from "./features/deck/inspectors/events";
import { buildObjectsInspectorModel } from "./features/deck/inspectors/objects";
import { buildProjectInspectorViewModel } from "./features/deck/inspectors/project";
import { buildProjectsInspectorViewModel } from "./features/deck/inspectors/projects";
import { compactText } from "./features/deck/inspectors/shared";
import type { InstallSurfaceState } from "./features/deck/installSurface";
import {
  buildProjectOnboardingGuide
} from "./features/deck/projectOnboarding";
import type { ProjectSourceId } from "./features/deck/projectRoots";
import type { RecentProjectEntry } from "./features/deck/recentProjects";
import type { ProjectLoadFailureKind } from "./features/deck/projectConnection";
import { DeckInspectorPanel } from "./features/deck/screen/DeckInspectorPanel";
import { DeckTopBar } from "./features/deck/screen/DeckTopBar";
import {
  HomepageCommandCard,
  type HomepageEntryAction
} from "./features/deck/screen/HomepageCommandCard";
import {
  buildDeckInspectorMeta,
  type InspectorView
} from "./features/deck/screen/inspectorMeta";
import { NavigationRail } from "./features/deck/screen/NavigationRail";
import { useProviderRoutingDraft } from "./features/deck/useProviderRoutingDraft";
import {
  formatDoneWhenStatus,
  formatGateReason,
  formatHealthLevel,
  formatReadinessStatus,
  formatThreadHealth
} from "./features/display/labels";
import { buildProjectIdentity } from "./features/display/projectIdentity";
import {
  formatHeadlineProject,
  formatHeadlineSupport
} from "./features/deck/selectors";

type InspectorPanelMode = "closed" | "drawer" | "focused";
const AUTO_FOCUS_INSPECTOR_VIEWPORT = 1280;
const EVENTS_TIMELINE_PAGE_SIZE = 3;

export interface DeckScreenProps {
  projectRoot: string;
  currentProjectSourceId: ProjectSourceId;
  currentProjectSourceLabel: string;
  dailyEntryProjectRoot?: string | null;
  entryModePreference?: EntryModePreference | null;
  customProjectDraft: string;
  customProjectError: string | null;
  customProjectErrorKind: ProjectLoadFailureKind | null;
  isConnectingCustomProject: boolean;
  isInitializingCustomProject: boolean;
  recentProjects: RecentProjectEntry[];
  installSurface?: InstallSurfaceState;
  supervisorState: SupervisorState | null;
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  errorKind: ProjectLoadFailureKind | null;
  lastLoadedAt?: number | null;
  actionHistoryLength: number;
  onSelectProjectSource: (sourceId: ProjectSourceId) => void;
  onCustomProjectDraftChange: (value: string) => void;
  onConnectCustomProject: (projectRoot: string) => void;
  onInitializeCustomProject: (projectRoot: string) => void;
  onPinRecentProject: (projectRoot: string) => void;
  onUnpinRecentProject: (projectRoot: string) => void;
  onRemoveRecentProject: (projectRoot: string) => void;
  onSetDailyEntryProject?: (projectRoot: string) => void;
  onClearDailyEntryProject?: () => void;
  onSetEntryModePreference?: (value: EntryModePreference) => void;
  onTriggerInstall?: () => Promise<void>;
  onReloadProject?: () => Promise<void>;
  onRunAction: (actionId: RuntimeActionId, options?: ActionExecutionOptions) => Promise<void>;
  onStartRun?: () => Promise<void>;
  onApplyTransition: (transitionId: WorkflowTransitionId) => Promise<void>;
  onSaveProviderRouting?: (value: ProviderRouting) => Promise<ProviderRouting>;
}

function usesAutomationBridge(action: ActionRecommendation | null | undefined) {
  return action?.actionId === "advance-phase";
}

export function DeckScreen({
  projectRoot,
  currentProjectSourceId,
  currentProjectSourceLabel,
  dailyEntryProjectRoot = null,
  entryModePreference = null,
  customProjectDraft,
  customProjectError,
  customProjectErrorKind,
  isConnectingCustomProject,
  isInitializingCustomProject,
  recentProjects,
  installSurface,
  supervisorState,
  loading,
  refreshing = false,
  error,
  errorKind,
  lastLoadedAt = null,
  actionHistoryLength,
  onSelectProjectSource,
  onCustomProjectDraftChange,
  onConnectCustomProject,
  onInitializeCustomProject,
  onPinRecentProject,
  onUnpinRecentProject,
  onRemoveRecentProject,
  onSetDailyEntryProject,
  onClearDailyEntryProject,
  onSetEntryModePreference,
  onTriggerInstall,
  onReloadProject,
  onRunAction,
  onStartRun,
  onApplyTransition,
  onSaveProviderRouting
}: DeckScreenProps) {
  const customProjectInputRef = useRef<HTMLInputElement | null>(null);
  const [inspectorView, setInspectorView] = useState<InspectorView>("project");
  const [inspectorPanelMode, setInspectorPanelMode] = useState<InspectorPanelMode>("closed");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? AUTO_FOCUS_INSPECTOR_VIEWPORT : window.innerWidth
  );
  const [previewAction, setPreviewAction] = useState<ActionRecommendation | null>(null);
  const [homepageCopyState, setHomepageCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [eventsTimelineVisibleCount, setEventsTimelineVisibleCount] = useState(
    EVENTS_TIMELINE_PAGE_SIZE
  );
  const [executionMode, setExecutionMode] = useState<"action" | "direct-run" | null>(null);
  const [applyingTransitionId, setApplyingTransitionId] =
    useState<WorkflowTransitionId | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const currentSourceIsAppHome = currentProjectSourceId === "app-home";
  const effectiveEntryMode = entryModePreference ?? "direct-project";
  const currentProjectIdentity = buildProjectIdentity(
    projectRoot,
    "当前项目",
    currentSourceIsAppHome ? "Threadsmith 前门" : undefined
  );
  const normalizedCustomProjectDraft = customProjectDraft.trim();
  const currentSourceIsCustomProject = currentProjectSourceId === "custom-project";
  const primaryRecentProject = recentProjects[0] ?? null;
  const primaryRecentProjectIdentity = primaryRecentProject
    ? buildProjectIdentity(primaryRecentProject.projectRoot, primaryRecentProject.projectRoot)
    : null;
  const recoveryRecentProject =
    currentSourceIsCustomProject &&
    primaryRecentProject &&
    primaryRecentProject.projectRoot === normalizedCustomProjectDraft
      ? null
      : primaryRecentProject;
  const recoveryRecentProjectIdentity = recoveryRecentProject
    ? buildProjectIdentity(recoveryRecentProject.projectRoot, recoveryRecentProject.projectRoot)
    : null;
  const dailyEntryProjectIdentity = dailyEntryProjectRoot
    ? buildProjectIdentity(dailyEntryProjectRoot, dailyEntryProjectRoot)
    : null;
  const isDailyEntryCurrent =
    currentSourceIsCustomProject && dailyEntryProjectRoot === projectRoot;
  const projectState = supervisorState?.projectState ?? null;
  const projectStatus = projectState?.projectStatus ?? null;
  const hasProjectConnectionIssue = !supervisorState && Boolean(customProjectError || error);
  const onboardingGuide = buildProjectOnboardingGuide({
    currentSourceIsAppHome,
    currentSourceIsCustomProject,
    hasRecentProject: Boolean(primaryRecentProject),
    recentProjectName: primaryRecentProjectIdentity?.name ?? null,
    hasRecoveryProject: Boolean(recoveryRecentProject),
    recoveryProjectName: recoveryRecentProjectIdentity?.name ?? null,
    currentProjectName: currentProjectIdentity.name,
    normalizedCustomProjectDraft,
    dailyEntryProjectRoot,
    isCurrentProjectDailyEntry: isDailyEntryCurrent,
    hasSupervisorState: Boolean(supervisorState),
    hasProjectConnectionIssue,
    customProjectErrorKind
  });
  const activeInspector = hasProjectConnectionIssue ? "projects" : inspectorView;
  const resolvedInspectorPanelMode = hasProjectConnectionIssue ? "drawer" : inspectorPanelMode;
  const inspectorPanelVisible = resolvedInspectorPanelMode !== "closed";
  const inspectorPanelFocused = resolvedInspectorPanelMode === "focused";
  const shouldAutoFocusInspector = viewportWidth < AUTO_FOCUS_INSPECTOR_VIEWPORT;
  const projectButtonActive = inspectorPanelVisible && activeInspector === "project";
  const sourceButtonActive = inspectorPanelVisible && activeInspector === "projects";
  const committedProviderRouting = supervisorState?.providerRouting ?? null;
  const {
    providerRoutingDraft,
    providerRoutingDirty,
    providerRoutingSaveState,
    providerRoutingError,
    updateProviderRoutingRole,
    updateConductorSurface,
    resetProviderRoutingDraft,
    saveProviderRouting
  } = useProviderRoutingDraft({
    committedProviderRouting,
    onSaveProviderRouting
  });

  const headline = supervisorState
    ? formatHeadlineProject(
        supervisorState.projectState.projectBrief.projectGoal,
        currentProjectSourceId === "custom-project" ? currentProjectIdentity.name : undefined
      )
    : loading
      ? "正在准备当前项目"
      : currentProjectIdentity.name;

  const headlineSupport = supervisorState
    ? formatHeadlineSupport(
        supervisorState.projectState.projectBrief.projectGoal,
        currentProjectSourceId === "custom-project" ? currentProjectIdentity.name : undefined
      )
    : null;

  const sequence = supervisorState
    ? [supervisorState.nextBestStep.primary, ...supervisorState.nextBestStep.alternatives]
    : [];

  const projectSummary = projectStatus?.projectStatusSummary
    ?? headlineSupport
    ?? projectState?.projectBrief.currentVersionScope
    ?? null;

  const projectTrack = projectStatus?.currentTrack
    ?? projectState?.projectBrief.currentVersionScope
    ?? null;

  const projectOverallState = projectStatus?.overallState ?? null;

  const reminderItems = supervisorState
    ? (
        supervisorState.gateSignal.reasons.length > 0
          ? supervisorState.gateSignal.reasons.map((reason) => formatGateReason(reason))
          : (
              projectStatus?.topRisks?.length
                ? projectStatus.topRisks
                : supervisorState.health.topRisks.length > 0
                  ? supervisorState.health.topRisks
                  : [
                      supervisorState.latestContinuationState.freshnessDetail
                        ?? supervisorState.latestContinuationState.detail
                    ]
            )
      )
        .filter(Boolean)
        .map((item) => compactText(item, 88))
    : [];

  const priorityPreview = projectState?.projectBrief.priorityOrder.slice(0, 2) ?? [];
  const topProjectRisks = projectStatus?.topRisks.length
    ? projectStatus.topRisks
    : reminderItems;
  const activeExecutionItems = projectState?.activeWork.items.length
    ? projectState.activeWork.items.slice(0, 2)
    : [
        {
          role: "planner",
          status: "idle",
          taskSummary: "当前没有正在推进的工作",
          requiresUserDecision: false
        }
      ];
  const executionPreview = activeExecutionItems[0] ?? null;
  const remainingExecutionCount = Math.max((projectState?.activeWork.items.length ?? 0) - 1, 0);
  const acceptanceProgressLabel = supervisorState
    ? `已通过 ${supervisorState.acceptanceSummary.completedCount} / ${supervisorState.acceptanceSummary.totalCount}`
    : "已通过 0 / 0";

  const homepageTitle = projectStatus?.projectLabel ?? currentProjectIdentity.name;
  const homepageSubtitle = compactText(
    currentSourceIsAppHome
      ? "这是产品前门，只负责选择入口；进入真实项目后才显示该项目的实时 truth。"
      : projectTrack ?? "在单屏 control deck 与 action-driven workflow loop 基础上，正式进入 self-hosted 产品开发",
    90
  );
  const projectSurfaceLabel = currentSourceIsAppHome
    ? "入口快照"
    : currentSourceIsCustomProject
      ? "实时项目"
      : "示例来源";
  const projectSurfaceTone = currentSourceIsAppHome
    ? "blue"
    : currentSourceIsCustomProject
      ? "green"
      : "zinc";
  const primaryAction = supervisorState?.nextBestStep.primary ?? null;
  const primaryActionUsesAutomationBridge = usesAutomationBridge(primaryAction);
  const gateTone = supervisorState
    ? supervisorState.gateSignal.shouldSurfaceDeck
      ? "amber"
      : "green"
    : loading
      ? "blue"
      : "red";

  const gateLabel = supervisorState
    ? supervisorState.gateSignal.shouldSurfaceDeck
      ? `需处理 ${supervisorState.gateSignal.reasons.length}`
      : "已开启"
    : loading
      ? "加载中"
      : "不可用";
  const latestPhaseRunModel = buildLatestPhaseRunModel(supervisorState);
  const latestRunModel = buildLatestRunModel(supervisorState);
  const commandBridge = supervisorState?.commandBridge ?? null;
  const latestBridgeModel = buildLatestBridgeModel(commandBridge);
  const lastSyncLabel = (() => {
    if (loading && !lastLoadedAt) {
      return "同步中";
    }

    if (!lastLoadedAt) {
      return "未同步";
    }

    return `已同步 ${new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(lastLoadedAt)}`;
  })();
  const homepageRoadmapMilestones = projectState?.projectRoadmap.milestones ?? [];
  const homepageWorkflowTransitions = supervisorState?.workflowTransitions ?? [];
  const homepageCommandCardModel = buildHomepageCommandCardModel({
    currentSourceIsAppHome,
    supervisorState,
    dailyEntryProjectName: dailyEntryProjectIdentity?.name ?? null,
    dailyEntryProjectRoot,
    primaryRecentProjectName: primaryRecentProjectIdentity?.name ?? null,
    primaryRecentProjectRoot: primaryRecentProject?.projectRoot ?? null,
    requiresUserDecision: executionPreview?.requiresUserDecision ?? false,
    remainingExecutionCount,
    homepageCopyState,
    transitionError,
    workflowTransitionCount: homepageWorkflowTransitions.length
  });
  const homepageOverviewModel = buildHomepageOverviewModel({
    homepageTitle,
    projectState,
    projectOverallState,
    topProjectRisks,
    supervisorState,
    latestPhaseRunModel,
    latestRunModel,
    latestBridgeModel
  });

  function openInspectorPanel(view: InspectorView) {
    setInspectorView(view);
    setInspectorPanelMode(shouldAutoFocusInspector ? "focused" : "drawer");
  }

  function handleConnectNewProjectEntry() {
    openInspectorPanel("projects");
    onSelectProjectSource("custom-project");
  }

  function runFrontDoorEntryAction(action: HomepageEntryAction) {
    if (action.id === "connect-project") {
      handleConnectNewProjectEntry();
      return;
    }

    if (action.projectRoot) {
      onConnectCustomProject(action.projectRoot);
    }
  }

  function toggleInspectorPanel(view: InspectorView) {
    if (!hasProjectConnectionIssue && inspectorPanelVisible && activeInspector === view) {
      setInspectorPanelMode("closed");
      return;
    }

    openInspectorPanel(view);
  }

  function closeInspectorPanel() {
    if (hasProjectConnectionIssue) {
      return;
    }

    setInspectorPanelMode("closed");
  }

  function focusInspectorPanel() {
    setInspectorPanelMode("focused");
  }

  function collapseInspectorPanel() {
    setInspectorPanelMode("drawer");
  }

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!inspectorPanelVisible) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (resolvedInspectorPanelMode === "focused") {
        setInspectorPanelMode("drawer");
        return;
      }

      if (!hasProjectConnectionIssue) {
        setInspectorPanelMode("closed");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasProjectConnectionIssue, inspectorPanelVisible, resolvedInspectorPanelMode]);

  useEffect(() => {
    if (
      hasProjectConnectionIssue ||
      !inspectorPanelVisible ||
      inspectorPanelFocused ||
      !shouldAutoFocusInspector
    ) {
      return;
    }

    setInspectorPanelMode("focused");
  }, [
    hasProjectConnectionIssue,
    inspectorPanelFocused,
    inspectorPanelVisible,
    shouldAutoFocusInspector
  ]);

  useEffect(() => {
    setEventsTimelineVisibleCount(EVENTS_TIMELINE_PAGE_SIZE);
  }, [activeInspector, supervisorState?.recentEvents.length]);

  useEffect(() => {
    if (activeInspector !== "acceptance") {
      setTransitionError(null);
    }
  }, [activeInspector]);

  async function handleConfirm(
    action: ActionRecommendation,
    options?: ActionExecutionOptions
  ) {
    setPreviewAction(null);

    if (action.actionId === "open-current-phase") {
      openInspectorPanel("objects");
      return;
    }

    if (executionMode) {
      return;
    }

    setExecutionMode("action");
    try {
      await onRunAction(action.actionId, options);
    } finally {
      setExecutionMode(null);
    }
  }

  async function handleDirectRun() {
    setPreviewAction(null);

    if (executionMode) {
      return;
    }

    setExecutionMode("direct-run");
    try {
      if (onStartRun) {
        await onStartRun();
      }
    } finally {
      setExecutionMode(null);
    }
  }

  function triggerAction(action: ActionRecommendation) {
    setPreviewAction(action);
  }

  function openPrimaryActionPreview() {
    if (!primaryAction) {
      return;
    }

    triggerAction(primaryAction);
  }

  function openContextActionPreview(
    actionId: "sync-context" | "run-hygiene" | "create-handoff" | null
  ) {
    if (!actionId || !supervisorState) {
      return;
    }

    const matchingAction = [
      supervisorState.nextBestStep.primary,
      ...supervisorState.nextBestStep.alternatives
    ].find((action) => action.actionId === actionId);

    if (matchingAction) {
      triggerAction(matchingAction);
      return;
    }

    triggerAction({
      actionId,
      label:
        actionId === "create-handoff"
          ? "创建 handoff"
          : actionId === "sync-context"
            ? "刷新 Context Packet"
            : "运行 context hygiene",
      reason: supervisorState.contextRecovery.detail,
      expectedRoles: ["hygiene"],
      stopCondition:
        actionId === "create-handoff"
          ? "已经存在一个可继续的 handoff packet。"
          : actionId === "sync-context"
            ? "Context Packet 与当前 committed truth 重新一致。"
            : "当前 truth 已被重新锚定，继续前的 context 风险已降低。"
    });
  }

  async function handleReloadProject() {
    if (!onReloadProject || refreshing) {
      return;
    }

    await onReloadProject();
  }

  async function copyHomepageConductorPrompt() {
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("clipboard unavailable");
      }

      await navigator.clipboard.writeText(homepageCommandCardModel.conductorPrompt);
      setHomepageCopyState("copied");
    } catch {
      setHomepageCopyState("failed");
    } finally {
      window.setTimeout(() => {
        setHomepageCopyState("idle");
      }, 1800);
    }
  }

  async function handleApplyWorkflowTransition(transitionId: WorkflowTransitionId) {
    if (applyingTransitionId) {
      return;
    }

    setTransitionError(null);
    setApplyingTransitionId(transitionId);

    try {
      await onApplyTransition(transitionId);
    } catch (reason) {
      setTransitionError(
        reason instanceof Error ? reason.message : "应用流程控制动作失败"
      );
    } finally {
      setApplyingTransitionId(null);
    }
  }

  function renderProjectInspector() {
    if (!supervisorState || !projectState) {
      return (
        <div className="space-y-8">
          <div className="border-b border-zinc-800/60 pb-6">
            <h2 className="text-xl text-zinc-50">项目总况</h2>
            <p className="mt-2 text-sm text-zinc-500">连接成功后，这里会展示当前项目的真实细节。</p>
          </div>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 text-sm text-zinc-400">
            {loading ? "Threadsmith 正在同步状态…" : error ?? customProjectError ?? "当前项目尚未就绪。"}
          </div>
        </div>
      );
    }

    const projectInspectorModel = buildProjectInspectorViewModel({
      projectState,
      projectSummary,
      headline,
      projectOverallState,
      homepageRoadmapVersion: homepageOverviewModel.roadmapVersion,
      homepageRoadmapProgressLabel: homepageOverviewModel.roadmapProgressLabel,
      homepageRoadmapGoal: homepageOverviewModel.goal,
      homepageRoadmapLatestDone: homepageOverviewModel.latestDone,
      homepageRoadmapCurrent: homepageOverviewModel.currentMilestone,
      homepageRoadmapNext: homepageOverviewModel.nextMilestone,
      homepageRoadmapMilestones,
      providerRoutingDraft,
      committedProviderRouting,
      currentSourceIsAppHome,
      supervisorState,
      latestBridgeModel,
      providerRoutingSaveState,
      providerRoutingDirty,
      providerRoutingError
    });

    return (
      <ProjectInspector
        projectState={projectState}
        {...projectInspectorModel}
        onUpdateConductorSurface={updateConductorSurface}
        onUpdateProviderRoutingRole={updateProviderRoutingRole}
        onSaveProviderRouting={() => {
          void saveProviderRouting();
        }}
        onResetProviderRouting={resetProviderRoutingDraft}
      />
    );
  }

  function renderActionInspector() {
    if (!supervisorState) {
      return renderProjectInspector();
    }

    if (currentSourceIsAppHome) {
      const appHomeActionInspectorModel = buildAppHomeActionInspectorModel({
        homepageActionSummary: homepageCommandCardModel.actionSummary,
        homepageStopCondition: homepageCommandCardModel.stopCondition,
        homepageConversationPath: homepageCommandCardModel.conversationPath,
        dailyEntryProjectIdentityName: dailyEntryProjectIdentity?.name ?? null,
        dailyEntryProjectRoot,
        primaryRecentProjectIdentityName: primaryRecentProjectIdentity?.name ?? null,
        primaryRecentProjectRoot: primaryRecentProject?.projectRoot ?? null,
        onConnectCustomProject,
        onConnectNewProject: handleConnectNewProjectEntry
      });

      return (
        <ActionInspector
          mode="app-home"
          {...appHomeActionInspectorModel}
          openProjectWorkbench={() => openInspectorPanel("project")}
        />
      );
    }

    const action = supervisorState.nextBestStep.primary;
    const projectActionInspectorModel = buildProjectActionInspectorModel({
      action,
      commandBridge,
      projectRoot,
      executionMode,
      primaryActionUsesAutomationBridge,
      activeExecutionItems,
      sequence
    });

    return (
      <ActionInspector
        mode="project"
        {...projectActionInspectorModel}
        openPrimaryActionPreview={openPrimaryActionPreview}
        openProjectWorkbench={() => openInspectorPanel("project")}
      />
    );
  }

  function renderObjectsInspector() {
    if (!supervisorState || !projectState) {
      return renderProjectInspector();
    }

    const objectsInspectorModel = buildObjectsInspectorModel({
      projectState,
      supervisorState,
      latestBridgeModel,
      executionPreviewTaskSummary: executionPreview?.taskSummary ?? null,
      acceptanceProgressLabel
    });

    return (
      <ObjectsInspector
        projectState={projectState}
        {...objectsInspectorModel}
        onOpenContextAction={openContextActionPreview}
      />
    );
  }

  function renderEventsInspector() {
    if (!supervisorState) {
      return renderProjectInspector();
    }

    const visibleTimelineCount = Math.min(
      eventsTimelineVisibleCount,
      supervisorState.recentEvents.length
    );
    const hasMoreTimelineEvents = visibleTimelineCount < supervisorState.recentEvents.length;
    const eventsInspectorModel = buildEventsInspectorModel({
      supervisorState,
      latestPhaseRunModel,
      latestRunModel,
      latestBridgeModel,
      visibleTimelineCount,
      hasMoreTimelineEvents,
      eventsTimelinePageSize: EVENTS_TIMELINE_PAGE_SIZE
    });

    return (
      <EventsInspector
        {...eventsInspectorModel}
        onToggleTimeline={() => {
          if (hasMoreTimelineEvents) {
            setEventsTimelineVisibleCount((current) =>
              Math.min(current + EVENTS_TIMELINE_PAGE_SIZE, supervisorState.recentEvents.length)
            );
            return;
          }

          setEventsTimelineVisibleCount(EVENTS_TIMELINE_PAGE_SIZE);
        }}
      />
    );
  }

  function renderProjectsInspector() {
    const projectsInspectorModel = buildProjectsInspectorViewModel({
      currentSourceIsAppHome,
      currentSourceIsCustomProject,
      currentProjectSourceId,
      currentProjectSourceLabel,
      currentProjectIdentityName: currentProjectIdentity.name,
      dailyEntryProjectRoot,
      dailyEntryProjectIdentityName: dailyEntryProjectIdentity?.name ?? null,
      effectiveEntryMode,
      customProjectErrorKind,
      hasProjectConnectionIssue,
      normalizedCustomProjectDraft,
      projectRoot,
      isDailyEntryCurrent,
      supervisorState,
      primaryRecentProject,
      onConnectCustomProject,
      recentProjects
    });
    const onboardingAction = (() => {
      if (!onboardingGuide?.actionId) {
        return null;
      }

      switch (onboardingGuide.actionId) {
        case "focus-connect":
          return () => {
            customProjectInputRef.current?.focus();
            customProjectInputRef.current?.select();
          };
        case "initialize":
          return () => {
            const targetRoot = normalizedCustomProjectDraft || projectRoot;
            if (targetRoot.length > 0) {
              onInitializeCustomProject(targetRoot);
            }
          };
        case "set-default":
          return onSetDailyEntryProject && currentSourceIsCustomProject
            ? () => onSetDailyEntryProject(projectRoot)
            : null;
        case "open-recent":
          return recoveryRecentProject
            ? () => onConnectCustomProject(recoveryRecentProject.projectRoot)
            : null;
        default:
          return null;
      }
    })();

    return (
      <ProjectsInspector
        customProjectErrorKind={customProjectErrorKind}
        currentSourceIsAppHome={currentSourceIsAppHome}
        currentSourceIsCustomProject={currentSourceIsCustomProject}
        currentProjectSourceId={currentProjectSourceId}
        dailyEntryProjectRoot={dailyEntryProjectRoot}
        dailyEntryProjectIdentityName={dailyEntryProjectIdentity?.name ?? null}
        effectiveEntryMode={effectiveEntryMode}
        error={error}
        customProjectError={customProjectError}
        freshnessText={projectsInspectorModel.freshnessText}
        lastSyncLabel={lastSyncLabel}
        installSurface={installSurface}
        isConnectingCustomProject={isConnectingCustomProject}
        isDailyEntryCurrent={isDailyEntryCurrent}
        isInitializingCustomProject={isInitializingCustomProject}
        normalizedCustomProjectDraft={normalizedCustomProjectDraft}
        onboardingAction={onboardingAction}
        onboardingGuide={onboardingGuide}
        primaryRecentProjectIdentityName={primaryRecentProjectIdentity?.name ?? null}
        projectRoot={projectRoot}
        recentProjectCards={projectsInspectorModel.recentProjectCards}
        startupGuide={projectsInspectorModel.startupGuide}
        supervisorSummary={projectsInspectorModel.supervisorSummary}
        currentPhaseLabel={projectsInspectorModel.currentPhaseLabel}
        verificationTone={projectsInspectorModel.verificationTone}
        verificationStatusLabel={projectsInspectorModel.verificationStatusLabel}
        onClearDailyEntryProject={onClearDailyEntryProject}
        onConnectCustomProject={onConnectCustomProject}
        onCustomProjectDraftChange={onCustomProjectDraftChange}
        onInitializeCustomProject={onInitializeCustomProject}
        onPinRecentProject={onPinRecentProject}
        onRemoveRecentProject={onRemoveRecentProject}
        onSelectProjectSource={onSelectProjectSource}
        onSetDailyEntryProject={onSetDailyEntryProject}
        onSetEntryModePreference={onSetEntryModePreference}
        onTriggerInstall={onTriggerInstall}
        onUnpinRecentProject={onUnpinRecentProject}
        customProjectDraft={customProjectDraft}
        customProjectInputRef={customProjectInputRef}
        openInspectorPanel={openInspectorPanel}
      />
    );
  }

  function renderAcceptanceInspector() {
    if (!supervisorState || !projectState) {
      return renderProjectInspector();
    }

    const { acceptanceState } = projectState;
    const acceptanceInspectorModel = buildAcceptanceInspectorModel({
      projectState,
      supervisorState,
      latestBridgeModel
    });

    return (
      <AcceptanceInspector
        projectState={projectState}
        acceptanceState={acceptanceState}
        {...acceptanceInspectorModel}
        workflowTransitions={supervisorState.workflowTransitions}
        applyingTransitionId={applyingTransitionId}
        transitionError={transitionError}
        onApplyWorkflowTransition={(transitionId) => {
          void handleApplyWorkflowTransition(transitionId);
        }}
      />
    );
  }

  function renderInspector() {
    switch (activeInspector) {
      case "action":
        return renderActionInspector();
      case "objects":
        return renderObjectsInspector();
      case "events":
        return renderEventsInspector();
      case "projects":
        return renderProjectsInspector();
      case "acceptance":
        return renderAcceptanceInspector();
      default:
        return renderProjectInspector();
    }
  }

  const inspectorMeta = buildDeckInspectorMeta({
    activeInspector,
    projectPhaseName: projectState?.currentPhase.phaseName ?? null,
    currentProjectSourceLabel,
    currentProjectIdentityName: currentProjectIdentity.name,
    supervisorState,
    latestRunModel
  });

  return (
    <main className="dark flex h-screen overflow-hidden overscroll-none bg-[#0a0a0b] text-zinc-100">
      <NavigationRail
        projectActive={projectButtonActive}
        objectsActive={inspectorPanelVisible && activeInspector === "objects"}
        eventsActive={inspectorPanelVisible && activeInspector === "events"}
        acceptanceActive={inspectorPanelVisible && activeInspector === "acceptance"}
        onToggleProject={() => toggleInspectorPanel("project")}
        onToggleObjects={() => toggleInspectorPanel("objects")}
        onToggleEvents={() => toggleInspectorPanel("events")}
        onToggleAcceptance={() => toggleInspectorPanel("acceptance")}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <DeckTopBar
          sourceButtonActive={sourceButtonActive}
          currentProjectSourceLabel={currentProjectSourceLabel}
          currentProjectIdentityName={currentProjectIdentity.name}
          projectRoot={projectRoot}
          projectSurfaceLabel={projectSurfaceLabel}
          projectSurfaceTone={projectSurfaceTone}
          actionHistoryLength={actionHistoryLength}
          gateTone={gateTone}
          gateLabel={gateLabel}
          refreshing={refreshing}
          lastSyncLabel={lastSyncLabel}
          onToggleSources={() => toggleInspectorPanel("projects")}
          onReloadProject={() => {
            void handleReloadProject();
          }}
        />

        <div className="flex flex-1 overflow-hidden">
          {!inspectorPanelFocused ? (
            <div className="flex-1 overflow-y-auto overscroll-none bg-[#0a0a0b] px-8 py-8">
              {supervisorState ? (
                <>
                  <div className="mb-10">
                    <h1 className="mb-2 text-3xl tracking-tight text-zinc-50">{homepageTitle}</h1>
                    <p className="text-zinc-400">{homepageSubtitle}</p>
                  </div>

                  <HomepageCommandCard
                    {...homepageCommandCardModel}
                    onRunFrontDoorEntryAction={runFrontDoorEntryAction}
                    onCopyConductorPrompt={() => {
                      void copyHomepageConductorPrompt();
                    }}
                    onOpenActionInspector={() => openInspectorPanel("action")}
                  />

                  <HomepageOverviewGrid {...homepageOverviewModel} />
                </>
              ) : (
                <div className="rounded-[24px] border border-zinc-800/60 bg-zinc-900/40 p-7 text-sm leading-7 text-zinc-400">
                  <div className="mb-2 text-base text-zinc-100">
                    {error || customProjectError ? "工作区不可用" : loading ? "正在准备当前项目" : "当前还没有可展示的动作"}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {error || customProjectError
                      ? "无法加载项目状态"
                      : "连接真实项目后，这里会出现 Threadsmith 当前最值得推进的一步。"}
                  </div>
                  {error || customProjectError ? (
                    <div className="mt-3 text-sm text-red-300">{customProjectError ?? error}</div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          <DeckInspectorPanel
            visible={inspectorPanelVisible}
            focused={inspectorPanelFocused}
            title={inspectorMeta.title}
            description={inspectorMeta.description}
            objectLabel={inspectorMeta.objectLabel}
            roleLabel={inspectorMeta.roleLabel}
            threadLabel={inspectorMeta.threadLabel}
            providerLabel={inspectorMeta.providerLabel}
            icon={inspectorMeta.icon}
            surfaceClassName={inspectorMeta.surfaceClassName}
            onToggleFocus={
              inspectorPanelFocused ? collapseInspectorPanel : focusInspectorPanel
            }
            onClose={closeInspectorPanel}
          >
            {renderInspector()}
          </DeckInspectorPanel>
        </div>

        {supervisorState ? (
          <ActionPreviewPanel
            action={previewAction}
            projectRoot={projectRoot}
            commandBridge={supervisorState.commandBridge}
            open={previewAction !== null}
            executionMode={executionMode}
            resolvedContinuationBehavior={
              supervisorState.projectState.preferences.resolved.continuationBehavior
            }
            resolvedContinuationSource={
              supervisorState.projectState.preferences.resolved.continuationBehaviorSource
            }
            onCancel={() => setPreviewAction(null)}
            onDirectRun={handleDirectRun}
            onConfirm={handleConfirm}
          />
        ) : null}
      </div>
    </main>
  );
}
