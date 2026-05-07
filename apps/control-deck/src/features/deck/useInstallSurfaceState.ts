import { useEffect, useState } from "react";
import {
  buildInstallSurfaceState,
  detectInstallBrowserFamily,
  readStandaloneDisplayMode,
  type BeforeInstallPromptEvent,
  type InstallPromptFeedback
} from "./installSurface";

export function useInstallSurfaceState() {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installPromptFeedback, setInstallPromptFeedback] =
    useState<InstallPromptFeedback>(null);
  const [isStandaloneDisplay, setIsStandaloneDisplay] = useState(
    readStandaloneDisplayMode
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(display-mode: standalone)")
        : null;
    const updateStandaloneDisplay = () => {
      setIsStandaloneDisplay(readStandaloneDisplayMode());
    };
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPromptEvent(event);
      setInstallPromptFeedback(null);
    };
    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallPromptFeedback("accepted");
      updateStandaloneDisplay();
    };

    updateStandaloneDisplay();
    mediaQuery?.addEventListener?.("change", updateStandaloneDisplay);
    mediaQuery?.addListener?.(updateStandaloneDisplay);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery?.removeEventListener?.("change", updateStandaloneDisplay);
      mediaQuery?.removeListener?.(updateStandaloneDisplay);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function triggerInstall() {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice.catch(() => null);

    setInstallPromptEvent(null);
    setInstallPromptFeedback(choice?.outcome ?? "dismissed");
  }

  return {
    installSurface: buildInstallSurfaceState({
      isStandalone: isStandaloneDisplay,
      hasInstallPrompt: Boolean(installPromptEvent),
      browserFamily:
        typeof navigator === "undefined"
          ? "unknown"
          : detectInstallBrowserFamily(navigator.userAgent),
      promptFeedback: installPromptFeedback
    }),
    triggerInstall
  };
}
