import { DeckScreen } from "./DeckScreen";
import { useProjectBridge } from "./features/deck/useProjectBridge";
import { useControlDeckSessionState } from "./features/deck/useControlDeckSessionState";
import { useInstallSurfaceState } from "./features/deck/useInstallSurfaceState";

export { DeckScreen } from "./DeckScreen";

export function App() {
  const session = useControlDeckSessionState();
  const bridge = useProjectBridge(session.projectSelection.projectRoot);
  const { installSurface, triggerInstall } = useInstallSurfaceState();

  return (
    <DeckScreen
      projectRoot={bridge.projectRoot}
      currentProjectSourceId={session.projectSelection.sourceId}
      currentProjectSourceLabel={session.projectSelection.label}
      dailyEntryProjectRoot={session.dailyEntryProjectRoot}
      entryModePreference={session.entryModePreference}
      customProjectDraft={session.customProjectDraft}
      customProjectError={session.customProjectError}
      customProjectErrorKind={session.customProjectErrorKind}
      isConnectingCustomProject={session.isConnectingCustomProject}
      isInitializingCustomProject={session.isInitializingCustomProject}
      recentProjects={session.recentProjects}
      installSurface={installSurface}
      supervisorState={bridge.supervisorState}
      loading={bridge.loading}
      refreshing={bridge.refreshing}
      error={bridge.error}
      errorKind={bridge.errorKind}
      lastLoadedAt={bridge.lastLoadedAt}
      actionHistoryLength={bridge.actionHistoryLength}
      onSelectProjectSource={session.selectProjectSource}
      onCustomProjectDraftChange={session.updateCustomProjectDraftValue}
      onConnectCustomProject={session.connectCustomProject}
      onInitializeCustomProject={(projectRoot) =>
        session.initializeCustomProject(projectRoot, {
          onReloadCurrentProject: bridge.reload
        })
      }
      onPinRecentProject={session.pinRecentProject}
      onUnpinRecentProject={session.unpinRecentProject}
      onRemoveRecentProject={session.removeRecentProject}
      onSetDailyEntryProject={session.setDailyEntryProject}
      onClearDailyEntryProject={session.clearDailyEntryProject}
      onSetEntryModePreference={session.updateEntryModePreference}
      onTriggerInstall={triggerInstall}
      onReloadProject={bridge.reload}
      onRunAction={bridge.runAction}
      onStartRun={async () => {
        await bridge.startRun();
      }}
      onApplyTransition={bridge.applyTransition}
      onSaveProviderRouting={bridge.saveProviderRouting}
    />
  );
}
