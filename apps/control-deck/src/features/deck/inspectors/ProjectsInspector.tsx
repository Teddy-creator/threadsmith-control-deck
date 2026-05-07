import type { RefObject } from "react";
import type { ProjectLoadFailureKind } from "../projectConnection";
import {
  ProjectsCustomConnectSection,
  ProjectsDailyEntryCard,
  ProjectsEntryModeCard,
  ProjectsInspectorHeader,
  ProjectsInstallSurfaceCard,
  ProjectsLiveStatusCard,
  ProjectsOnboardingGuideCard,
  ProjectsRecentProjectsSection,
  ProjectsSourceSwitcherSection,
  ProjectsStartupGuideCard
} from "./projects";
import type { InstallSurfaceState, OnboardingGuide, RecentProjectCard, StartupGuide } from "./projects/types";

export interface ProjectsInspectorProps {
  customProjectErrorKind: ProjectLoadFailureKind | null;
  currentSourceIsAppHome: boolean;
  currentSourceIsCustomProject: boolean;
  currentProjectSourceId: string;
  dailyEntryProjectRoot: string | null | undefined;
  dailyEntryProjectIdentityName: string | null;
  effectiveEntryMode: "app-home" | "direct-project";
  error: string | null;
  customProjectError: string | null;
  freshnessText: string;
  lastSyncLabel?: string | null;
  installSurface?: InstallSurfaceState;
  isConnectingCustomProject: boolean;
  isDailyEntryCurrent: boolean;
  isInitializingCustomProject: boolean;
  normalizedCustomProjectDraft: string;
  onboardingAction: (() => void) | null;
  onboardingGuide: OnboardingGuide | null;
  primaryRecentProjectIdentityName: string | null;
  projectRoot: string;
  recentProjectCards: RecentProjectCard[];
  startupGuide: StartupGuide;
  supervisorSummary: string | null;
  currentPhaseLabel?: string | null;
  verificationTone?: string | null;
  verificationStatusLabel?: string | null;
  onClearDailyEntryProject?: () => void;
  onConnectCustomProject: (projectRoot: string) => void;
  onCustomProjectDraftChange: (value: string) => void;
  onInitializeCustomProject: (projectRoot: string) => void;
  onPinRecentProject: (projectRoot: string) => void;
  onRemoveRecentProject: (projectRoot: string) => void;
  onSelectProjectSource: (sourceId: "app-home" | "fresh-demo" | "stale-packet-demo" | "custom-project") => void;
  onSetDailyEntryProject?: (projectRoot: string) => void;
  onSetEntryModePreference?: (value: "app-home" | "direct-project") => void;
  onTriggerInstall?: () => Promise<void>;
  onUnpinRecentProject: (projectRoot: string) => void;
  customProjectDraft: string;
  customProjectInputRef: RefObject<HTMLInputElement | null>;
  openInspectorPanel: (view: "projects") => void;
}

export function ProjectsInspector({
  customProjectErrorKind,
  currentSourceIsAppHome,
  currentSourceIsCustomProject,
  currentProjectSourceId,
  dailyEntryProjectRoot,
  dailyEntryProjectIdentityName,
  effectiveEntryMode,
  error,
  customProjectError,
  freshnessText,
  lastSyncLabel,
  installSurface,
  isConnectingCustomProject,
  isDailyEntryCurrent,
  isInitializingCustomProject,
  normalizedCustomProjectDraft,
  onboardingAction,
  onboardingGuide,
  primaryRecentProjectIdentityName,
  projectRoot,
  recentProjectCards,
  startupGuide,
  supervisorSummary,
  currentPhaseLabel,
  verificationTone,
  verificationStatusLabel,
  onClearDailyEntryProject,
  onConnectCustomProject,
  onCustomProjectDraftChange,
  onInitializeCustomProject,
  onPinRecentProject,
  onRemoveRecentProject,
  onSelectProjectSource,
  onSetDailyEntryProject,
  onSetEntryModePreference,
  onTriggerInstall,
  onUnpinRecentProject,
  customProjectDraft,
  customProjectInputRef,
  openInspectorPanel
}: ProjectsInspectorProps) {
  return (
    <div className="space-y-8">
      <ProjectsInspectorHeader />

      <ProjectsStartupGuideCard startupGuide={startupGuide} />

      <ProjectsOnboardingGuideCard
        onboardingGuide={onboardingGuide}
        onboardingAction={onboardingAction}
      />

      <ProjectsEntryModeCard
        effectiveEntryMode={effectiveEntryMode}
        dailyEntryProjectIdentityName={dailyEntryProjectIdentityName}
        primaryRecentProjectIdentityName={primaryRecentProjectIdentityName}
        onSetEntryModePreference={onSetEntryModePreference}
      />

      <ProjectsInstallSurfaceCard
        installSurface={installSurface}
        onTriggerInstall={onTriggerInstall}
      />

      <ProjectsDailyEntryCard
        currentSourceIsCustomProject={currentSourceIsCustomProject}
        dailyEntryProjectRoot={dailyEntryProjectRoot}
        dailyEntryProjectIdentityName={dailyEntryProjectIdentityName}
        isDailyEntryCurrent={isDailyEntryCurrent}
        primaryRecentProjectIdentityName={primaryRecentProjectIdentityName}
        projectRoot={projectRoot}
        onConnectCustomProject={onConnectCustomProject}
        onClearDailyEntryProject={onClearDailyEntryProject}
        onSetDailyEntryProject={onSetDailyEntryProject}
      />

      <ProjectsLiveStatusCard
        currentSourceIsAppHome={currentSourceIsAppHome}
        currentSourceIsCustomProject={currentSourceIsCustomProject}
        supervisorSummary={supervisorSummary}
        currentPhaseLabel={currentPhaseLabel}
        verificationTone={verificationTone}
        verificationStatusLabel={verificationStatusLabel}
        freshnessText={freshnessText}
        lastSyncLabel={lastSyncLabel}
      />

      <ProjectsSourceSwitcherSection
        currentProjectSourceId={currentProjectSourceId}
        onSelectProjectSource={onSelectProjectSource}
        openInspectorPanel={openInspectorPanel}
      />

      <ProjectsCustomConnectSection
        customProjectDraft={customProjectDraft}
        customProjectError={customProjectError}
        customProjectErrorKind={customProjectErrorKind}
        customProjectInputRef={customProjectInputRef}
        error={error}
        isConnectingCustomProject={isConnectingCustomProject}
        isInitializingCustomProject={isInitializingCustomProject}
        normalizedCustomProjectDraft={normalizedCustomProjectDraft}
        onConnectCustomProject={onConnectCustomProject}
        onCustomProjectDraftChange={onCustomProjectDraftChange}
        onInitializeCustomProject={onInitializeCustomProject}
      />

      <ProjectsRecentProjectsSection
        recentProjectCards={recentProjectCards}
        onClearDailyEntryProject={onClearDailyEntryProject}
        onConnectCustomProject={onConnectCustomProject}
        onPinRecentProject={onPinRecentProject}
        onRemoveRecentProject={onRemoveRecentProject}
        onSetDailyEntryProject={onSetDailyEntryProject}
        onUnpinRecentProject={onUnpinRecentProject}
      />
    </div>
  );
}
